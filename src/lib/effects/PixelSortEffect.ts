import { Container, Sprite, Texture, Ticker } from 'pixi.js'

export type PixelSortDirection = 'horizontal' | 'vertical'
export type PixelSortMode = 'luminance' | 'hue' | 'saturation' | 'red' | 'green' | 'blue'
export type PixelSortOrder = 'ascending' | 'descending'

export interface IPixelSortEffectOptions {
  direction?: PixelSortDirection
  sortMode?: PixelSortMode
  sortOrder?: PixelSortOrder
  thresholdLow?: number  // 0-1
  thresholdHigh?: number // 0-1
  duration?: number
  refreshRate?: number
  rowStep?: number // process every Nth row/column for performance (default 1)
  intensity?: number // 0-1, or animated 0->1 over duration
}

function getLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

function rgbToHue(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === min) return 0
  const d = max - min
  let h = 0
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return (h / 6) * 255
}

function getSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === 0) return 0
  return ((max - min) / max) * 255
}

function getSortKey(
  r: number, g: number, b: number, mode: PixelSortMode
): number {
  switch (mode) {
    case 'luminance': return getLuminance(r, g, b)
    case 'hue': return rgbToHue(r, g, b)
    case 'saturation': return getSaturation(r, g, b)
    case 'red': return r
    case 'green': return g
    case 'blue': return b
    default: return getLuminance(r, g, b)
  }
}

export default class PixelSortEffect extends Container {
  private sourceSprite: Sprite
  private outputSprite: Sprite | null = null
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private originalData: ImageData | null = null
  private sortedData: ImageData | null = null
  private outputData: ImageData | null = null
  private canvasWidth: number = 0
  private canvasHeight: number = 0
  private options: Required<IPixelSortEffectOptions>
  private currentTime: number = 0
  private lastRefreshTime: number = 0
  private pixelSortResolve?: () => void
  private isProcessing: boolean = false
  private outputTexture: Texture | null = null

  constructor(
    sourceSprite: Sprite,
    options: IPixelSortEffectOptions = {},
  ) {
    super()
    this.sourceSprite = sourceSprite
    this.options = {
      direction: options.direction ?? 'horizontal',
      sortMode: options.sortMode ?? 'luminance',
      sortOrder: options.sortOrder ?? 'ascending',
      thresholdLow: options.thresholdLow ?? 0.2,
      thresholdHigh: options.thresholdHigh ?? 0.8,
      duration: options.duration ?? 1.5,
      refreshRate: options.refreshRate ?? 0.016,
      rowStep: Math.max(1, options.rowStep ?? 1),
      intensity: options.intensity ?? 1,
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
    return true
  }

  private sortRow(
    data: Uint8ClampedArray,
    y: number,
    width: number,
    height: number,
  ): void {
    const { sortMode, sortOrder, thresholdLow, thresholdHigh } = this.options
    const tLo = thresholdLow * 255
    const tHi = thresholdHigh * 255

    const indices: number[] = []
    const keys: number[] = []
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]
      if (a < 10) continue
      const key = getSortKey(r, g, b, sortMode)
      if (key >= tLo && key <= tHi) {
        indices.push(x)
        keys.push(key)
      }
    }
    // Sort indices by key
    const sorted = indices
      .map((idx, j) => ({ idx, key: keys[j] }))
      .sort((a, b) => (sortOrder === 'ascending' ? a.key - b.key : b.key - a.key))
    const sortedIndices = sorted.map((s) => s.idx)
    const positions = indices.slice().sort((a, b) => a - b)
    // Copy pixel data: newRow[positions[j]] = row[sortedIndices[j]]
    const rowCopy = new Uint8ClampedArray(width * 4)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const j = x * 4
      rowCopy[j] = data[i]
      rowCopy[j + 1] = data[i + 1]
      rowCopy[j + 2] = data[i + 2]
      rowCopy[j + 3] = data[i + 3]
    }
    for (let j = 0; j < positions.length; j++) {
      const pos = positions[j]
      const srcX = sortedIndices[j]
      const dstI = (y * width + pos) * 4
      const srcI = srcX * 4
      data[dstI] = rowCopy[srcI]
      data[dstI + 1] = rowCopy[srcI + 1]
      data[dstI + 2] = rowCopy[srcI + 2]
      data[dstI + 3] = rowCopy[srcI + 3]
    }
  }

  private sortColumn(
    data: Uint8ClampedArray,
    x: number,
    width: number,
    height: number,
  ): void {
    const { sortMode, sortOrder, thresholdLow, thresholdHigh } = this.options
    const tLo = thresholdLow * 255
    const tHi = thresholdHigh * 255

    const indices: number[] = []
    const keys: number[] = []
    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]
      if (a < 10) continue
      const key = getSortKey(r, g, b, sortMode)
      if (key >= tLo && key <= tHi) {
        indices.push(y)
        keys.push(key)
      }
    }
    const sorted = indices
      .map((idx, j) => ({ idx, key: keys[j] }))
      .sort((a, b) => (sortOrder === 'ascending' ? a.key - b.key : b.key - a.key))
    const sortedIndices = sorted.map((s) => s.idx)
    const positions = indices.slice().sort((a, b) => a - b)
    const colCopy = new Uint8ClampedArray(height * 4)
    for (let y = 0; y < height; y++) {
      const srcI = (y * width + x) * 4
      const dstI = y * 4
      colCopy[dstI] = data[srcI]
      colCopy[dstI + 1] = data[srcI + 1]
      colCopy[dstI + 2] = data[srcI + 2]
      colCopy[dstI + 3] = data[srcI + 3]
    }
    for (let j = 0; j < positions.length; j++) {
      const pos = positions[j]
      const srcY = sortedIndices[j]
      const dstI = (pos * width + x) * 4
      const srcI = srcY * 4
      data[dstI] = colCopy[srcI]
      data[dstI + 1] = colCopy[srcI + 1]
      data[dstI + 2] = colCopy[srcI + 2]
      data[dstI + 3] = colCopy[srcI + 3]
    }
  }

  private runSort(data: ImageData): void {
    const { data: buf } = data
    const { direction, rowStep } = this.options
    const w = data.width
    const h = data.height

    if (direction === 'horizontal') {
      for (let y = 0; y < h; y += rowStep) {
        this.sortRow(buf, y, w, h)
      }
    } else {
      for (let x = 0; x < w; x += rowStep) {
        this.sortColumn(buf, x, w, h)
      }
    }
  }

  private lerpImageData(
    out: ImageData,
    orig: ImageData,
    sorted: ImageData,
    t: number,
  ): void {
    const o = out.data
    const a = orig.data
    const b = sorted.data
    for (let i = 0; i < o.length; i++) {
      o[i] = a[i] * (1 - t) + b[i] * t
    }
  }

  private prepare(): void {
    if (!this.captureSourceToCanvas() || !this.ctx) return

    this.originalData = this.ctx.getImageData(0, 0, this.canvasWidth, this.canvasHeight)
    this.sortedData = this.ctx.getImageData(0, 0, this.canvasWidth, this.canvasHeight)
    this.runSort(this.sortedData!)
    this.outputData = this.ctx.createImageData(this.canvasWidth, this.canvasHeight)

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
      this.pixelSortResolve = resolve
      Ticker.shared.add(this.update, this)
    })
  }

  public async pixelSort(): Promise<void> {
    return this.play()
  }

  private update(): void {
    if (!this.isProcessing || !this.ctx || !this.originalData || !this.sortedData || !this.outputData) return

    const dt = Ticker.shared.deltaMS / 1000
    this.currentTime += dt
    this.lastRefreshTime += dt

    const duration = this.options.duration
    const progress = Math.min(1, this.currentTime / duration)
    const t = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2

    this.lerpImageData(this.outputData, this.originalData, this.sortedData, t)
    this.ctx.putImageData(this.outputData, 0, 0)
    if (this.outputTexture) {
      this.outputTexture.update()
      this.outputTexture.source?.update()
    }

    if (this.currentTime >= duration) {
      this.finish()
    }
  }

  private finish(): void {
    this.isProcessing = false
    Ticker.shared.remove(this.update, this)
    this.sourceSprite.visible = true
    this.pixelSortResolve?.()
  }

  public destroy(options?: any): void {
    Ticker.shared.remove(this.update, this)
    this.originalData = null
    this.sortedData = null
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

  public static async pixelSort(sprite: Sprite, options: IPixelSortEffectOptions = {}): Promise<void> {
    if (!sprite.parent) return
    const effect = new PixelSortEffect(sprite, options)
    const index = sprite.parent.getChildIndex(sprite)
    sprite.parent.addChildAt(effect, index)
    await effect.play()
    effect.destroy({ children: true })
  }
}
