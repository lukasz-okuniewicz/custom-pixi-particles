import { Container, Sprite, Texture, Ticker } from 'pixi.js'
import ParticlePool from '../ParticlePool'
import Particle from '../Particle'

export type DissolveDirection = 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top' | 'center-out'

export interface IDissolveEffectOptions {
  pixelSize?: number
  edgeSoftness?: number
  driftStrength?: number
  noiseIntensity?: number
  lifetime?: number
  fadeOutDuration?: number
  direction?: DissolveDirection
  windAngle?: number
}

interface DustFragment {
  sprite: Sprite
  particle: Particle
  activationThreshold: number
  isActive: boolean
  initialX: number
  initialY: number
}

export default class DissolveEffect extends Container {
  private fragments: DustFragment[] = []
  private isProcessing: boolean = false
  private options: Required<IDissolveEffectOptions>
  private progress: number = 0
  private dissolveResolve?: () => void

  constructor(
    private sourceSprite: Sprite,
    options: IDissolveEffectOptions = {},
  ) {
    super()

    const pixelSize = options.pixelSize ?? 2

    this.options = {
      pixelSize,
      edgeSoftness: options.edgeSoftness ?? 0.2,
      driftStrength: options.driftStrength ?? 200,
      noiseIntensity: options.noiseIntensity ?? 50,
      lifetime: options.lifetime ?? 1.5,
      fadeOutDuration: options.fadeOutDuration ?? 0.5,
      direction: options.direction ?? 'left-to-right',
      windAngle: (options.windAngle ?? -45) * (Math.PI / 180),
    }

    // Copy transforms from source
    this.x = sourceSprite.x
    this.y = sourceSprite.y
    this.rotation = sourceSprite.rotation
    this.scale.copyFrom(sourceSprite.scale)
    this.pivot.copyFrom(sourceSprite.pivot)
  }

  private prepare(): void {
    const texture = this.sourceSprite.texture

    if (!texture || !texture.source) {
      console.warn('DissolveEffect: Texture source not found.')
      return
    }

    // In Pixi v8, 'resource' is the most reliable path to the raw image data.
    // It can be an HTMLImageElement, HTMLCanvasElement, or ImageBitmap.
    const sourceElement = (texture.source as any).resource

    if (!sourceElement) {
      console.warn('DissolveEffect: Could not find valid resource on texture.source.')
      return
    }

    const { width, height } = texture.frame
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d', { willReadFrequently: true })!

    // Draw the specific frame (important for Spritesheets/Atlases)
    try {
      ctx.drawImage(
        sourceElement,
        texture.frame.x,
        texture.frame.y,
        texture.frame.width,
        texture.frame.height,
        0,
        0,
        width,
        height,
      )
    } catch (e) {
      console.error('DissolveEffect: Failed to draw texture to canvas. This is likely a CORS issue.', e)
      return
    }

    const imgData = ctx.getImageData(0, 0, width, height).data
    const { pixelSize, edgeSoftness, direction } = this.options

    const anchorX = this.sourceSprite.anchor.x
    const anchorY = this.sourceSprite.anchor.y

    for (let py = 0; py < height; py += pixelSize) {
      for (let px = 0; px < width; px += pixelSize) {
        const i = (Math.floor(py) * width + Math.floor(px)) * 4

        if (imgData[i + 3] < 10) continue

        let spatialFactor = 0
        switch (direction) {
          case 'left-to-right':
            spatialFactor = px / width
            break
          case 'right-to-left':
            spatialFactor = 1 - px / width
            break
          case 'top-to-bottom':
            spatialFactor = py / height
            break
          case 'bottom-to-top':
            spatialFactor = 1 - py / height
            break
          case 'center-out':
            const dx = px - width / 2
            const dy = py - height / 2
            spatialFactor = Math.sqrt(dx * dx + dy * dy) / (width / 2)
            break
        }

        const activationThreshold = spatialFactor * (1 - edgeSoftness) + Math.random() * edgeSoftness

        const sprite = new Sprite(Texture.WHITE)
        sprite.width = sprite.height = pixelSize
        // tslint:disable-next-line:no-bitwise
        sprite.tint = (imgData[i] << 16) | (imgData[i + 1] << 8) | imgData[i + 2]

        const lx = px - width * anchorX
        const ly = py - height * anchorY

        const p = ParticlePool.global.pop()
        p.reset()
        p.x = lx
        p.y = ly
        p.maxLifeTime = this.options.lifetime

        this.fragments.push({
          sprite,
          particle: p,
          activationThreshold,
          isActive: false,
          initialX: lx,
          initialY: ly,
        })

        this.addChild(sprite)
        sprite.x = lx
        sprite.y = ly
      }
    }

    this.sourceSprite.visible = false
  }

  public async start(): Promise<void> {
    this.prepare()
    if (this.fragments.length === 0) {
      this.finish()
      return
    }

    this.isProcessing = true
    return new Promise((resolve) => {
      this.dissolveResolve = resolve
      Ticker.shared.add(this.update, this)
    })
  }

  private update(): void {
    if (!this.isProcessing) return

    const dt = Ticker.shared.deltaMS / 1000
    this.progress += dt * 0.7

    const { windAngle, driftStrength, noiseIntensity, fadeOutDuration } = this.options
    const windX = Math.cos(windAngle) * driftStrength
    const windY = Math.sin(windAngle) * driftStrength

    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const f = this.fragments[i]
      const p = f.particle

      if (!f.isActive && this.progress >= f.activationThreshold) {
        f.isActive = true
      }

      if (f.isActive) {
        p.lifeTime += dt

        const nx = (Math.random() - 0.5) * noiseIntensity
        const ny = (Math.random() - 0.5) * noiseIntensity

        p.x += (windX + nx) * dt
        p.y += (windY + ny) * dt

        f.sprite.x = p.x
        f.sprite.y = p.y

        const lifeProg = p.lifeTime / p.maxLifeTime
        const fadeThreshold = 1 - fadeOutDuration / p.maxLifeTime

        if (lifeProg > fadeThreshold) {
          f.sprite.alpha = Math.max(0, 1 - (lifeProg - fadeThreshold) / (1 - fadeThreshold))
        }

        if (p.lifeTime >= p.maxLifeTime || f.sprite.alpha <= 0) {
          this.removeFragment(i)
        }
      }
    }

    if (this.fragments.length === 0) {
      this.finish()
    }
  }

  private removeFragment(index: number): void {
    const f = this.fragments[index]
    if (f.particle) ParticlePool.global.push(f.particle)
    if (f.sprite) {
      this.removeChild(f.sprite)
      f.sprite.destroy()
    }
    this.fragments.splice(index, 1)
  }

  private finish(): void {
    this.isProcessing = false
    Ticker.shared.remove(this.update, this)
    this.dissolveResolve?.()
  }

  public override destroy(options?: any): void {
    Ticker.shared.remove(this.update, this)
    this.fragments.forEach((f) => {
      if (f.particle) ParticlePool.global.push(f.particle)
    })
    this.fragments = []
    super.destroy(options)
  }

  public static async dissolve(sprite: Sprite, options: IDissolveEffectOptions = {}): Promise<void> {
    if (!sprite.parent) return

    const effect = new DissolveEffect(sprite, options)
    const index = sprite.parent.getChildIndex(sprite)
    sprite.parent.addChildAt(effect, index)

    await effect.start()
    effect.destroy({ children: true })
  }
}
