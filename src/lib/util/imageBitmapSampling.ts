import Point from './Point'
import { subsamplePoints } from './formPatternSampling'

export type ImageFitMode = 'none' | 'contain' | 'cover' | 'stretch'
export type ImageMaskMode = 'alpha' | 'luma' | 'hueRange'
export type ImageSamplingMode = 'fill' | 'edges' | 'hybrid'
export type ImageEdgeDetector = 'alphaContour' | 'lumaSobel'

export interface ImageMaskSampleOptions {
  alphaThreshold?: number
  fitMode?: ImageFitMode
  autoDownscaleMax?: number
  maskMode?: ImageMaskMode
  invertMask?: boolean
  maskLumaThreshold?: number
  maskHueMin?: number
  maskHueMax?: number
  samplingMode?: ImageSamplingMode
  samplingDensity?: number
  edgeThickness?: number
  edgeDetector?: ImageEdgeDetector
}

export interface ImageFramePlaybackOptions {
  frameRate?: number
  loop?: boolean
  pingPong?: boolean
}

export interface ImageFramePlaybackState {
  elapsedSec: number
  frameIndex: number
}

const imageElementCache = new Map<string, HTMLImageElement>()
const imageDataCache = new Map<string, ImageData>()
let decodeToken = 0

export function resolveImageSource(imageDataUrl: string, imageDataUrls: string[], frameIndex: number): string {
  const frames = (imageDataUrls || []).filter((s) => !!s?.trim())
  const useFrames = frames.length > 1 || (frames.length === 1 && !imageDataUrl?.trim())
  if (useFrames) {
    return frames[Math.max(0, Math.min(frames.length - 1, frameIndex))] || imageDataUrl || ''
  }
  return imageDataUrl || ''
}

export function advanceImageFramePlayback(
  state: ImageFramePlaybackState,
  deltaTime: number,
  frameCount: number,
  opts: ImageFramePlaybackOptions = {},
): ImageFramePlaybackState {
  if (frameCount <= 1) {
    return { elapsedSec: state.elapsedSec, frameIndex: 0 }
  }
  const fps = Math.max(0.01, opts.frameRate ?? 12)
  const elapsedSec = state.elapsedSec + Math.max(0, deltaTime)
  const rawT = elapsedSec * fps
  const t = Math.floor(rawT)
  let idx = 0
  if (opts.pingPong && frameCount > 1) {
    const span = frameCount * 2 - 2
    const cyc = opts.loop !== false ? t % span : Math.min(t, span)
    idx = cyc < frameCount ? cyc : span - cyc
  } else if (opts.loop !== false) {
    idx = t % frameCount
  } else {
    idx = Math.min(frameCount - 1, t)
  }
  return { elapsedSec, frameIndex: idx }
}

export function drawImageToImageData(
  img: HTMLImageElement,
  fitMode: ImageFitMode = 'contain',
  autoDownscaleMax = 1024,
): ImageData | null {
  const w = img.naturalWidth
  const h = img.naturalHeight
  if (w <= 0 || h <= 0 || typeof document === 'undefined') return null
  const fit = fitMode
  const maxDim = Math.max(8, Math.floor(autoDownscaleMax || 1024))
  const srcScale = Math.min(1, maxDim / Math.max(w, h))
  const srcW = Math.max(1, Math.round(w * srcScale))
  const srcH = Math.max(1, Math.round(h * srcScale))
  const target = fit === 'none' ? { w: srcW, h: srcH } : { w: Math.max(srcW, srcH), h: Math.max(srcW, srcH) }
  const canvas = document.createElement('canvas')
  canvas.width = target.w
  canvas.height = target.h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.clearRect(0, 0, target.w, target.h)
  if (fit === 'none') {
    ctx.drawImage(img, 0, 0, srcW, srcH)
  } else if (fit === 'stretch') {
    ctx.drawImage(img, 0, 0, target.w, target.h)
  } else {
    const sx = target.w / srcW
    const sy = target.h / srcH
    const s = fit === 'cover' ? Math.max(sx, sy) : Math.min(sx, sy)
    const dw = srcW * s
    const dh = srcH * s
    const dx = (target.w - dw) * 0.5
    const dy = (target.h - dh) * 0.5
    ctx.drawImage(img, dx, dy, dw, dh)
  }
  return ctx.getImageData(0, 0, target.w, target.h)
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  if (d > 1e-8) {
    if (max === rn) h = 60 * (((gn - bn) / d) % 6)
    else if (max === gn) h = 60 * ((bn - rn) / d + 2)
    else h = 60 * ((rn - gn) / d + 4)
  }
  if (h < 0) h += 360
  const s = max <= 1e-8 ? 0 : d / max
  return { h, s, v: max }
}

function sobelLuma(imageData: ImageData, x: number, y: number): number {
  const { width: w, height: h, data } = imageData
  const ix = Math.max(0, Math.min(w - 1, x))
  const iy = Math.max(0, Math.min(h - 1, y))
  const idx = (iy * w + ix) * 4
  return (data[idx] * 0.2126 + data[idx + 1] * 0.7152 + data[idx + 2] * 0.0722) / 255
}

export function passesImageMask(
  data: Uint8ClampedArray,
  w: number,
  x: number,
  y: number,
  opts: ImageMaskSampleOptions,
): boolean {
  const idx = (y * w + x) * 4
  const r = data[idx]
  const g = data[idx + 1]
  const b = data[idx + 2]
  const a = data[idx + 3]
  const alphaThreshold = Math.max(0, Math.min(255, opts.alphaThreshold ?? 128))
  let ok = true
  const maskMode = opts.maskMode ?? 'alpha'
  if (maskMode === 'luma') {
    const l = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255
    ok = l >= Math.max(0, Math.min(1, opts.maskLumaThreshold ?? 0))
  } else if (maskMode === 'hueRange') {
    const hsv = rgbToHsv(r, g, b)
    const min = ((opts.maskHueMin ?? 0) % 360 + 360) % 360
    const max = ((opts.maskHueMax ?? 360) % 360 + 360) % 360
    ok = min <= max ? hsv.h >= min && hsv.h <= max : hsv.h >= min || hsv.h <= max
  } else {
    ok = a > alphaThreshold
  }
  return opts.invertMask ? !ok : ok
}

function isImageEdgePixel(imageData: ImageData, x: number, y: number, opts: ImageMaskSampleOptions): boolean {
  const { width: w, height: h, data } = imageData
  const alphaThreshold = Math.max(0, Math.min(255, opts.alphaThreshold ?? 128))
  const isOpaque = (ix: number, iy: number) => {
    if (ix < 0 || iy < 0 || ix >= w || iy >= h) return false
    return data[(iy * w + ix) * 4 + 3] > alphaThreshold && passesImageMask(data, w, ix, iy, opts)
  }
  if (!isOpaque(x, y)) return false
  const t = Math.max(1, Math.floor(opts.edgeThickness ?? 1))
  if ((opts.edgeDetector ?? 'alphaContour') === 'lumaSobel') {
    const gx = sobelLuma(imageData, x + 1, y) - sobelLuma(imageData, x - 1, y)
    const gy = sobelLuma(imageData, x, y + 1) - sobelLuma(imageData, x, y - 1)
    return Math.sqrt(gx * gx + gy * gy) > 0.08
  }
  for (let d = 1; d <= t; d++) {
    if (!isOpaque(x - d, y) || !isOpaque(x + d, y) || !isOpaque(x, y - d) || !isOpaque(x, y + d)) {
      return true
    }
  }
  return false
}

export interface ImageMaskSampleResult {
  points: Point[]
  width: number
  height: number
  centerX: number
  centerY: number
}

export function sampleImageMaskPoints(imageData: ImageData, maxCount: number, opts: ImageMaskSampleOptions = {}): ImageMaskSampleResult {
  const { width: w, height: h, data } = imageData
  const empty: ImageMaskSampleResult = { points: [], width: w, height: h, centerX: w * 0.5, centerY: h * 0.5 }
  if (w <= 0 || h <= 0) return empty
  const alphaThreshold = Math.max(0, Math.min(255, opts.alphaThreshold ?? 128))
  let minX = w
  let minY = h
  let maxX = 0
  let maxY = 0
  const isOpaque = (x: number, y: number) =>
    data[(y * w + x) * 4 + 3] > alphaThreshold && passesImageMask(data, w, x, y, opts)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (isOpaque(x, y)) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < minX || maxY < minY) return empty
  const cx = (minX + maxX) * 0.5
  const cy = (minY + maxY) * 0.5
  const bboxArea = (maxX - minX + 1) * (maxY - minY + 1)
  const density = Math.max(0.1, Math.min(4, opts.samplingDensity ?? 1))
  const maxRaw = Math.max(maxCount * 4 * density, 4000)
  const step = Math.max(1, Math.ceil(Math.sqrt(bboxArea / maxRaw)))
  const samplingMode = opts.samplingMode ?? 'fill'
  const collected: Point[] = []
  for (let y = minY; y <= maxY; y += step) {
    for (let x = minX; x <= maxX; x += step) {
      const xi = Math.floor(x)
      const yi = Math.floor(y)
      if (!isOpaque(xi, yi)) continue
      const isEdge = isImageEdgePixel(imageData, xi, yi, opts)
      if (samplingMode === 'edges' && !isEdge) continue
      if (samplingMode === 'fill' && isEdge) {
        const seed = xi * 73856093 + yi * 19349663
        const unit = ((seed % 1000) + 1000) % 1000 / 1000
        if (unit < 1 / 7) continue
      }
      collected.push(new Point(xi - cx, yi - cy))
    }
  }
  if (collected.length === 0) return empty
  const points = collected.length <= maxCount ? collected : subsamplePoints(collected, maxCount)
  return { points, width: w, height: h, centerX: cx, centerY: cy }
}

export type ImageDecodeStatus = 'idle' | 'loading' | 'decoded' | 'error'

export async function decodeImageDataUrl(url: string, opts: ImageMaskSampleOptions = {}): Promise<ImageData | null> {
  if (!url?.trim() || typeof document === 'undefined') return null
  const cacheKey = `${url}|${opts.fitMode ?? 'contain'}|${opts.autoDownscaleMax ?? 1024}`
  const cached = imageDataCache.get(cacheKey)
  if (cached) return cached
  const token = ++decodeToken
  return new Promise((resolve) => {
    let img = imageElementCache.get(url)
    if (!img) {
      img = new Image()
      img.crossOrigin = 'anonymous'
      imageElementCache.set(url, img)
    }
    const finish = () => {
      if (token !== decodeToken) return
      if (!img || !img.complete || img.naturalWidth <= 0) {
        resolve(null)
        return
      }
      const id = drawImageToImageData(img, opts.fitMode ?? 'contain', opts.autoDownscaleMax ?? 1024)
      if (id) imageDataCache.set(cacheKey, id)
      resolve(id)
    }
    if (img.complete && img.naturalWidth > 0) {
      finish()
      return
    }
    img.onload = finish
    img.onerror = () => resolve(null)
    if (img.src !== url) img.src = url
  })
}

export function invalidateImageDecodeCache(url?: string) {
  if (url) {
    imageDataCache.delete(url)
    imageElementCache.delete(url)
    return
  }
  imageDataCache.clear()
  imageElementCache.clear()
}

export function buildImageMaskCacheKey(
  source: string,
  frameIndex: number,
  maxCount: number,
  opts: ImageMaskSampleOptions,
): string {
  return [
    source,
    frameIndex,
    maxCount,
    opts.alphaThreshold,
    opts.fitMode,
    opts.autoDownscaleMax,
    opts.maskMode,
    opts.invertMask,
    opts.maskLumaThreshold,
    opts.maskHueMin,
    opts.maskHueMax,
    opts.samplingMode,
    opts.samplingDensity,
    opts.edgeThickness,
    opts.edgeDetector,
  ].join('|')
}
