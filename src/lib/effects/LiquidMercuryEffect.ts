import { Container, Sprite, Texture, Ticker } from 'pixi.js'
import { createNoise2D } from 'simplex-noise'

export interface ILiquidMercuryEffectOptions {
  viscosity?: number      // 0-1, blur/smooth (default: 0.3)
  reflectivity?: number   // 0-1, MatCap strength (default: 0.6)
  rippleSpeed?: number   // scroll speed (default: 2)
  edgeRoundness?: number // smooth-step power for blobby edges (default: 2)
  duration?: number
}

function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

export default class LiquidMercuryEffect extends Container {
  private sourceSprite: Sprite
  private outputSprite: Sprite | null = null
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private sourceData: ImageData | null = null
  private smoothedAlpha: Float32Array | null = null
  private outputData: ImageData | null = null
  private canvasWidth: number = 0
  private canvasHeight: number = 0
  private options: Required<ILiquidMercuryEffectOptions>
  private currentTime: number = 0
  private mercuryResolve?: () => void
  private isProcessing: boolean = false
  private outputTexture: Texture | null = null
  private noise2D: (x: number, y: number) => number

  constructor(
    sourceSprite: Sprite,
    options: ILiquidMercuryEffectOptions = {},
  ) {
    super()
    this.sourceSprite = sourceSprite
    this.noise2D = createNoise2D()
    this.options = {
      viscosity: Math.max(0, Math.min(1, options.viscosity ?? 0.3)),
      reflectivity: Math.max(0, Math.min(1, options.reflectivity ?? 0.6)),
      rippleSpeed: options.rippleSpeed ?? 2,
      edgeRoundness: Math.max(1, options.edgeRoundness ?? 2),
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
    this.smoothedAlpha = new Float32Array(width * height)
    this.outputData = this.ctx.createImageData(width, height)
    return true
  }

  private buildSmoothedAlpha(): void {
    if (!this.sourceData || !this.smoothedAlpha) return
    const w = this.canvasWidth
    const h = this.canvasHeight
    const src = this.sourceData.data
    const { edgeRoundness, viscosity } = this.options
    const r = Math.max(1, Math.floor(2 + viscosity * 4))

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0
        let count = 0
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const nx = Math.max(0, Math.min(w - 1, x + dx))
            const ny = Math.max(0, Math.min(h - 1, y + dy))
            const a = src[(ny * w + nx) * 4 + 3] / 255
            sum += a
            count++
          }
        }
        const raw = sum / count
        const t = smoothStep(0.2, 0.6, raw)
        const rounded = Math.pow(t, 1 / edgeRoundness)
        this.smoothedAlpha[y * w + x] = rounded
      }
    }
  }

  private sampleReflection(nx: number, ny: number): { r: number; g: number; b: number } {
    const u = nx * 0.5 + 0.5
    const v = ny * 0.5 + 0.5
    const r = Math.floor(Math.min(255, u * 200 + 28))
    const g = Math.floor(Math.min(255, v * 200 + 28))
    const b = Math.floor(Math.min(255, (u + v) * 0.5 * 200 + 55))
    return { r, g, b }
  }

  private updateFrame(): void {
    if (!this.ctx || !this.sourceData || !this.outputData || !this.smoothedAlpha) return

    const w = this.canvasWidth
    const h = this.canvasHeight
    const src = this.sourceData.data
    const out = this.outputData.data
    const t = this.currentTime
    const { reflectivity, rippleSpeed } = this.options

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * 4
        const rippleX = this.noise2D(x * 0.05 + t * rippleSpeed, y * 0.05) * 2
        const rippleY = this.noise2D(x * 0.05, y * 0.05 + t * rippleSpeed) * 2
        const sx = Math.max(0, Math.min(w - 1, Math.floor(x + rippleX)))
        const sy = Math.max(0, Math.min(h - 1, Math.floor(y + rippleY)))
        const si = (sy * w + sx) * 4

        const aL = this.smoothedAlpha[y * w + (x - 1)]
        const aR = this.smoothedAlpha[y * w + (x + 1)]
        const aT = this.smoothedAlpha[(y - 1) * w + x]
        const aB = this.smoothedAlpha[(y + 1) * w + x]
        const nx = (aL - aR) * 2
        const ny = (aT - aB) * 2
        const len = Math.sqrt(nx * nx + ny * ny) || 1
        const nxn = nx / len
        const nyn = ny / len

        const refl = this.sampleReflection(nxn, nyn)
        const baseR = src[si]
        const baseG = src[si + 1]
        const baseB = src[si + 2]
        const baseA = src[si + 3] / 255

        out[i] = Math.min(255, baseR * (1 - reflectivity) + refl.r * reflectivity * baseA)
        out[i + 1] = Math.min(255, baseG * (1 - reflectivity) + refl.g * reflectivity * baseA)
        out[i + 2] = Math.min(255, baseB * (1 - reflectivity) + refl.b * reflectivity * baseA)
        out[i + 3] = src[si + 3]
      }
    }

    for (let y = 0; y < h; y++) {
      const oi = (y * w) * 4
      const oiR = (y * w + (w - 1)) * 4
      out[oi] = src[oi]
      out[oi + 1] = src[oi + 1]
      out[oi + 2] = src[oi + 2]
      out[oi + 3] = src[oi + 3]
      out[oiR] = src[oiR]
      out[oiR + 1] = src[oiR + 1]
      out[oiR + 2] = src[oiR + 2]
      out[oiR + 3] = src[oiR + 3]
    }
    for (let x = 0; x < w; x++) {
      const oi = x * 4
      const oiB = ((h - 1) * w + x) * 4
      out[oi] = src[oi]
      out[oi + 1] = src[oi + 1]
      out[oi + 2] = src[oi + 2]
      out[oi + 3] = src[oi + 3]
      out[oiB] = src[oiB]
      out[oiB + 1] = src[oiB + 1]
      out[oiB + 2] = src[oiB + 2]
      out[oiB + 3] = src[oiB + 3]
    }

    this.ctx.putImageData(this.outputData, 0, 0)
    if (this.outputTexture?.baseTexture) this.outputTexture.baseTexture.update()
  }

  private prepare(): void {
    if (!this.captureSourceToCanvas() || !this.ctx) return

    this.buildSmoothedAlpha()

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
      this.mercuryResolve = resolve
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
      this.mercuryResolve?.()
    }
  }

  public destroy(options?: any): void {
    Ticker.shared.remove(this.update, this)
    this.sourceData = null
    this.smoothedAlpha = null
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

  public static async liquidMercury(sprite: Sprite, options: ILiquidMercuryEffectOptions = {}): Promise<void> {
    if (!sprite.parent) return
    const effect = new LiquidMercuryEffect(sprite, options)
    const index = sprite.parent.getChildIndex(sprite)
    sprite.parent.addChildAt(effect, index)
    await effect.play()
    effect.destroy({ children: true })
  }
}
