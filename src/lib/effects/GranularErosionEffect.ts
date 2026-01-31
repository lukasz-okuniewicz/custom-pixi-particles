import { Container, Sprite, Texture, Ticker } from 'pixi.js-legacy'
import { createNoise2D } from 'simplex-noise'

export interface IGranularErosionEffectOptions {
  erosionProgress?: number  // 0-1, how much has "broken loose" (default: 0.5)
  gravityScale?: number    // vertical fall speed (default: 80)
  windTurbulence?: number  // horizontal sine amplitude (default: 15)
  grainSize?: number       // noise frequency scale, higher = finer grains (default: 0.08)
  duration?: number
}

export default class GranularErosionEffect extends Container {
  private sourceSprite: Sprite
  private outputSprite: Sprite | null = null
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private sourceData: ImageData | null = null
  private outputData: ImageData | null = null
  private canvasWidth: number = 0
  private canvasHeight: number = 0
  private options: Required<IGranularErosionEffectOptions>
  private currentTime: number = 0
  private erosionResolve?: () => void
  private isProcessing: boolean = false
  private outputTexture: Texture | null = null
  private noise2D: (x: number, y: number) => number

  constructor(
    sourceSprite: Sprite,
    options: IGranularErosionEffectOptions = {},
  ) {
    super()
    this.sourceSprite = sourceSprite
    this.noise2D = createNoise2D()
    this.options = {
      erosionProgress: Math.max(0, Math.min(1, options.erosionProgress ?? 0.5)),
      gravityScale: options.gravityScale ?? 80,
      windTurbulence: options.windTurbulence ?? 15,
      grainSize: options.grainSize ?? 0.08,
      duration: options.duration ?? 2,
    }

    this.x = sourceSprite.x
    this.y = sourceSprite.y
    this.rotation = sourceSprite.rotation
  }

  private captureSourceToCanvas(): boolean {
    const texture = this.sourceSprite.texture
    if (!texture || !texture.valid) return false

    const { width, height } = texture.frame
    this.canvasWidth = width
    this.canvasHeight = height

    if (!this.canvas) {
      this.canvas = document.createElement('canvas')
      this.ctx = this.canvas.getContext('2d')
    }
    if (!this.canvas || !this.ctx) return false

    this.canvas.width = width
    this.canvas.height = height

    const baseTex = texture.baseTexture.resource as any
    if (baseTex && (baseTex.source || baseTex.data)) {
      this.ctx.drawImage(
        baseTex.source || baseTex.data,
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
    this.sourceData = this.ctx.getImageData(0, 0, width, height)
    this.outputData = this.ctx.createImageData(width, height)
    return true
  }

  private sampleClamped(data: Uint8ClampedArray, w: number, h: number, sx: number, sy: number): number {
    const ix = Math.max(0, Math.min(w - 1, Math.floor(sx)))
    const iy = Math.max(0, Math.min(h - 1, Math.floor(sy)))
    return (iy * w + ix) * 4
  }

  private updateFrame(): void {
    if (!this.ctx || !this.sourceData || !this.outputData) return

    const w = this.canvasWidth
    const h = this.canvasHeight
    const src = this.sourceData.data
    const out = this.outputData.data
    const t = this.currentTime
    const { erosionProgress, gravityScale, windTurbulence, grainSize } = this.options
    const progress = erosionProgress * Math.min(1, t / this.options.duration)
    const fall = gravityScale * t

    for (let y = 0; y < h; y++) {
      const wind = Math.sin(y * 0.02 + t * 3) * windTurbulence
      for (let x = 0; x < w; x++) {
        const n = (this.noise2D(x * grainSize, y * grainSize) + 1) * 0.5
        const loose = n < progress
        const sx = loose ? x - wind : x
        const sy = loose ? y - fall : y
        const si = this.sampleClamped(src, w, h, sx, sy)
        const oi = (y * w + x) * 4
        out[oi] = src[si]
        out[oi + 1] = src[si + 1]
        out[oi + 2] = src[si + 2]
        const alpha = loose ? src[si + 3] * Math.max(0, 1 - t / this.options.duration) : src[si + 3]
        out[oi + 3] = Math.round(alpha)
      }
    }

    this.ctx.putImageData(this.outputData, 0, 0)
    if (this.outputTexture?.baseTexture) this.outputTexture.baseTexture.update()
  }

  private prepare(): void {
    if (!this.captureSourceToCanvas() || !this.ctx) return

    const scale = this.sourceSprite.scale.x
    this.outputTexture = Texture.from(this.canvas as HTMLCanvasElement)
    this.outputSprite = new Sprite(this.outputTexture)
    this.outputSprite.anchor.set(this.sourceSprite.anchor.x, this.sourceSprite.anchor.y)
    this.outputSprite.scale.set(scale)
    this.addChild(this.outputSprite)
    this.sourceSprite.visible = false
  }

  public async play(): Promise<void> {
    this.prepare()
    this.isProcessing = true
    this.currentTime = 0
    return new Promise((resolve) => {
      this.erosionResolve = resolve
      Ticker.shared.add(this.update, this)
    })
  }

  private update(): void {
    if (!this.isProcessing || !this.ctx) return

    const dt = Ticker.shared.deltaMS / 1000
    this.currentTime += dt

    this.updateFrame()

    if (this.currentTime >= this.options.duration) {
      this.isProcessing = false
      Ticker.shared.remove(this.update, this)
      this.sourceSprite.visible = true
      this.erosionResolve?.()
    }
  }

  public destroy(options?: any): void {
    Ticker.shared.remove(this.update, this)
    this.sourceData = null
    this.outputData = null
    this.canvas = null
    this.ctx = null
    this.outputTexture = null
    if (this.outputSprite) {
      this.removeChild(this.outputSprite)
      this.outputSprite.destroy()
      this.outputSprite = null
    }
    super.destroy(options)
  }

  public static async erode(sprite: Sprite, options: IGranularErosionEffectOptions = {}): Promise<void> {
    if (!sprite.parent) return
    const effect = new GranularErosionEffect(sprite, options)
    const index = sprite.parent.getChildIndex(sprite)
    sprite.parent.addChildAt(effect, index)
    await effect.play()
    effect.destroy({ children: true })
  }
}
