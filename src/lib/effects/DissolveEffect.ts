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
    // Determine bounds to set container size
    const bounds = sourceSprite.getLocalBounds()
    const pixelSize = options.pixelSize ?? 2

    this.options = {
      pixelSize,
      edgeSoftness: options.edgeSoftness ?? 0.2,
      driftStrength: options.driftStrength ?? 200,
      noiseIntensity: options.noiseIntensity ?? 50,
      lifetime: options.lifetime ?? 1.5,
      fadeOutDuration: options.fadeOutDuration ?? 0.5,
      direction: options.direction ?? 'left-to-right',
      windAngle: (options.windAngle ?? -45) * (Math.PI / 180), // Support degrees from UI
    }

    this.x = sourceSprite.x
    this.y = sourceSprite.y
    this.rotation = sourceSprite.rotation
  }

  private prepare(): void {
    const texture = this.sourceSprite.texture
    if (!texture || !texture.source) return

    const canvas = document.createElement('canvas')
    const { width, height } = texture.frame
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')!
    const source = texture.source
    const resource = (source as any).resource

    if (resource && (resource.source || resource.data)) {
      // tslint:disable-next-line:max-line-length
      ctx.drawImage(
        resource.source || resource.data,
        texture.frame.x,
        texture.frame.y,
        width,
        height,
        0,
        0,
        width,
        height,
      )
    }

    const imgData = ctx.getImageData(0, 0, width, height).data
    const { pixelSize, edgeSoftness, direction } = this.options
    const anchorX = this.sourceSprite.anchor.x
    const anchorY = this.sourceSprite.anchor.y
    const scale = this.sourceSprite.scale.x

    for (let py = 0; py < height; py += pixelSize) {
      for (let px = 0; px < width; px += pixelSize) {
        const i = (py * width + px) * 4
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
        sprite.width = sprite.height = pixelSize * scale
        // tslint:disable-next-line:no-bitwise
        sprite.tint = (imgData[i] << 16) | (imgData[i + 1] << 8) | imgData[i + 2]

        const lx = (px - width * anchorX) * scale
        const ly = (py - height * anchorY) * scale

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
      }
    }
    this.sourceSprite.visible = false
  }

  public async start(): Promise<void> {
    this.prepare()
    this.isProcessing = true
    return new Promise((resolve) => {
      this.dissolveResolve = resolve
      Ticker.shared.add(this.update, this)
    })
  }

  private update(): void {
    if (!this.isProcessing) return

    const dt = Ticker.shared.deltaMS / 1000
    // progress moves from 0 to 1.2 to ensure all thresholds are met
    this.progress += dt * 0.6

    // Iterate backwards so we can safely splice the array
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const f = this.fragments[i]
      const p = f.particle

      if (!f.isActive && this.progress >= f.activationThreshold) {
        f.isActive = true
      }

      if (f.isActive) {
        p.lifeTime += dt

        // Movement
        const windX = Math.cos(this.options.windAngle) * this.options.driftStrength
        const windY = Math.sin(this.options.windAngle) * this.options.driftStrength
        const noiseX = (Math.random() - 0.5) * this.options.noiseIntensity
        const noiseY = (Math.random() - 0.5) * this.options.noiseIntensity

        p.x += (windX + noiseX) * dt
        p.y += (windY + noiseY) * dt
        f.sprite.x = p.x
        f.sprite.y = p.y

        // Alpha Fade
        const lifeProg = p.lifeTime / p.maxLifeTime
        const fadeThreshold = 1 - this.options.fadeOutDuration / p.maxLifeTime
        if (lifeProg > fadeThreshold) {
          f.sprite.alpha = Math.max(0, 1 - (lifeProg - fadeThreshold) / (1 - fadeThreshold))
        }

        // REMOVAL LOGIC: Check if lifetime ended
        if (p.lifeTime >= p.maxLifeTime || f.sprite.alpha <= 0) {
          this.removeFragment(i)
        }
      } else {
        f.sprite.x = f.initialX
        f.sprite.y = f.initialY
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

  public destroy(options?: any): void {
    Ticker.shared.remove(this.update, this)
    this.fragments.forEach((f, i) => {
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
