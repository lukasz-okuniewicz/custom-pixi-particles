import Point from './Point'

export type PresetShapeType = 'circle' | 'rectOutline' | 'star' | 'heart' | 'polygon' | 'lissajous'

export interface PresetShapeParams {
  /** Circle / star / heart / polygon / lissajous: outer radius */
  radius?: number
  /** Rectangle half extents */
  halfWidth?: number
  halfHeight?: number
  /** Star inner radius ratio (0–1) */
  innerRatio?: number
  /** Star number of points (>= 2) */
  starPoints?: number
  /** Regular polygon sides (>= 3) */
  polygonSides?: number
  /** Lissajous x frequency */
  lissajousA?: number
  /** Lissajous y frequency */
  lissajousB?: number
  /** Lissajous phase (radians) */
  lissajousDelta?: number
}

export type TextRasterMode = 'fill' | 'stroke'

export interface RasterizeTextOptions {
  text: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: string
  /** Max pixels to collect before thinning */
  maxSamplePixels?: number
  /** Fill glyph area or trace outline */
  rasterMode?: TextRasterMode
  /** Used when rasterMode is stroke */
  strokeWidth?: number
  /** Canvas textAlign for multi-line: left | center | right */
  textAlign?: CanvasTextAlign
  /** Extra vertical spacing between lines (px) when text has newlines */
  lineHeight?: number
}

/**
 * Evenly resample a polyline (closed or open) to exactly `count` points by arc-length.
 */
export function resampleToCount(source: Point[], count: number): Point[] {
  if (count <= 0 || source.length === 0) return []
  if (source.length === 1) {
    const p = source[0]
    return Array.from({ length: count }, () => new Point(p.x, p.y))
  }

  const pts = [...source]
  const closed = pts.length > 2 && pts[0].x === pts[pts.length - 1].x && pts[0].y === pts[pts.length - 1].y
  const seg: Point[] = closed ? pts.slice(0, -1) : pts

  const lengths: number[] = []
  let total = 0
  const numSeg = closed ? seg.length : Math.max(0, seg.length - 1)
  for (let i = 0; i < numSeg; i++) {
    const j = closed ? (i + 1) % seg.length : i + 1
    const dx = seg[j].x - seg[i].x
    const dy = seg[j].y - seg[i].y
    const len = Math.sqrt(dx * dx + dy * dy)
    lengths.push(len)
    total += len
  }

  if (total < 1e-8) {
    const c = seg[0]
    return Array.from({ length: count }, () => new Point(c.x, c.y))
  }

  const out: Point[] = []
  for (let k = 0; k < count; k++) {
    let t = (k / Math.max(1, count)) * total
    if (closed && k === count - 1) t = 0

    let acc = 0
    let idx = 0
    while (idx < lengths.length && acc + lengths[idx] < t - 1e-8) {
      acc += lengths[idx]
      idx++
    }
    if (idx >= lengths.length) {
      const last = seg[seg.length - 1]
      out.push(new Point(last.x, last.y))
      continue
    }
    const segLen = lengths[idx] || 1e-8
    const u = (t - acc) / segLen
    const a = seg[idx]
    const b = closed ? seg[(idx + 1) % seg.length] : seg[idx + 1]
    out.push(new Point(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u))
  }
  return out
}

/**
 * Thin a dense list to exactly `maxCount` points (evenly spaced indices). Never returns fewer
 * than `maxCount` when `points.length >= maxCount` and `maxCount > 0`.
 */
export function subsamplePoints(points: Point[], maxCount: number): Point[] {
  if (maxCount <= 0 || points.length === 0) return []
  if (points.length <= maxCount) return points.map((p) => new Point(p.x, p.y))
  const out: Point[] = []
  const last = points.length - 1
  for (let k = 0; k < maxCount; k++) {
    const t = maxCount <= 1 ? 0 : k / (maxCount - 1)
    const idx = Math.round(t * last)
    const clamped = Math.min(last, Math.max(0, idx))
    out.push(new Point(points[clamped].x, points[clamped].y))
  }
  return out
}

/**
 * Map an arbitrary point cloud or polyline to exactly `count` targets.
 * For ordered polylines use `resampleToCount` first; this is for text blobs and sparse sets.
 */
export function matchPointsToCount(points: Point[], count: number): Point[] {
  if (count <= 0 || points.length === 0) return []
  if (points.length >= count) return subsamplePoints(points, count)
  const out: Point[] = []
  for (let i = 0; i < count; i++) {
    const p = points[i % points.length]
    out.push(new Point(p.x, p.y))
  }
  return out
}

function buildCircleOutline(pointBudget: number, radius: number): Point[] {
  const n = Math.max(8, Math.floor(pointBudget))
  const pts: Point[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    pts.push(new Point(Math.cos(a) * radius, Math.sin(a) * radius))
  }
  pts.push(new Point(pts[0].x, pts[0].y))
  return pts
}

function buildRectOutline(pointBudget: number, hw: number, hh: number): Point[] {
  const perSide = Math.max(2, Math.floor(pointBudget / 4))
  const pts: Point[] = []
  const pushEdge = (x0: number, y0: number, x1: number, y1: number, steps: number) => {
    for (let s = 0; s < steps; s++) {
      const t = s / steps
      pts.push(new Point(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t))
    }
  }
  pushEdge(-hw, -hh, hw, -hh, perSide)
  pushEdge(hw, -hh, hw, hh, perSide)
  pushEdge(hw, hh, -hw, hh, perSide)
  pushEdge(-hw, hh, -hw, -hh, perSide)
  pts.push(new Point(pts[0].x, pts[0].y))
  return pts
}

function buildStarOutline(
  pointBudget: number,
  outerR: number,
  innerRatio: number,
  numPoints: number,
): Point[] {
  const spikes = Math.max(2, Math.floor(numPoints))
  const innerR = outerR * Math.max(0.05, Math.min(1, innerRatio))
  const verts: Point[] = []
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2
    verts.push(new Point(Math.cos(a) * r, Math.sin(a) * r))
  }
  verts.push(new Point(verts[0].x, verts[0].y))
  return resampleToCount(verts, Math.max(8, pointBudget))
}

/** Parametric heart, scaled so max extent ~ radius */
function buildHeartOutline(pointBudget: number, radius: number): Point[] {
  const n = Math.max(16, Math.floor(pointBudget))
  const verts: Point[] = []
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2
    const x = 16 * Math.pow(Math.sin(t), 3)
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
    verts.push(new Point((x / 16) * radius, (-y / 16) * radius))
  }
  verts.push(new Point(verts[0].x, verts[0].y))
  return resampleToCount(verts, Math.max(8, pointBudget))
}

function buildRegularPolygonOutline(pointBudget: number, radius: number, sides: number): Point[] {
  const nSides = Math.max(3, Math.floor(sides))
  const verts: Point[] = []
  for (let i = 0; i < nSides; i++) {
    const a = (i / nSides) * Math.PI * 2 - Math.PI / 2
    verts.push(new Point(Math.cos(a) * radius, Math.sin(a) * radius))
  }
  verts.push(new Point(verts[0].x, verts[0].y))
  return resampleToCount(verts, Math.max(8, pointBudget))
}

function buildLissajousOutline(
  pointBudget: number,
  radius: number,
  a: number,
  b: number,
  delta: number,
): Point[] {
  const n = Math.max(16, Math.floor(pointBudget))
  const verts: Point[] = []
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2
    verts.push(
      new Point(
        radius * Math.sin(a * t + delta),
        radius * Math.sin(b * t),
      ),
    )
  }
  verts.push(new Point(verts[0].x, verts[0].y))
  return resampleToCount(verts, Math.max(8, pointBudget))
}

/**
 * Build a closed polyline in local space (before center/scale/rotation) for preset shapes.
 */
export function buildPresetShape(
  type: PresetShapeType,
  pointBudget: number,
  params: PresetShapeParams = {},
): Point[] {
  const budget = Math.max(8, Math.floor(pointBudget))
  const radius = params.radius ?? 100
  const hw = params.halfWidth ?? 120
  const hh = params.halfHeight ?? 80
  const innerRatio = params.innerRatio ?? 0.45
  const starPoints = params.starPoints ?? 5
  const polygonSides = params.polygonSides ?? 6
  const la = params.lissajousA ?? 3
  const lb = params.lissajousB ?? 2
  const ld = params.lissajousDelta ?? 0

  switch (type) {
    case 'circle':
      return buildCircleOutline(budget, radius)
    case 'rectOutline':
      return buildRectOutline(budget, hw, hh)
    case 'star':
      return buildStarOutline(budget, radius, innerRatio, starPoints)
    case 'heart':
      return buildHeartOutline(budget, radius)
    case 'polygon':
      return buildRegularPolygonOutline(budget, radius, polygonSides)
    case 'lissajous':
      return buildLissajousOutline(budget, radius, la, lb, ld)
    default:
      return buildCircleOutline(budget, radius)
  }
}

/**
 * Collect opaque pixel positions from canvas text; returns points centered roughly at origin.
 * Returns empty array if canvas / 2D context is unavailable (e.g. Node without canvas).
 */
export function rasterizeTextToPoints(options: RasterizeTextOptions): Point[] {
  const text = options.text ?? ''
  if (!text.trim()) return []

  const fontSize = options.fontSize ?? 64
  const fontFamily = options.fontFamily ?? 'sans-serif'
  const fontWeight = options.fontWeight ?? '400'
  const maxPx = options.maxSamplePixels ?? 8000
  const lineHeight = options.lineHeight ?? fontSize * 1.2
  const textAlign = options.textAlign ?? 'center'

  const g = getCanvas2D()
  if (!g) return []

  const { canvas, ctx } = g
  const fontCss = `${fontWeight} ${fontSize}px ${fontFamily}`
  ctx.font = fontCss
  const lines = text.split(/\r?\n/)
  const lineWidths = lines.map((ln) => ctx.measureText(ln || ' ').width)
  const maxLineW = Math.max(4, ...lineWidths)
  const w = Math.ceil(maxLineW + fontSize * 4)
  const h = Math.ceil(lines.length * lineHeight + fontSize * 4)
  canvas.width = w
  canvas.height = h
  ctx.font = fontCss
  ctx.textBaseline = 'middle'
  ctx.textAlign = textAlign
  const mode = options.rasterMode ?? 'fill'
  const startY = (h - (lines.length - 1) * lineHeight) / 2
  for (let li = 0; li < lines.length; li++) {
    const ln = lines[li]
    const ly = startY + li * lineHeight
    let lx = w / 2
    if (textAlign === 'left') lx = fontSize * 2
    else if (textAlign === 'right') lx = w - fontSize * 2
    if (mode === 'stroke') {
      ctx.lineWidth = Math.max(0.5, options.strokeWidth ?? Math.max(1, fontSize * 0.08))
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.strokeStyle = '#ffffff'
      ctx.strokeText(ln, lx, ly)
    } else {
      ctx.fillStyle = '#ffffff'
      ctx.fillText(ln, lx, ly)
    }
  }

  const img = ctx.getImageData(0, 0, w, h)
  const data = img.data

  let minX = w
  let minY = h
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (data[i + 3] > 128) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < minX) {
    return []
  }

  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2

  const bw = maxX - minX + 1
  const bh = maxY - minY + 1
  const bboxArea = bw * bh
  // Do NOT stop after N pixels while scanning top-to-bottom — that only kept the top half of glyphs.
  // Stride across the full bbox so samples cover top and bottom (and left/right) evenly.
  const maxRaw = Math.max(maxPx * 4, 4000)
  const step = Math.max(1, Math.ceil(Math.sqrt(bboxArea / maxRaw)))

  const collected: Point[] = []
  for (let y = minY; y <= maxY; y += step) {
    for (let x = minX; x <= maxX; x += step) {
      const i = (Math.floor(y) * w + Math.floor(x)) * 4
      if (data[i + 3] > 128) {
        collected.push(new Point(x - cx, y - cy))
      }
    }
  }

  if (collected.length === 0) {
    return []
  }

  return subsamplePoints(collected, maxPx)
}

function getCanvas2D(): {
  canvas: HTMLCanvasElement | OffscreenCanvas
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
} | null {
  try {
    if (typeof OffscreenCanvas !== 'undefined') {
      const c = new OffscreenCanvas(4, 4)
      const ctx = c.getContext('2d')
      if (ctx) return { canvas: c, ctx }
    }
  } catch {
    //
  }
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx) return { canvas, ctx }
  }
  return null
}

function parsePathFloats(s: string): number[] {
  const re = /[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g
  const m = s.match(re)
  return m ? m.map(parseFloat) : []
}

function cubicPoint(
  t: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
): Point {
  const u = 1 - t
  const tt = t * t
  const uu = u * u
  const uuu = uu * u
  const ttt = tt * t
  return new Point(
    uuu * x0 + 3 * uu * t * x1 + 3 * u * tt * x2 + ttt * x3,
    uuu * y0 + 3 * uu * t * y1 + 3 * u * tt * y2 + ttt * y3,
  )
}

function quadPoint(
  t: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): Point {
  const u = 1 - t
  return new Point(
    u * u * x0 + 2 * u * t * x1 + t * t * x2,
    u * u * y0 + 2 * u * t * y1 + t * t * y2,
  )
}

/**
 * Flatten SVG path `d` to a polyline in local space (first point at origin-ish).
 * Supports M L H V C Q Z (absolute and relative). Curves are subdivided.
 */
export function flattenSvgPathToPoints(d: string, segmentsPerCurve = 14): Point[] {
  if (!d || !d.trim()) return []
  const cleaned = d.replace(/,/g, ' ').trim()
  const cmds: Array<{ c: string; nums: number[] }> = []
  let i = 0
  while (i < cleaned.length) {
    while (i < cleaned.length && /\s/.test(cleaned[i])) i++
    if (i >= cleaned.length) break
    const c = cleaned[i]
    if (!/[MmLlHhVvCcQqZz]/.test(c)) {
      i++
      continue
    }
    i++
    const start = i
    while (i < cleaned.length && !/[MmLlHhVvCcQqZz]/.test(cleaned[i])) i++
    const nums = parsePathFloats(cleaned.slice(start, i))
    cmds.push({ c, nums })
  }

  let x = 0
  let y = 0
  let sx = 0
  let sy = 0
  const out: Point[] = []

  const pushPt = (px: number, py: number) => {
    if (out.length === 0 || out[out.length - 1].x !== px || out[out.length - 1].y !== py) {
      out.push(new Point(px, py))
    }
    x = px
    y = py
  }

  for (let ci = 0; ci < cmds.length; ci++) {
    let { c, nums } = cmds[ci]
    let rel = c === c.toLowerCase() && c !== 'z' && c !== 'Z'
    let upper = c.toUpperCase()

    if (upper === 'Z') {
      if (out.length) pushPt(sx, sy)
      continue
    }

    if (upper === 'M') {
      let k = 0
      if (nums.length < 2) continue
      let nx = nums[k++]
      let ny = nums[k++]
      if (rel) {
        nx += x
        ny += y
      }
      sx = nx
      sy = ny
      pushPt(nx, ny)
      while (k < nums.length - 1) {
        nx = nums[k++]
        ny = nums[k++]
        if (rel) {
          nx += x
          ny += y
        }
        pushPt(nx, ny)
      }
      continue
    }

    if (upper === 'L') {
      let k = 0
      while (k < nums.length - 1) {
        let nx = nums[k++]
        let ny = nums[k++]
        if (rel) {
          nx += x
          ny += y
        }
        pushPt(nx, ny)
      }
      continue
    }

    if (upper === 'H') {
      for (const v of nums) {
        const nx = rel ? x + v : v
        pushPt(nx, y)
      }
      continue
    }

    if (upper === 'V') {
      for (const v of nums) {
        const ny = rel ? y + v : v
        pushPt(x, ny)
      }
      continue
    }

    if (upper === 'C') {
      let k = 0
      while (k + 5 < nums.length) {
        let x1 = nums[k++]
        let y1 = nums[k++]
        let x2 = nums[k++]
        let y2 = nums[k++]
        let x3 = nums[k++]
        let y3 = nums[k++]
        if (rel) {
          x1 += x
          y1 += y
          x2 += x
          y2 += y
          x3 += x
          y3 += y
        }
        const x0 = x
        const y0 = y
        for (let s = 1; s <= segmentsPerCurve; s++) {
          const t = s / segmentsPerCurve
          const p = cubicPoint(t, x0, y0, x1, y1, x2, y2, x3, y3)
          pushPt(p.x, p.y)
        }
      }
      continue
    }

    if (upper === 'Q') {
      let k = 0
      while (k + 3 < nums.length) {
        let x1 = nums[k++]
        let y1 = nums[k++]
        let x2 = nums[k++]
        let y2 = nums[k++]
        if (rel) {
          x1 += x
          y1 += y
          x2 += x
          y2 += y
        }
        const x0 = x
        const y0 = y
        for (let s = 1; s <= segmentsPerCurve; s++) {
          const t = s / segmentsPerCurve
          const p = quadPoint(t, x0, y0, x1, y1, x2, y2)
          pushPt(p.x, p.y)
        }
      }
      continue
    }
  }

  return out
}

/** xorshift32 — deterministic 0..1 from integer seed */
export function seededUnit(seed: number): number {
  let x = seed | 0
  x ^= x << 13
  x ^= x >>> 17
  x ^= x << 5
  return ((x >>> 0) % 1000000) / 1000000
}

/** Permutation of 0..n-1 from seed */
export function shuffledIndices(n: number, seed: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i)
  let s = seed
  for (let i = n - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) | 0
    const j = (Math.abs(s) >>> 0) % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function sortPointsByAngle(points: Point[], cx: number, cy: number): Point[] {
  return [...points].sort((a, b) => {
    const aa = Math.atan2(a.y - cy, a.x - cx)
    const ab = Math.atan2(b.y - cy, b.x - cx)
    return aa - ab
  })
}

export interface IParticleXY {
  x: number
  y: number
}

/**
 * Greedy: in shuffled particle order, assign closest unused target (low travel sum heuristic).
 */
export function assignGreedyNearest(particles: IParticleXY[], targets: Point[]): Point[] {
  const n = Math.min(particles.length, targets.length)
  if (n === 0) return []
  const order = shuffledIndices(n, particles.reduce((s, p) => s + (p.x * 31 + p.y * 17) | 0, 0))
  const used = new Set<number>()
  const result: Point[] = new Array(n)
  for (let k = 0; k < n; k++) {
    const pi = order[k]
    const p = particles[pi]
    let best = -1
    let bestD = Infinity
    for (let ti = 0; ti < n; ti++) {
      if (used.has(ti)) continue
      const dx = targets[ti].x - p.x
      const dy = targets[ti].y - p.y
      const d2 = dx * dx + dy * dy
      if (d2 < bestD) {
        bestD = d2
        best = ti
      }
    }
    if (best >= 0) {
      used.add(best)
      result[pi] = new Point(targets[best].x, targets[best].y)
    }
  }
  for (let i = 0; i < n; i++) {
    if (!result[i]) result[i] = new Point(targets[i % targets.length].x, targets[i % targets.length].y)
  }
  return result
}

/**
 * Match i-th particle (by sorted order) to i-th target sorted by polar angle from center.
 */
export function assignByPolarAngle(
  particles: IParticleXY[],
  targets: Point[],
  cx: number,
  cy: number,
): Point[] {
  const n = particles.length
  if (n === 0) return []
  const pIdx = [...particles.keys()].sort(
    (a, b) =>
      Math.atan2(particles[a].y - cy, particles[a].x - cx) -
      Math.atan2(particles[b].y - cy, particles[b].x - cx),
  )
  const tSorted = sortPointsByAngle(targets, cx, cy)
  const out: Point[] = new Array(n)
  for (let i = 0; i < n; i++) {
    out[pIdx[i]] = new Point(
      tSorted[i % tSorted.length].x,
      tSorted[i % tSorted.length].y,
    )
  }
  return out
}

/**
 * Minimum-cost perfect assignment (Hungarian). `cost[i][j]` = cost to assign row i to column j.
 * Returns `assignment[i] = j` (square matrix only).
 */
export function hungarianMinAssignment(cost: number[][]): number[] {
  const n = cost.length
  if (n === 0) return []
  const m = cost[0]?.length ?? 0
  if (n !== m) {
    throw new Error('hungarianMinAssignment expects a square cost matrix')
  }
  const inf = 1e30
  const u = new Float64Array(n + 1)
  const v = new Float64Array(n + 1)
  const p = new Int32Array(n + 1)
  const way = new Int32Array(n + 1)
  for (let i = 1; i <= n; i++) {
    p[0] = i
    let j0 = 0
    const minv = new Float64Array(n + 1)
    const used = new Uint8Array(n + 1)
    for (let j = 0; j <= n; j++) {
      minv[j] = inf
      used[j] = 0
    }
    do {
      used[j0] = 1
      const i0 = p[j0]
      let delta = inf
      let j1 = 0
      for (let j = 1; j <= n; j++) {
        if (!used[j]) {
          const cur = cost[i0 - 1][j - 1] - u[i0] - v[j]
          if (cur < minv[j]) {
            minv[j] = cur
            way[j] = j0
          }
          if (minv[j] < delta) {
            delta = minv[j]
            j1 = j
          }
        }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j]) {
          u[p[j]] += delta
          v[j] -= delta
        } else {
          minv[j] -= delta
        }
      }
      j0 = j1
    } while (p[j0] !== 0)
    do {
      const j1 = way[j0]
      p[j0] = p[j1]
      j0 = j1
    } while (j0 !== 0)
  }
  const assignment = new Int32Array(n)
  assignment.fill(-1)
  for (let j = 1; j <= n; j++) {
    if (p[j] !== 0) {
      assignment[p[j] - 1] = j - 1
    }
  }
  return Array.from(assignment)
}

/**
 * Globally optimal assignment minimizing sum of squared distances (O(n³), best for n ≤ ~200).
 */
export function assignHungarian(particles: IParticleXY[], targets: Point[]): Point[] {
  const n = particles.length
  if (n === 0) return []
  const cost: number[][] = []
  for (let i = 0; i < n; i++) {
    const row: number[] = []
    for (let j = 0; j < n; j++) {
      const dx = targets[j].x - particles[i].x
      const dy = targets[j].y - particles[i].y
      row.push(dx * dx + dy * dy)
    }
    cost.push(row)
  }
  const colForRow = hungarianMinAssignment(cost)
  const out: Point[] = new Array(n)
  for (let i = 0; i < n; i++) {
    const j = colForRow[i]
    const tj = j >= 0 && j < targets.length ? targets[j] : targets[i % targets.length]
    out[i] = new Point(tj.x, tj.y)
  }
  return out
}

/**
 * Blend two preset shapes in local space (same point budget), then caller resamples/transforms.
 */
export function blendMorphedPresets(
  typeA: PresetShapeType,
  paramsA: PresetShapeParams,
  typeB: PresetShapeType,
  paramsB: PresetShapeParams,
  pointBudget: number,
  blend: number,
): Point[] {
  const budget = Math.max(8, Math.floor(pointBudget))
  const t = Math.max(0, Math.min(1, blend))
  const a = resampleToCount(buildPresetShape(typeA, budget, paramsA), budget)
  const b = resampleToCount(buildPresetShape(typeB, budget, paramsB), budget)
  const out: Point[] = []
  for (let i = 0; i < budget; i++) {
    const pa = a[i] ?? a[0]
    const pb = b[i] ?? b[0]
    out.push(new Point(pa.x * (1 - t) + pb.x * t, pa.y * (1 - t) + pb.y * t))
  }
  return out
}

/** Position + RGB sampled from an image (0–255). */
export interface PointRgb {
  x: number
  y: number
  r: number
  g: number
  b: number
}

/**
 * Sample opaque pixels from ImageData into a point cloud (centered at bbox center).
 */
export function rasterizeOpaquePixelsToPoints(
  imageData: ImageData,
  maxCount: number,
  alphaThreshold = 128,
): Point[] {
  const { width: w, height: h, data } = imageData
  if (w <= 0 || h <= 0) return []
  let minX = w
  let minY = h
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (data[i + 3] > alphaThreshold) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < minX) return []
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const bw = maxX - minX + 1
  const bh = maxY - minY + 1
  const bboxArea = bw * bh
  const maxRaw = Math.max(maxCount * 4, 4000)
  const step = Math.max(1, Math.ceil(Math.sqrt(bboxArea / maxRaw)))
  const collected: Point[] = []
  for (let y = minY; y <= maxY; y += step) {
    for (let x = minX; x <= maxX; x += step) {
      const i = (Math.floor(y) * w + Math.floor(x)) * 4
      if (data[i + 3] > alphaThreshold) {
        collected.push(new Point(x - cx, y - cy))
      }
    }
  }
  if (collected.length === 0) return []
  return subsamplePoints(collected, maxCount)
}

/**
 * Same as {@link rasterizeOpaquePixelsToPoints} but keeps per-sample RGB from the image.
 */
export function rasterizeOpaquePixelsToPointsWithColors(
  imageData: ImageData,
  maxCount: number,
  alphaThreshold = 128,
): PointRgb[] {
  const { width: w, height: h, data } = imageData
  if (w <= 0 || h <= 0) return []
  let minX = w
  let minY = h
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (data[i + 3] > alphaThreshold) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < minX) return []
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const bw = maxX - minX + 1
  const bh = maxY - minY + 1
  const bboxArea = bw * bh
  const maxRaw = Math.max(maxCount * 4, 4000)
  const step = Math.max(1, Math.ceil(Math.sqrt(bboxArea / maxRaw)))
  const collected: PointRgb[] = []
  for (let y = minY; y <= maxY; y += step) {
    for (let x = minX; x <= maxX; x += step) {
      const ii = (Math.floor(y) * w + Math.floor(x)) * 4
      if (data[ii + 3] > alphaThreshold) {
        collected.push({
          x: x - cx,
          y: y - cy,
          r: data[ii],
          g: data[ii + 1],
          b: data[ii + 2],
        })
      }
    }
  }
  if (collected.length === 0) return []
  return subsamplePointRgb(collected, maxCount)
}

function subsamplePointRgb(samples: PointRgb[], maxCount: number): PointRgb[] {
  if (maxCount <= 0 || samples.length === 0) return []
  if (samples.length <= maxCount) return samples.map((s) => ({ ...s }))
  const out: PointRgb[] = []
  const last = samples.length - 1
  for (let k = 0; k < maxCount; k++) {
    const t = maxCount <= 1 ? 0 : k / (maxCount - 1)
    const idx = Math.round(t * last)
    const clamped = Math.min(last, Math.max(0, idx))
    const s = samples[clamped]
    out.push({ x: s.x, y: s.y, r: s.r, g: s.g, b: s.b })
  }
  return out
}

/**
 * Map a point+RGB cloud to exactly `count` samples (same rules as {@link matchPointsToCount}).
 */
export function matchSamplesToCount(samples: PointRgb[], count: number): PointRgb[] {
  if (count <= 0 || samples.length === 0) return []
  if (samples.length >= count) return subsamplePointRgb(samples, count)
  const out: PointRgb[] = []
  for (let i = 0; i < count; i++) {
    const s = samples[i % samples.length]
    out.push({ x: s.x, y: s.y, r: s.r, g: s.g, b: s.b })
  }
  return out
}

export function sortTargetIndicesByAngle(targets: Point[], cx: number, cy: number): number[] {
  const n = targets.length
  const idx = [...Array(n).keys()]
  idx.sort((a, b) => {
    const aa = Math.atan2(targets[a].y - cy, targets[a].x - cx)
    const ab = Math.atan2(targets[b].y - cy, targets[b].x - cx)
    return aa - ab
  })
  return idx
}

/**
 * For each particle index (emitter sorted order), the assigned target index after greedy matching.
 */
export function assignGreedyNearestTargetIndices(
  particles: IParticleXY[],
  targets: Point[],
): number[] {
  const n = Math.min(particles.length, targets.length)
  if (n === 0) return []
  const order = shuffledIndices(n, particles.reduce((s, p) => s + (p.x * 31 + p.y * 17) | 0, 0))
  const used = new Set<number>()
  const resultIdx = new Array<number>(n)
  resultIdx.fill(-1)
  for (let k = 0; k < n; k++) {
    const pi = order[k]
    const p = particles[pi]
    let best = -1
    let bestD = Infinity
    for (let ti = 0; ti < n; ti++) {
      if (used.has(ti)) continue
      const dx = targets[ti].x - p.x
      const dy = targets[ti].y - p.y
      const d2 = dx * dx + dy * dy
      if (d2 < bestD) {
        bestD = d2
        best = ti
      }
    }
    if (best >= 0) {
      used.add(best)
      resultIdx[pi] = best
    }
  }
  for (let i = 0; i < n; i++) {
    if (resultIdx[i] < 0) resultIdx[i] = i % targets.length
  }
  return resultIdx
}

/**
 * For each particle index, the assigned target index after angle-based matching.
 */
export function assignByPolarAngleTargetIndices(
  particles: IParticleXY[],
  targets: Point[],
  cx: number,
  cy: number,
): number[] {
  const n = particles.length
  if (n === 0) return []
  const pIdx = [...particles.keys()].sort(
    (a, b) =>
      Math.atan2(particles[a].y - cy, particles[a].x - cx) -
      Math.atan2(particles[b].y - cy, particles[b].x - cx),
  )
  const tOrder = sortTargetIndicesByAngle(targets, cx, cy)
  const targetIdxForParticle = new Array<number>(n)
  for (let i = 0; i < n; i++) {
    targetIdxForParticle[pIdx[i]] = tOrder[i % tOrder.length]
  }
  return targetIdxForParticle
}

/**
 * Target index `j` for each particle row `i` (min-cost assignment).
 */
export function assignHungarianTargetIndices(particles: IParticleXY[], targets: Point[]): number[] {
  const n = particles.length
  if (n === 0) return []
  const cost: number[][] = []
  for (let i = 0; i < n; i++) {
    const row: number[] = []
    for (let j = 0; j < n; j++) {
      const dx = targets[j].x - particles[i].x
      const dy = targets[j].y - particles[i].y
      row.push(dx * dx + dy * dy)
    }
    cost.push(row)
  }
  return hungarianMinAssignment(cost)
}

/** Particle with optional uid for stable tie-breaks */
export interface IParticleXYWithUid extends IParticleXY {
  uid?: number
}

/**
 * Sort particles by nearest target index along the ordered polyline (wipe / march).
 * Particle at rank k receives target k.
 */
export function assignPathOrderTargetIndices(
  particles: IParticleXYWithUid[],
  targets: Point[],
): number[] {
  const n = Math.min(particles.length, targets.length)
  if (n === 0) return []
  const nearest = particles.map((p) => {
    let best = 0
    let bestD = Infinity
    for (let j = 0; j < targets.length; j++) {
      const dx = p.x - targets[j].x
      const dy = p.y - targets[j].y
      const d = dx * dx + dy * dy
      if (d < bestD) {
        bestD = d
        best = j
      }
    }
    return best
  })
  const order = [...Array(n).keys()].sort(
    (a, b) => nearest[a] - nearest[b] || (particles[a].uid ?? a) - (particles[b].uid ?? b),
  )
  const targetIndex = new Array<number>(n)
  for (let rank = 0; rank < n; rank++) {
    targetIndex[order[rank]] = rank
  }
  return targetIndex
}

/**
 * Extract first `d` attribute from `<path>` in raw SVG markup. If `pathId` is set, prefer that element.
 */
export function extractSvgPathDFromMarkup(svg: string, pathId?: string): string | null {
  if (!svg?.trim()) return null
  const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  if (pathId?.trim()) {
    const idEsc = pathId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re1 = new RegExp(
      `<path\\b[^>]*id=["']${idEsc}["'][^>]*\\bd=["']([^"']+)["']`,
      'i',
    )
    let m = svg.match(re1)
    if (m) return decode(m[1])
    const re2 = new RegExp(
      `<path\\b[^>]*d=["']([^"']+)["'][^>]*id=["']${idEsc}["']`,
      'i',
    )
    m = svg.match(re2)
    if (m) return decode(m[1])
  }
  const m3 = svg.match(/<path\b[^>]*\bd=["']([^"']+)["']/i)
  return m3 ? decode(m3[1]) : null
}

export function parseSvgViewBox(svg: string): { minX: number; minY: number; w: number; h: number } | null {
  const m = svg.match(/viewBox\s*=\s*["']([^"']+)["']/i)
  if (!m) return null
  const parts = m[1].trim().split(/[\s,]+/).map(parseFloat)
  if (parts.length < 4 || parts.some((x) => Number.isNaN(x))) return null
  return { minX: parts[0], minY: parts[1], w: parts[2], h: parts[3] }
}

/** Scale centered point cloud so max half-extent equals `targetRadius`. */
export function normalizePointsToBounds(points: Point[], targetRadius = 100): Point[] {
  if (points.length === 0) return []
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const rw = (maxX - minX) / 2 || 1
  const rh = (maxY - minY) / 2 || 1
  const r = Math.max(rw, rh)
  const scale = targetRadius / r
  return points.map((p) => new Point((p.x - cx) * scale, (p.y - cy) * scale))
}

/**
 * Duplicate points proportional to relative weights (same length as points). Used before resampling.
 */
export function replicatePointsByWeights(points: Point[], weights: number[]): Point[] {
  if (!weights.length || weights.length !== points.length) return points
  let maxW = 0
  for (const w of weights) {
    if (w > maxW) maxW = w
  }
  if (maxW < 1e-8) return points
  const out: Point[] = []
  for (let i = 0; i < points.length; i++) {
    const reps = Math.max(1, Math.round((weights[i] / maxW) * 8))
    for (let r = 0; r < reps; r++) {
      out.push(new Point(points[i].x, points[i].y))
    }
  }
  return out
}

export interface MorphKeyframe {
  /** Normalized time 0–1 along the morph timeline */
  t: number
  morphBlend: number
}

/**
 * Piecewise-linear blend value from sorted keyframes.
 */
export function sampleMorphKeyframes(keyframes: MorphKeyframe[], u: number): number {
  if (!keyframes.length) return 0
  const ku = Math.max(0, Math.min(1, u))
  const sorted = [...keyframes].sort((a, b) => a.t - b.t)
  if (sorted.length === 1) return sorted[0].morphBlend
  if (ku <= sorted[0].t) return sorted[0].morphBlend
  const last = sorted[sorted.length - 1]
  if (ku >= last.t) return last.morphBlend
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]
    if (ku >= a.t && ku <= b.t) {
      const span = b.t - a.t
      const local = span < 1e-8 ? 0 : (ku - a.t) / span
      return a.morphBlend + (b.morphBlend - a.morphBlend) * local
    }
  }
  return last.morphBlend
}

function weightedSampleIndices(weights: number[], count: number): number[] {
  const n = weights.length
  if (n === 0 || count <= 0) return []
  let total = 0
  for (const w of weights) total += w
  if (total < 1e-12) {
    return Array.from({ length: count }, (_, k) => Math.min(n - 1, k % n))
  }
  const cum: number[] = []
  let c = 0
  for (let i = 0; i < n; i++) {
    c += weights[i] / total
    cum.push(c)
  }
  const out: number[] = []
  for (let k = 0; k < count; k++) {
    const t = (k + 0.5) / count
    let lo = 0
    let hi = cum.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (cum[mid] < t) lo = mid + 1
      else hi = mid
    }
    out.push(lo)
  }
  return out
}

/**
 * Like {@link rasterizeOpaquePixelsToPoints} but biases samples toward higher alpha (importance).
 */
export function rasterizeOpaquePixelsToPointsWeighted(
  imageData: ImageData,
  maxCount: number,
  alphaThreshold = 128,
): Point[] {
  const { width: w, height: h, data } = imageData
  if (w <= 0 || h <= 0) return []
  let minX = w
  let minY = h
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (data[i + 3] > alphaThreshold) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < minX) return []
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const collected: Point[] = []
  const weights: number[] = []
  const maxRaw = Math.max(maxCount * 4, 4000)
  const bboxArea = (maxX - minX + 1) * (maxY - minY + 1)
  const step = Math.max(1, Math.ceil(Math.sqrt(bboxArea / maxRaw)))
  for (let y = minY; y <= maxY; y += step) {
    for (let x = minX; x <= maxX; x += step) {
      const i = (Math.floor(y) * w + Math.floor(x)) * 4
      const a = data[i + 3]
      if (a > alphaThreshold) {
        collected.push(new Point(x - cx, y - cy))
        weights.push(a / 255)
      }
    }
  }
  if (collected.length === 0) return []
  if (collected.length <= maxCount) return collected
  const idx = weightedSampleIndices(weights, maxCount)
  return idx.map((i) => new Point(collected[i].x, collected[i].y))
}

/**
 * Weighted importance sampling with RGB (for imageMatchParticleColors).
 */
export function rasterizeOpaquePixelsToPointsWithColorsWeighted(
  imageData: ImageData,
  maxCount: number,
  alphaThreshold = 128,
): PointRgb[] {
  const { width: w, height: h, data } = imageData
  if (w <= 0 || h <= 0) return []
  let minX = w
  let minY = h
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (data[i + 3] > alphaThreshold) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < minX) return []
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const collected: PointRgb[] = []
  const weights: number[] = []
  const maxRaw = Math.max(maxCount * 4, 4000)
  const bboxArea = (maxX - minX + 1) * (maxY - minY + 1)
  const step = Math.max(1, Math.ceil(Math.sqrt(bboxArea / maxRaw)))
  for (let y = minY; y <= maxY; y += step) {
    for (let x = minX; x <= maxX; x += step) {
      const ii = (Math.floor(y) * w + Math.floor(x)) * 4
      const a = data[ii + 3]
      if (a > alphaThreshold) {
        collected.push({
          x: x - cx,
          y: y - cy,
          r: data[ii],
          g: data[ii + 1],
          b: data[ii + 2],
        })
        weights.push(a / 255)
      }
    }
  }
  if (collected.length === 0) return []
  if (collected.length <= maxCount) return collected
  const idx = weightedSampleIndices(weights, maxCount)
  return idx.map((i) => collected[i])
}
