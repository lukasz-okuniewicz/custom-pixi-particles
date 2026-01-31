import { Container, Sprite, Texture, Ticker } from 'pixi.js'

export interface IPrismRefractionEffectOptions {
  dispersionStrength?: number // pixels of R/B offset (default: 8)
  dispersionAngle?: number   // radians, 0 = horizontal (default: 0)
  duration?: number
  scanSpeed?: number        // optional scan line speed (0 = no scan)
  fresnelPower?: number     // 0 = no fresnel, higher = edge-only (default: 0)
}

export default class PrismRefractionEffect extends Container {
  private sourceSprite: Sprite
  private outputSprite: Sprite | null = null
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private sourceData: ImageData | null = null
  private outputData: ImageData | null = null
  private canvasWidth: number = 0
  private canvasHeight: number = 0
  private options: Required<IPrismRefractionEffectOptions>
  private currentTime: number = 0
  private prismResolve?: () => void
  private isProcessing: boolean = false
  private outputTexture: Texture | null = null

  constructor(
    sourceSprite: Sprite,
    options: IPrismRefractionEffectOptions = {},
  ) {
    super()
    this.sourceSprite = sourceSprite
    this.options = {
      dispersionStrength: options.dispersionStrength ?? 8,
      dispersionAngle: options.dispersionAngle ?? 0,
      duration: options.duration ?? 1.5,
      scanSpeed: options.scanSpeed ?? 0,
      fresnelPower: options.fresnelPower ?? 0,
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

  private sampleClamped(data: Uint8ClampedArray, w: number, h: number, x: number, y: number, c: number): number {
    const ix = Math.max(0, Math.min(w - 1, Math.floor(x)))
    const iy = Math.max(0, Math.min(h - 1, Math.floor(y)))
    return data[(iy * w + ix) * 4 + c]
  }

  private updateFrame(): void {
    if (!this.ctx || !this.sourceData || !this.outputData) return

    const { dispersionStrength, dispersionAngle, fresnelPower, scanSpeed } = this.options
    const w = this.canvasWidth
    const h = this.canvasHeight
    const src = this.sourceData.data
    const out = this.outputData.data

    const t = this.currentTime
    const strength = dispersionStrength * (t < 0.5 ? t * 2 : 2 - t * 2)
    const dx = Math.cos(dispersionAngle) * strength
    const dy = Math.sin(dispersionAngle) * strength

    const scanY = scanSpeed !== 0 ? (t * h * 0.5) % (h + 1) : -1

    for (let y = 0; y < h; y++) {
      let fresnel = 1
      if (fresnelPower > 0) {
        const ny = (y / h - 0.5) * 2
        const nx = 0
        const dist = Math.sqrt(nx * nx + ny * ny)
        fresnel = Math.pow(Math.min(1, dist), fresnelPower)
      }
      if (scanSpeed !== 0) {
        const d = Math.abs(y - scanY)
        fresnel *= d < h * 0.15 ? 0.3 + (d / (h * 0.15)) * 0.7 : 1
      }

      const str = strength * fresnel
      const ddx = (Math.cos(dispersionAngle) * str) | 0
      const ddy = (Math.sin(dispersionAngle) * str) | 0

      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4
        out[i] = this.sampleClamped(src, w, h, x - ddx, y - ddy, 0)
        out[i + 1] = this.sampleClamped(src, w, h, x, y, 1)
        out[i + 2] = this.sampleClamped(src, w, h, x + ddx, y + ddy, 2)
        out[i + 3] = src[i + 3]
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
      this.prismResolve = resolve
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
      this.prismResolve?.()
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

  public static async prismRefract(sprite: Sprite, options: IPrismRefractionEffectOptions = {}): Promise<void> {
    if (!sprite.parent) return
    const effect = new PrismRefractionEffect(sprite, options)
    const index = sprite.parent.getChildIndex(sprite)
    sprite.parent.addChildAt(effect, index)
    await effect.play()
    effect.destroy({ children: true })
  }
}
