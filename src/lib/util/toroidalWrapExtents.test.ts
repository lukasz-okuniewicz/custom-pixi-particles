import { describe, expect, it } from 'vitest'
import Particle from '../Particle'
import {
  getToroidalEdgeExtents,
  isToroidalAxisFullyContained,
  isToroidalAxisViewportVisible,
  isToroidalViewportVisible,
  relocateToroidalAxisIntoViewport,
  wrapToroidalAxis,
} from './toroidalWrapExtents'

describe('isToroidalViewportVisible', () => {
  const bounds = { minX: 0, maxX: 100, minY: 0, maxY: 100 }
  const extents = { left: 10, right: 10, top: 10, bottom: 10 }

  it('is visible while any part overlaps the viewport', () => {
    expect(isToroidalViewportVisible(95, 50, extents, bounds, true, true)).toBe(true)
    expect(isToroidalViewportVisible(5, 50, extents, bounds, true, true)).toBe(true)
  })

  it('is hidden when fully outside on either wrapped axis', () => {
    expect(isToroidalViewportVisible(111, 50, extents, bounds, true, true)).toBe(false)
    expect(isToroidalViewportVisible(50, 111, extents, bounds, true, true)).toBe(false)
    expect(isToroidalViewportVisible(-11, 50, extents, bounds, true, true)).toBe(false)
    expect(isToroidalViewportVisible(50, -11, extents, bounds, true, true)).toBe(false)
  })
})

describe('wrapToroidalAxis', () => {
  it('does not wrap while any part of the particle would still be visible', () => {
    const result = wrapToroidalAxis(95, 95, 0, 100, 10, 10, true)
    expect(result.position).toBe(95)
    expect(result.movement).toBe(95)
    expect(result.inside).toBe(true)
  })

  it('wraps from the left only after the trailing edge clears min', () => {
    const result = wrapToroidalAxis(-11, -11, 0, 100, 10, 10, true)
    expect(result.position).toBe(111)
    expect(result.movement).toBe(111)
    expect(result.inside).toBe(false)
    expect(result.didWrap).toBe(true)
  })

  it('wraps from the right only after the leading edge clears max', () => {
    const result = wrapToroidalAxis(111, 111, 0, 100, 10, 10, true)
    expect(result.position).toBe(-11)
    expect(result.movement).toBe(-11)
    expect(result.inside).toBe(false)
  })

  it('wraps from the top only after the bottom edge clears minY', () => {
    const result = wrapToroidalAxis(-111, -111, -100, 100, 10, 10, true)
    expect(result.position).toBe(111)
    expect(result.movement).toBe(111)
    expect(result.inside).toBe(false)
  })

  it('wraps from the bottom only after the top edge clears maxY', () => {
    const result = wrapToroidalAxis(111, 111, -100, 100, 10, 10, true)
    expect(result.position).toBe(-111)
    expect(result.movement).toBe(-111)
    expect(result.inside).toBe(false)
  })

  it('does not immediately re-wrap after teleporting to the opposite overflow zone', () => {
    const first = wrapToroidalAxis(-11, -11, 0, 100, 10, 10, true)
    const second = wrapToroidalAxis(first.position, first.movement, 0, 100, 10, 10, first.inside)
    expect(second.position).toBe(111)
    expect(second.movement).toBe(111)
  })

  it('supports asymmetric extents for non-centered anchors', () => {
    const exitLeft = wrapToroidalAxis(-25, -25, 0, 100, 0, 20, true)
    expect(exitLeft.position).toBe(105)
    expect(exitLeft.position - 0).toBeGreaterThan(100)

    const exitRight = wrapToroidalAxis(110, 110, 0, 100, 0, 20, true)
    expect(exitRight.position).toBe(-30)
    expect(exitRight.position + 20).toBeLessThan(0)
  })
})

describe('relocateToroidalAxisIntoViewport', () => {
  const min = -100
  const max = 100
  const leading = 10
  const trailing = 10

  it('leaves in-viewport positions unchanged', () => {
    const result = relocateToroidalAxisIntoViewport(0, 0, min, max, leading, trailing)
    expect(result).toEqual({ position: 0, movement: 0, relocated: false })
  })

  it('modulo-maps spawn-outside positions into the wrap band', () => {
    const result = relocateToroidalAxisIntoViewport(-200, -200, min, max, leading, trailing)
    expect(result.relocated).toBe(true)
    expect(result.position).toBe(0)
    expect(result.movement).toBe(0)
    expect(isToroidalAxisViewportVisible(result.position, leading, trailing, min, max)).toBe(true)
  })

  it('maps positions above max into the wrap band', () => {
    const result = relocateToroidalAxisIntoViewport(250, 250, min, max, leading, trailing)
    expect(result.position).toBe(50)
    expect(isToroidalAxisViewportVisible(result.position, leading, trailing, min, max)).toBe(true)
  })

  it('re-clamps partially overlapping positions that are not fully contained', () => {
    const result = relocateToroidalAxisIntoViewport(80, 80, min, max, 60, 60)
    expect(result.relocated).toBe(true)
    expect(result.position).toBe(40)
    expect(isToroidalAxisFullyContained(result.position, 60, 60, min, max)).toBe(true)
  })

  it('centers oversized particles that cannot fully fit the band', () => {
    const result = relocateToroidalAxisIntoViewport(-200, -200, min, max, 120, 120)
    expect(result.relocated).toBe(true)
    expect(result.position).toBe(0)
    expect(isToroidalAxisViewportVisible(result.position, 120, 120, min, max)).toBe(true)
  })
})

describe('getToroidalEdgeExtents', () => {
  it('falls back to scaled particle size when sprite is missing', () => {
    const particle = new Particle()
    particle.size.set(4, 6)
    expect(getToroidalEdgeExtents(particle)).toEqual({
      left: 96,
      right: 96,
      top: 96,
      bottom: 96,
    })
  })
})
