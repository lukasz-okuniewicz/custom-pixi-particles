import { Container, Sprite, Texture, Ticker } from 'pixi.js'

export type SlitScanMode = 'wave' | 'slit-scan'

export interface ISlitScanEffectOptions {
  mode?: SlitScanMode
  speed?: number       // wave: phase speed; slit-scan: row offset speed (default: 2)
  amplitude?: number   // wave: pixel displacement (default: 20)
  frequency?: number   // wave: rows per wave cycle (default: 0.02)
  direction?: 'horizontal' | 'vertical'
  duration?: number
}

export default class SlitScanEffect extends Container {
  private sourceSprite: Sprite
  private outputSprite: Sprite | null = null
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private sourceData: ImageData | null = null
  private outputData: ImageData | null = null
  private canvasWidth: number = 0
  private canvasHeight: number = 0
  private options: Required<ISlitScanEffectOptions>
  private currentTime: number = 0
  private slitScanResolve?: () => void
  private isProcessing: boolean = false
  private outputTexture: Texture | null = null

  constructor(
    sourceSprite: Sprite,
    options: ISlitScanEffectOptions = {},
  ) {
    super()
    this.sourceSprite = sourceSprite
    this.options = {
      mode: options.mode ?? 'wave',
      speed: options.speed ?? 2,
      amplitude: options.amplitude ?? 20,
      frequency: options.frequency ?? 0.02,
      direction: options.direction ?? 'horizontal',
      duration: options.duration ?? 2,
    }

    this.x = sourceSprite.x
    this.y = sourceSprite.y
    this.rotation = sourceSprite.rotation
  }

  private captureSourceToCanvas(): boolean {
    const texture = this.sourceSprite.texture
    if (!texture || texture.destroyed || !texture.source) return false

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

    const sourceElement = (texture.source as any).resource
    if (!sourceElement) return false
    this.ctx.drawImage(
      sourceElement,
      texture.frame.x,
      texture.frame.y,
      width,
      height,
      0,
      0,
      width,
      height,
    )
    this.sourceData = this.ctx.getImageData(0, 0, width, height)
    this.outputData = this.ctx.createImageData(width, height)
    return true
  }

  private sampleClamped(data: Uint8ClampedArray, w: number, h: number, x: number, y: number): number {
    const ix = Math.max(0, Math.min(w - 1, Math.floor(x)))
    const iy = Math.max(0, Math.min(h - 1, Math.floor(y)))
    return (iy * w + ix) * 4
  }

  private updateFrame(): void {
    if (!this.ctx || !this.sourceData || !this.outputData) return

    const w = this.canvasWidth
    const h = this.canvasHeight
    const src = this.sourceData.data
    const out = this.outputData.data
    const t = this.currentTime
    const { mode, speed, amplitude, frequency, direction } = this.options

    if (mode === 'wave') {
      if (direction === 'horizontal') {
        for (let y = 0; y < h; y++) {
          const offset = Math.sin(y * frequency + t * speed) * amplitude
          for (let x = 0; x < w; x++) {
            const srcX = x - offset
            const si = this.sampleClamped(src, w, h, srcX, y)
            const oi = (y * w + x) * 4
            out[oi] = src[si]
            out[oi + 1] = src[si + 1]
            out[oi + 2] = src[si + 2]
            out[oi + 3] = src[si + 3]
          }
        }
      } else {
        for (let x = 0; x < w; x++) {
          const offset = Math.sin(x * frequency + t * speed) * amplitude
          for (let y = 0; y < h; y++) {
            const srcY = y - offset
            const si = this.sampleClamped(src, w, h, x, srcY)
            const oi = (y * w + x) * 4
            out[oi] = src[si]
            out[oi + 1] = src[si + 1]
            out[oi + 2] = src[si + 2]
            out[oi + 3] = src[si + 3]
          }
        }
      }
    } else {
      const rowOffset = (t * speed * 50) % w
      if (direction === 'horizontal') {
        for (let y = 0; y < h; y++) {
          const shift = ((y / h) * rowOffset) % w
          for (let x = 0; x < w; x++) {
            const srcX = (x - shift + w) % w
            const si = this.sampleClamped(src, w, h, srcX, y)
            const oi = (y * w + x) * 4
            out[oi] = src[si]
            out[oi + 1] = src[si + 1]
            out[oi + 2] = src[si + 2]
            out[oi + 3] = src[si + 3]
          }
        }
      } else {
        const colOffset = (t * speed * 50) % h
        for (let x = 0; x < w; x++) {
          const shift = ((x / w) * colOffset) % h
          for (let y = 0; y < h; y++) {
            const srcY = (y - shift + h) % h
            const si = this.sampleClamped(src, w, h, x, srcY)
            const oi = (y * w + x) * 4
            out[oi] = src[si]
            out[oi + 1] = src[si + 1]
            out[oi + 2] = src[si + 2]
            out[oi + 3] = src[si + 3]
          }
        }
      }
    }

    this.ctx.putImageData(this.outputData, 0, 0)
    if (this.outputTexture) {
      this.outputTexture.update()
      this.outputTexture.source?.update()
    }
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
      this.slitScanResolve = resolve
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
      this.slitScanResolve?.()
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

  public static async slitScan(sprite: Sprite, options: ISlitScanEffectOptions = {}): Promise<void> {
    if (!sprite.parent) return
    const effect = new SlitScanEffect(sprite, options)
    const index = sprite.parent.getChildIndex(sprite)
    sprite.parent.addChildAt(effect, index)
    await effect.play()
    effect.destroy({ children: true })
  }
}
