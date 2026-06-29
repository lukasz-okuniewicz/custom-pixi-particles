import Point from './Point'

export interface CornerRadii {
  topLeft: number
  topRight: number
  bottomRight: number
  bottomLeft: number
}

export const defaultCornerRadii = (): CornerRadii => ({
  topLeft: 0,
  topRight: 0,
  bottomRight: 0,
  bottomLeft: 0,
})

export function normalizeCornerRadii(corners?: Partial<CornerRadii> | null): CornerRadii {
  return {
    topLeft: Math.max(0, corners?.topLeft ?? 0),
    topRight: Math.max(0, corners?.topRight ?? 0),
    bottomRight: Math.max(0, corners?.bottomRight ?? 0),
    bottomLeft: Math.max(0, corners?.bottomLeft ?? 0),
  }
}

/** CSS-like clamp so adjacent corner radii do not exceed box dimensions. */
export function clampCornerRadii(hw: number, hh: number, corners: CornerRadii): CornerRadii {
  const w = Math.max(0, hw) * 2
  const h = Math.max(0, hh) * 2
  let { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl } = normalizeCornerRadii(corners)

  const scalePair = (a: number, b: number, max: number) => {
    const sum = a + b
    if (sum <= max || sum <= 0) return
    const s = max / sum
    a *= s
    b *= s
    return { a, b }
  }

  const top = scalePair(tl, tr, w)
  if (top) {
    tl = top.a
    tr = top.b
  }
  const bottom = scalePair(bl, br, w)
  if (bottom) {
    bl = bottom.a
    br = bottom.b
  }
  const left = scalePair(tl, bl, h)
  if (left) {
    tl = left.a
    bl = left.b
  }
  const right = scalePair(tr, br, h)
  if (right) {
    tr = right.a
    br = right.b
  }

  return { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl }
}

type PerimeterSegment = {
  length: number
  at: (u: number) => Point
}

function lineSegment(x0: number, y0: number, x1: number, y1: number): PerimeterSegment {
  const length = Math.hypot(x1 - x0, y1 - y0)
  return {
    length,
    at: (u) => new Point(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u),
  }
}

function arcSegment(cx: number, cy: number, r: number, startAngle: number, endAngle: number): PerimeterSegment {
  const length = Math.abs(endAngle - startAngle) * Math.max(0, r)
  return {
    length,
    at: (u) => {
      const a = startAngle + (endAngle - startAngle) * u
      return new Point(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
    },
  }
}

/** Clockwise perimeter from the top edge start (after the top-left arc). */
function buildPerimeterSegments(hw: number, hh: number, corners: CornerRadii): PerimeterSegment[] {
  const c = clampCornerRadii(hw, hh, corners)
  const { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl } = c
  const segments: PerimeterSegment[] = []

  segments.push(lineSegment(-hw + tl, -hh, hw - tr, -hh))
  if (tr > 0) segments.push(arcSegment(hw - tr, -hh + tr, tr, -Math.PI / 2, 0))
  segments.push(lineSegment(hw, -hh + tr, hw, hh - br))
  if (br > 0) segments.push(arcSegment(hw - br, hh - br, br, 0, Math.PI / 2))
  segments.push(lineSegment(hw - br, hh, -hw + bl, hh))
  if (bl > 0) segments.push(arcSegment(-hw + bl, hh - bl, bl, Math.PI / 2, Math.PI))
  segments.push(lineSegment(-hw, hh - bl, -hw, -hh + tl))
  if (tl > 0) segments.push(arcSegment(-hw + tl, -hh + tl, tl, Math.PI, Math.PI * 1.5))

  return segments.filter((s) => s.length > 1e-8)
}

function perimeterLength(segments: PerimeterSegment[]): number {
  return segments.reduce((sum, s) => sum + s.length, 0)
}

function pointAtPerimeterDistance(segments: PerimeterSegment[], dist: number): Point {
  if (segments.length === 0) return new Point(0, 0)
  let remaining = dist
  for (const seg of segments) {
    if (remaining <= seg.length + 1e-8) {
      return seg.at(seg.length > 1e-8 ? remaining / seg.length : 0)
    }
    remaining -= seg.length
  }
  return segments[0].at(0)
}

const perimeterCache = new Map<string, PerimeterSegment[]>()

function getPerimeterSegments(hw: number, hh: number, corners: CornerRadii): PerimeterSegment[] {
  const c = clampCornerRadii(hw, hh, corners)
  const key = `${hw}|${hh}|${c.topLeft}|${c.topRight}|${c.bottomRight}|${c.bottomLeft}`
  let segments = perimeterCache.get(key)
  if (!segments) {
    segments = buildPerimeterSegments(hw, hh, c)
    perimeterCache.set(key, segments)
  }
  return segments
}

/** Build a closed rounded-rect outline centered at origin (half extents hw, hh). */
export function buildRoundedRectOutline(hw: number, hh: number, corners: CornerRadii, segmentBudget = 64): Point[] {
  const count = Math.max(16, segmentBudget)
  const pts: Point[] = []
  for (let k = 0; k < count; k++) {
    pts.push(pointOnRoundedRectPerimeter(k / count, hw, hh, corners))
  }
  const first = pts[0]
  pts.push(new Point(first.x, first.y))
  return pts
}

export function isInsideRoundedRect(x: number, y: number, hw: number, hh: number, corners: CornerRadii): boolean {
  if (Math.abs(x) > hw || Math.abs(y) > hh) return false
  const c = clampCornerRadii(hw, hh, corners)
  const { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl } = c

  if (x >= -hw + tl && x <= hw - tr && y >= -hh && y <= hh) return true
  if (x >= -hw && x <= hw && y >= -hh + Math.max(tl, tr) && y <= hh - Math.max(bl, br)) return true

  const inCorner = (cx: number, cy: number, r: number) => {
    if (r <= 0) return false
    const dx = x - cx
    const dy = y - cy
    return dx * dx + dy * dy <= r * r
  }

  if (x < -hw + tl && y < -hh + tl) return inCorner(-hw + tl, -hh + tl, tl)
  if (x > hw - tr && y < -hh + tr) return inCorner(hw - tr, -hh + tr, tr)
  if (x > hw - br && y > hh - br) return inCorner(hw - br, hh - br, br)
  if (x < -hw + bl && y > hh - bl) return inCorner(-hw + bl, hh - bl, bl)

  return false
}

/** Point on perimeter; t in [0, 1), centered at origin. */
export function pointOnRoundedRectPerimeter(t: number, hw: number, hh: number, corners: CornerRadii): Point {
  const segments = getPerimeterSegments(hw, hh, corners)
  const total = perimeterLength(segments)
  if (total < 1e-8) return new Point(0, 0)
  const wrapped = ((t % 1) + 1) % 1
  return pointAtPerimeterDistance(segments, wrapped * total)
}

/** Random point inside rounded rect; optional bias t in [0,1] shrinks toward center. */
export function randomPointInsideRoundedRect(
  hw: number,
  hh: number,
  corners: CornerRadii,
  random: () => number,
  biasT = 1,
): Point {
  const c = clampCornerRadii(hw, hh, corners)
  for (let attempt = 0; attempt < 64; attempt++) {
    const x = (random() * 2 - 1) * hw
    const y = (random() * 2 - 1) * hh
    if (!isInsideRoundedRect(x, y, hw, hh, c)) continue
    const scale = biasT >= 1 ? 1 : Math.sqrt(Math.max(0, Math.min(1, biasT)))
    return new Point(x * scale, y * scale)
  }
  return new Point(0, 0)
}

/** Random point on perimeter. */
export function randomPointOnRoundedRectPerimeter(
  hw: number,
  hh: number,
  corners: CornerRadii,
  random: () => number,
): Point {
  return pointOnRoundedRectPerimeter(random(), hw, hh, corners)
}
