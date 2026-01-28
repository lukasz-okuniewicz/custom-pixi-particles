import { Container, Rectangle, Sprite, Texture, Ticker } from 'pixi.js'
import ParticlePool from '../ParticlePool'
import Particle from '../Particle'
import Random from '../util/Random'

export type AssemblyMode = 'random-scatter' | 'from-center' | 'off-screen' | 'vortex'

export interface IMagneticAssemblyOptions {
  gridCols?: number
  gridRows?: number
  duration?: number // Total time to assemble (seconds)
  easing?: string // 'back.out' | 'power1.inOut' | 'bounce.out' | 'linear'
  scatterRange?: number // How far away they start
  stagger?: number // Delay between fragments (0 to 1)
  mode?: AssemblyMode
  startAlpha?: number
}

interface AssemblyFragment {
  sprite: Sprite
  particle: Particle
  startX: number
  startY: number
  destX: number
  destY: number
  delay: number // Staggered start time
}

export default class MagneticAssemblyEffect extends Container {
  private fragments: AssemblyFragment[] = []
  private isProcessing: boolean = false
  private options: Required<IMagneticAssemblyOptions>
  private currentTime: number = 0
  private assemblyResolve?: () => void

  constructor(
    private sourceSprite: Sprite,
    options: IMagneticAssemblyOptions = {},
  ) {
    super()
    const cols = options.gridCols ?? 10
    const rows = options.gridRows ?? 10

    this.options = {
      gridCols: cols,
      gridRows: rows,
      duration: options.duration ?? 2.0,
      easing: options.easing ?? 'back.out',
      scatterRange: options.scatterRange ?? 500,
      stagger: options.stagger ?? 0.5,
      mode: options.mode ?? 'random-scatter',
      startAlpha: options.startAlpha ?? 0,
    }

    // Match source sprite transform
    this.x = sourceSprite.x
    this.y = sourceSprite.y
    this.rotation = sourceSprite.rotation
  }

  private prepare(): void {
    const texture = this.sourceSprite.texture
    if (!texture || !texture.source) return

    const { gridCols, gridRows, scatterRange, mode, stagger } = this.options
    const texFrame = texture.frame
    const stepW = texFrame.width / gridCols
    const stepH = texFrame.height / gridRows
    const scale = this.sourceSprite.scale.x
    const anchorX = this.sourceSprite.anchor.x
    const anchorY = this.sourceSprite.anchor.y

    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const x1 = Math.floor(col * stepW)
        const y1 = Math.floor(row * stepH)

        // Create sub-texture
        const fragRect = new Rectangle(texFrame.x + x1, texFrame.y + y1, stepW, stepH)
        const fragTex = new Texture({ source: texture.source, frame: fragRect })
        const sprite = new Sprite(fragTex)
        sprite.anchor.set(0.5)
        sprite.scale.set(scale)
        sprite.alpha = this.options.startAlpha

        // Destination: The original spot in the sprite
        const dx = (x1 - texFrame.width * anchorX + stepW / 2) * scale
        const dy = (y1 - texFrame.height * anchorY + stepH / 2) * scale

        // Starting point logic
        // tslint:disable-next-line:one-variable-per-declaration
        let sx = 0,
          sy = 0
        switch (mode) {
          case 'from-center':
            sx = 0
            sy = 0
            break
          case 'off-screen':
            sx = Math.random() > 0.5 ? scatterRange : -scatterRange
            sy = Random.uniform(-scatterRange, scatterRange)
            break
          case 'vortex':
            const angle = Math.random() * Math.PI * 2
            sx = Math.cos(angle) * scatterRange
            sy = Math.sin(angle) * scatterRange
            break
          case 'random-scatter':
          default:
            sx = dx + Random.uniform(-scatterRange, scatterRange)
            sy = dy + Random.uniform(-scatterRange, scatterRange)
            break
        }

        const p = ParticlePool.global.pop()
        p.reset()

        // Stagger logic: pieces start at different times based on position or random
        const delay = ((row * gridCols + col) / (gridCols * gridRows)) * stagger

        this.fragments.push({
          sprite,
          particle: p,
          startX: sx,
          startY: sy,
          destX: dx,
          destY: dy,
          delay,
        })

        this.addChild(sprite)
      }
    }
    this.sourceSprite.visible = false
  }

  public async assemble(): Promise<void> {
    this.prepare()
    this.isProcessing = true
    return new Promise((resolve) => {
      this.assemblyResolve = resolve
      Ticker.shared.add(this.update, this)
    })
  }

  private update(): void {
    if (!this.isProcessing) return
    const dt = Ticker.shared.deltaMS / 1000
    this.currentTime += dt

    let finished = 0

    for (let i = 0; i < this.fragments.length; i++) {
      const f = this.fragments[i]

      // Calculate individual progress based on delay
      let p = (this.currentTime - f.delay) / (this.options.duration - f.delay)
      p = Math.max(0, Math.min(1, p))

      if (p > 0) {
        const easedP = this.applyEasing(p, this.options.easing)

        f.sprite.x = f.startX + (f.destX - f.startX) * easedP
        f.sprite.y = f.startY + (f.destY - f.startY) * easedP
        f.sprite.alpha = Math.max(this.options.startAlpha, p)

        // Slight rotation adjustment to make it look "magnetic"
        if (this.options.easing.includes('back')) {
          f.sprite.rotation = (1 - easedP) * 0.5
        }
      } else {
        f.sprite.x = f.startX
        f.sprite.y = f.startY
      }

      if (p >= 1) finished++
    }

    if (finished === this.fragments.length) {
      this.finish()
    }
  }

  private applyEasing(t: number, type: string): number {
    switch (type) {
      case 'power1.inOut':
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      case 'bounce.out':
        // tslint:disable-next-line:one-variable-per-declaration
        const n1 = 7.5625,
          d1 = 2.75
        if (t < 1 / d1) return n1 * t * t
        else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75
        else if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375
        else return n1 * (t -= 2.625 / d1) * t + 0.984375
      case 'back.out':
        // tslint:disable-next-line:one-variable-per-declaration
        const c1 = 1.70158,
          c3 = c1 + 1
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
      default:
        return t // linear
    }
  }

  private finish(): void {
    this.isProcessing = false
    Ticker.shared.remove(this.update, this)
    this.sourceSprite.visible = true // Restore original
    this.assemblyResolve?.()
  }

  public static async assemble(sprite: Sprite, options: IMagneticAssemblyOptions = {}): Promise<void> {
    if (!sprite.parent) return
    const effect = new MagneticAssemblyEffect(sprite, options)
    const index = sprite.parent.getChildIndex(sprite)
    sprite.parent.addChildAt(effect, index)
    await effect.assemble()
    effect.destroy({ children: true })
  }
}
