import Point from './Point'
import { resampleToCount } from './formPatternSampling'

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

function arcPoints(cx: number, cy: number, r: number, startAngle: number, endAngle: number, steps: number): Point[] {
  if (r <= 0 || steps <= 0) return []
  const pts: Point[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const a = startAngle + (endAngle - startAngle) * t
    pts.push(new Point(cx + Math.cos(a) * r, cy + Math.sin(a) * r))
  }
  return pts
}

function pushEdge(pts: Point[], x0: number, y0: number, x1: number, y1: number, steps: number) {
  for (let s = 0; s < steps; s++) {
    const t = steps <= 0 ? 0 : s / steps
    pts.push(new Point(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t))
  }
}

/** Build a closed rounded-rect outline centered at origin (half extents hw, hh). */
export function buildRoundedRectOutline(hw: number, hh: number, corners: CornerRadii, segmentBudget = 64): Point[] {
  const c = clampCornerRadii(hw, hh, corners)
  const { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl } = c
  const pts: Point[] = []

  const arcSeg = Math.max(4, Math.floor(segmentBudget / 8))
  const edgeSeg = Math.max(2, Math.floor(segmentBudget / 8))

  // Clockwise from top-left corner start on top edge
  pushEdge(pts, -hw + tl, -hh, hw - tr, -hh, edgeSeg)
  pts.push(...arcPoints(hw - tr, -hh + tr, tr, -Math.PI / 2, 0, arcSeg).slice(1))
  pushEdge(pts, hw, -hh + tr, hw, hh - br, edgeSeg)
  pts.push(...arcPoints(hw - br, hh - br, br, 0, Math.PI / 2, arcSeg).slice(1))
  pushEdge(pts, hw - br, hh, -hw + bl, hh, edgeSeg)
  pts.push(...arcPoints(-hw + bl, hh - bl, bl, Math.PI / 2, Math.PI, arcSeg).slice(1))
  pushEdge(pts, -hw, hh - bl, -hw, -hh + tl, edgeSeg)
  pts.push(...arcPoints(-hw + tl, -hh + tl, tl, Math.PI, Math.PI * 1.5, arcSeg).slice(1))

  if (pts.length === 0) {
    return buildRoundedRectOutline(hw, hh, defaultCornerRadii(), segmentBudget)
  }
  pts.push(new Point(pts[0].x, pts[0].y))
  return resampleToCount(pts, Math.max(16, segmentBudget))
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

  return true
}

function outlineArcLength(pts: Point[]): number {
  let total = 0
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x
    const dy = pts[i].y - pts[i - 1].y
    total += Math.sqrt(dx * dx + dy * dy)
  }
  return total
}

function pointAtArcLength(pts: Point[], dist: number): Point {
  if (pts.length === 0) return new Point(0, 0)
  if (pts.length === 1) return new Point(pts[0].x, pts[0].y)
  let acc = 0
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x
    const dy = pts[i].y - pts[i - 1].y
    const len = Math.sqrt(dx * dx + dy * dy)
    if (acc + len >= dist - 1e-8) {
      const u = len > 1e-8 ? (dist - acc) / len : 0
      return new Point(pts[i - 1].x + dx * u, pts[i - 1].y + dy * u)
    }
    acc += len
  }
  const last = pts[pts.length - 1]
  return new Point(last.x, last.y)
}

const outlineCache = new Map<string, Point[]>()

function getOutline(hw: number, hh: number, corners: CornerRadii): Point[] {
  const c = clampCornerRadii(hw, hh, corners)
  const key = `${hw}|${hh}|${c.topLeft}|${c.topRight}|${c.bottomRight}|${c.bottomLeft}`
  let pts = outlineCache.get(key)
  if (!pts) {
    pts = buildRoundedRectOutline(hw, hh, c, 96)
    outlineCache.set(key, pts)
  }
  return pts
}

/** Point on perimeter; t in [0, 1), centered at origin. */
export function pointOnRoundedRectPerimeter(t: number, hw: number, hh: number, corners: CornerRadii): Point {
  const outline = getOutline(hw, hh, corners)
  const closed = outline.length > 1 && outline[0].x === outline[outline.length - 1].x && outline[0].y === outline[outline.length - 1].y
  const open = closed ? outline.slice(0, -1) : outline
  const total = outlineArcLength(open)
  if (total < 1e-8) return new Point(0, 0)
  const wrapped = ((t % 1) + 1) % 1
  const dist = wrapped * total
  return pointAtArcLength(open, dist)
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
