import { describe, expect, it } from 'vitest'
import Point from './Point'
import { resampleToCount, subsamplePoints } from './formPatternSampling'

describe('resampleToCount', () => {
  it('returns empty for non-positive count or empty source', () => {
    expect(resampleToCount([], 5)).toEqual([])
    expect(resampleToCount([new Point(0, 0)], 0)).toEqual([])
  })

  it('replicates single point', () => {
    const out = resampleToCount([new Point(3, 4)], 4)
    expect(out).toHaveLength(4)
    expect(out.every((p) => p.x === 3 && p.y === 4)).toBe(true)
  })

  it('interpolates along open segment at arc-length fractions', () => {
    const out = resampleToCount([new Point(0, 0), new Point(10, 0)], 3)
    expect(out).toHaveLength(3)
    expect(out[0].x).toBeCloseTo(0)
    expect(out[1].x).toBeCloseTo(10 / 3)
    expect(out[2].x).toBeCloseTo(20 / 3)
    expect(out.every((p) => p.y === 0)).toBe(true)
  })

  it('treats closed ring when first equals last', () => {
    const square = [
      new Point(0, 0),
      new Point(10, 0),
      new Point(10, 10),
      new Point(0, 10),
      new Point(0, 0),
    ]
    const out = resampleToCount(square, 8)
    expect(out).toHaveLength(8)
  })
})

describe('subsamplePoints', () => {
  it('returns empty for bad inputs', () => {
    expect(subsamplePoints([], 3)).toEqual([])
    expect(subsamplePoints([new Point(0, 0)], 0)).toEqual([])
  })

  it('copies all when at or under cap', () => {
    const pts = [new Point(1, 1), new Point(2, 2)]
    const out = subsamplePoints(pts, 5)
    expect(out).toHaveLength(2)
    expect(out[0].x).toBe(1)
    expect(out[1].x).toBe(2)
  })

  it('reduces to maxCount evenly', () => {
    const pts = Array.from({ length: 10 }, (_, i) => new Point(i, 0))
    const out = subsamplePoints(pts, 3)
    expect(out).toHaveLength(3)
    expect(out[0].x).toBe(0)
    expect(out[2].x).toBe(9)
  })
})
