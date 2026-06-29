import { describe, expect, it } from 'vitest'
import {
  buildRoundedRectOutline,
  clampCornerRadii,
  isInsideRoundedRect,
  pointOnRoundedRectPerimeter,
} from './roundedRectGeometry'

describe('clampCornerRadii', () => {
  it('clamps adjacent radii that exceed box width', () => {
    const c = clampCornerRadii(50, 40, { topLeft: 80, topRight: 80, bottomLeft: 0, bottomRight: 0 })
    expect(c.topLeft + c.topRight).toBeLessThanOrEqual(100 + 1e-6)
  })

  it('preserves radii within limits', () => {
    const c = clampCornerRadii(100, 50, { topLeft: 10, topRight: 20, bottomLeft: 15, bottomRight: 25 })
    expect(c.topLeft).toBe(10)
    expect(c.topRight).toBe(20)
    expect(c.bottomLeft).toBe(15)
    expect(c.bottomRight).toBe(25)
  })
})

describe('isInsideRoundedRect', () => {
  const corners = { topLeft: 20, topRight: 20, bottomRight: 20, bottomLeft: 20 }

  it('accepts center point', () => {
    expect(isInsideRoundedRect(0, 0, 100, 60, corners)).toBe(true)
  })

  it('rejects corner cutout outside arc', () => {
    expect(isInsideRoundedRect(99, 59, 100, 60, corners)).toBe(false)
  })

  it('accepts point on straight edge', () => {
    expect(isInsideRoundedRect(0, -60, 100, 60, corners)).toBe(true)
  })

  it('rejects exterior notch in top-left corner', () => {
    expect(isInsideRoundedRect(-95, -55, 100, 60, corners)).toBe(false)
  })
})

describe('buildRoundedRectOutline', () => {
  it('returns closed loop', () => {
    const pts = buildRoundedRectOutline(50, 30, { topLeft: 10, topRight: 10, bottomRight: 10, bottomLeft: 10 }, 32)
    expect(pts.length).toBeGreaterThan(8)
    expect(pts[0].x).toBeCloseTo(pts[pts.length - 1].x)
    expect(pts[0].y).toBeCloseTo(pts[pts.length - 1].y)
  })

  it('has no long chords skipping rounded corners', () => {
    const corners = { topLeft: 50, topRight: 50, bottomRight: 50, bottomLeft: 50 }
    const pts = buildRoundedRectOutline(250, 250, corners, 96)
    for (let i = 1; i < pts.length; i++) {
      const len = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
      expect(len).toBeLessThan(80)
    }
  })
})

describe('pointOnRoundedRectPerimeter', () => {
  it('is continuous at t=0 and t=1', () => {
    const corners = { topLeft: 15, topRight: 15, bottomRight: 15, bottomLeft: 15 }
    const p0 = pointOnRoundedRectPerimeter(0, 80, 50, corners)
    const p1 = pointOnRoundedRectPerimeter(1, 80, 50, corners)
    expect(p0.x).toBeCloseTo(p1.x, 1)
    expect(p0.y).toBeCloseTo(p1.y, 1)
  })

  it('places point on top edge for small t on uniform rect', () => {
    const p = pointOnRoundedRectPerimeter(0.01, 100, 50, { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 })
    expect(p.y).toBeCloseTo(-50, 0)
    expect(Math.abs(p.x)).toBeLessThanOrEqual(100)
  })

  it('covers top-left corner on edge emission path', () => {
    const corners = { topLeft: 50, topRight: 50, bottomRight: 50, bottomLeft: 50 }
    const hw = 250
    const hh = 250
    const cx = -hw + 50
    const cy = -hh + 50
    let onArc = 0
    for (let i = 0; i < 5000; i++) {
      const p = pointOnRoundedRectPerimeter(i / 5000, hw, hh, corners)
      const d = Math.hypot(p.x - cx, p.y - cy)
      if (Math.abs(d - 50) < 4) onArc++
    }
    expect(onArc).toBeGreaterThan(10)
  })

  it('covers top-left corner near t=1 (closing segment)', () => {
    const corners = { topLeft: 50, topRight: 50, bottomRight: 50, bottomLeft: 50 }
    const hw = 250
    const hh = 250
    const cx = -hw + 50
    const cy = -hh + 50
    let onArc = 0
    for (let i = 0; i < 500; i++) {
      const p = pointOnRoundedRectPerimeter(0.9 + (i / 500) * 0.1, hw, hh, corners)
      const d = Math.hypot(p.x - cx, p.y - cy)
      if (Math.abs(d - 50) < 4) onArc++
    }
    expect(onArc).toBeGreaterThan(5)
  })
})
