import { describe, expect, it } from 'vitest'
import Particle from '../Particle'
import { getToroidalEdgeExtents, wrapToroidalAxis } from './toroidalWrapExtents'

describe('wrapToroidalAxis', () => {
  it('does not wrap while any part of the particle would still be visible', () => {
    const result = wrapToroidalAxis(95, 95, 0, 100, 10, 10, -1)
    expect(result.position).toBe(95)
    expect(result.movement).toBe(95)
  })

  it('wraps from the left only after the trailing edge clears min', () => {
    const result = wrapToroidalAxis(-11, -11, 0, 100, 10, 10, -1)
    expect(result.position).toBe(111)
    expect(result.movement).toBe(111)
  })

  it('wraps from the right only after the leading edge clears max', () => {
    const result = wrapToroidalAxis(111, 111, 0, 100, 10, 10, 1)
    expect(result.position).toBe(-11)
    expect(result.movement).toBe(-11)
  })

  it('does not immediately re-wrap after teleporting to the opposite overflow zone', () => {
    const result = wrapToroidalAxis(-11, -11, 0, 100, 10, 10, 1)
    expect(result.position).toBe(-11)
    expect(result.movement).toBe(-11)
  })

  it('supports asymmetric extents for non-centered anchors', () => {
    const exitLeft = wrapToroidalAxis(-25, -25, 0, 100, 0, 20, -1)
    expect(exitLeft.position).toBe(105)
    expect(exitLeft.position - 0).toBeGreaterThan(100)

    const exitRight = wrapToroidalAxis(110, 110, 0, 100, 0, 20, 1)
    expect(exitRight.position).toBe(-30)
    expect(exitRight.position + 20).toBeLessThan(0)
  })
})

describe('getToroidalEdgeExtents', () => {
  it('falls back to particle size when sprite is missing', () => {
    const particle = new Particle()
    particle.size.set(4, 6)
    expect(getToroidalEdgeExtents(particle)).toEqual({
      left: 3,
      right: 3,
      top: 3,
      bottom: 3,
    })
  })
})
