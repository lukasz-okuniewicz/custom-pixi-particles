import { Container, Sprite, Texture, Ticker } from 'pixi.js'

export interface ICrystallizeEffectOptions {
  cellScale?: number     // approximate cell size in pixels (default: 16)
  jitter?: number       // 0-1, random offset of cell centers (default: 0.5)
  highlightStrength?: number // 0-1, facet sheen (default: 0.3)
  edgeSoftness?: number // 0-1, smooth cell edges (default: 0.2)
  tintByCell?: boolean  // slight tint variation per cell (default: false)
  duration?: number     // blend from original to crystallize (default: 1)
}

function hash2(x: number, y: number): number {
  const n = x * 374761393 + y * 668265263
  return (n * (n * n * 2246822519)) >>> 0
}

export default class CrystallizeEffect extends Container {
  private sourceSprite: Sprite
  private outputSprite: Sprite | null = null
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private sourceData: ImageData | null = null
  private outputData: ImageData | null = null
  private canvasWidth: number = 0
  private canvasHeight: number = 0
  private options: Required<ICrystallizeEffectOptions>
  private currentTime: number = 0
  private crystallizeResolve?: () => void
  private isProcessing: boolean = false
  private outputTexture: Texture | null = null
  private cellColors: { r: number; g: number; b: number; a: number; count: number }[] = []
  private cellIds: Uint32Array | null = null
  private centers: { x: number; y: number }[] = []

  constructor(
    sourceSprite: Sprite,
    options: ICrystallizeEffectOptions = {},
  ) {
    super()
    this.sourceSprite = sourceSprite
    this.options = {
      cellScale: Math.max(2, options.cellScale ?? 16),
      jitter: Math.max(0, Math.min(1, options.jitter ?? 0.5)),
      highlightStrength: Math.max(0, Math.min(1, options.highlightStrength ?? 0.3)),
      edgeSoftness: Math.max(0, Math.min(1, options.edgeSoftness ?? 0.2)),
      tintByCell: options.tintByCell ?? false,
      duration: options.duration ?? 1,
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

  private buildCells(): void {
    if (!this.sourceData) return

    const w = this.canvasWidth
    const h = this.canvasHeight
    const src = this.sourceData.data
    const scale = this.options.cellScale
    const jitter = this.options.jitter * scale * 0.8

    const gx = Math.ceil(w / scale) + 2
    const gy = Math.ceil(h / scale) + 2
    this.centers = []

    for (let cy = -1; cy <= gy; cy++) {
      for (let cx = -1; cx <= gx; cx++) {
        const jx = (hash2(cx, cy) / 0xffffffff) * 2 * jitter - jitter
        const jy = (hash2(cx + 1000, cy) / 0xffffffff) * 2 * jitter - jitter
        this.centers.push({
          x: cx * scale + scale / 2 + jx,
          y: cy * scale + scale / 2 + jy,
        })
      }
    }

    this.cellIds = new Uint32Array(w * h)
    const stride = gx + 3

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const gcx = Math.floor(x / scale)
        const gcy = Math.floor(y / scale)
        let best = 0
        let bestD = 1e10
        for (let dcy = -1; dcy <= 1; dcy++) {
          for (let dcx = -1; dcx <= 1; dcx++) {
            const cidx = (gcy + dcy + 1) * stride + (gcx + dcx + 1)
            if (cidx < 0 || cidx >= this.centers.length) continue
            const dx = x - this.centers[cidx].x
            const dy = y - this.centers[cidx].y
            const d = dx * dx + dy * dy
            if (d < bestD) {
              bestD = d
              best = cidx
            }
          }
        }
        this.cellIds[y * w + x] = best
      }
    }

    this.cellColors = this.centers.map(() => ({ r: 0, g: 0, b: 0, a: 0, count: 0 }))

    for (let i = 0; i < w * h; i++) {
      const c = this.cellIds![i]
      const idx = i * 4
      this.cellColors[c].r += src[idx]
      this.cellColors[c].g += src[idx + 1]
      this.cellColors[c].b += src[idx + 2]
      this.cellColors[c].a += src[idx + 3]
      this.cellColors[c].count++
    }

    for (let c = 0; c < this.cellColors.length; c++) {
      const n = this.cellColors[c].count
      if (n > 0) {
        this.cellColors[c].r /= n
        this.cellColors[c].g /= n
        this.cellColors[c].b /= n
        this.cellColors[c].a /= n
      }
    }
  }

  private updateFrame(blend: number): void {
    if (!this.ctx || !this.sourceData || !this.outputData || !this.cellIds || !this.cellColors) return

    const w = this.canvasWidth
    const h = this.canvasHeight
    const src = this.sourceData.data
    const out = this.outputData.data
    const scale = this.options.cellScale
    const { highlightStrength, tintByCell } = this.options

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4
        const cellId = this.cellIds[y * w + x]
        const cell = this.cellColors[cellId]
        const cx = this.centers[cellId].x
        const cy = this.centers[cellId].y

        let r = cell.r
        let g = cell.g
        let b = cell.b
        let a = cell.a

        if (tintByCell) {
          const t = (hash2(cellId, 0) / 0xffffffff) * 0.1
          r = Math.min(255, r * (1 + t))
          g = Math.min(255, g * (1 - t * 0.5))
          b = Math.min(255, b * (1 + t * 0.5))
        }

        if (highlightStrength > 0) {
          const dx = (x - cx) / scale
          const dy = (y - cy) / scale
          const dot = Math.max(0, -dy * 0.7 + 0.7)
          const high = 1 + dot * highlightStrength * 0.5
          r = Math.min(255, r * high)
          g = Math.min(255, g * high)
          b = Math.min(255, b * high)
        }

        if (blend < 1) {
          out[i] = src[i] * (1 - blend) + r * blend
          out[i + 1] = src[i + 1] * (1 - blend) + g * blend
          out[i + 2] = src[i + 2] * (1 - blend) + b * blend
          out[i + 3] = src[i + 3] * (1 - blend) + a * blend
        } else {
          out[i] = r
          out[i + 1] = g
          out[i + 2] = b
          out[i + 3] = a
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

    this.buildCells()

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
      this.crystallizeResolve = resolve
      Ticker.shared.add(this.update, this)
    })
  }

  private update(): void {
    if (!this.isProcessing || !this.ctx) return

    const dt = Ticker.shared.deltaMS / 1000
    this.currentTime += dt

    const progress = Math.min(1, this.currentTime / this.options.duration)
    const blend = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2

    this.updateFrame(blend)

    if (this.currentTime >= this.options.duration) {
      this.isProcessing = false
      Ticker.shared.remove(this.update, this)
      this.sourceSprite.visible = true
      this.crystallizeResolve?.()
    }
  }

  public destroy(options?: any): void {
    Ticker.shared.remove(this.update, this)
    this.sourceData = null
    this.outputData = null
    this.cellIds = null
    this.cellColors = []
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

  public static async crystallize(sprite: Sprite, options: ICrystallizeEffectOptions = {}): Promise<void> {
    if (!sprite.parent) return
    const effect = new CrystallizeEffect(sprite, options)
    const index = sprite.parent.getChildIndex(sprite)
    sprite.parent.addChildAt(effect, index)
    await effect.play()
    effect.destroy({ children: true })
  }
}
