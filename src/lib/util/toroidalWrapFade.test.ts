import { describe, expect, it } from 'vitest'
import {
  getToroidalFadeLead,
  shouldContinueToroidalFadeOnAxis,
  shouldStartToroidalFadeOnAxis,
  toroidalFadeDelta,
} from './toroidalWrapFade'

describe('toroidalFadeDelta', () => {
  it('returns full step when duration is zero', () => {
    expect(toroidalFadeDelta(1 / 60, 0)).toBe(1)
  })

  it('scales by delta over duration', () => {
    expect(toroidalFadeDelta(0.25, 0.25)).toBeCloseTo(1)
    expect(toroidalFadeDelta(1 / 60, 0.5)).toBeCloseTo(1 / 30)
  })
})

describe('getToroidalFadeLead', () => {
  it('caps velocity lead to half the axis span', () => {
    expect(getToroidalFadeLead(260, 2, 10, 10, 0, 100)).toBe(50)
  })
})

describe('shouldStartToroidalFadeOnAxis', () => {
  const min = 0
  const max = 100
  const leading = 10
  const trailing = 10

  it('returns true when exiting from inside and wrap would trigger', () => {
    expect(
      shouldStartToroidalFadeOnAxis(120, 50, min, max, leading, trailing, true, 0.25),
    ).toBe(true)
  })

  it('does not start fade for spawn-outside instant wrap', () => {
    expect(
      shouldStartToroidalFadeOnAxis(120, 50, min, max, leading, trailing, undefined, 0.25),
    ).toBe(false)
    expect(
      shouldStartToroidalFadeOnAxis(120, 50, min, max, leading, trailing, false, 0.25),
    ).toBe(false)
  })

  it('returns true when approaching max exit within fade lead', () => {
    expect(
      shouldStartToroidalFadeOnAxis(90, 80, min, max, leading, trailing, true, 0.25),
    ).toBe(true)
  })

  it('returns false when far from boundary', () => {
    expect(
      shouldStartToroidalFadeOnAxis(50, 40, min, max, leading, trailing, true, 0.25),
    ).toBe(false)
  })

  it('does not start fade at axis center when velocity lead exceeds span', () => {
    expect(
      shouldStartToroidalFadeOnAxis(50, 260, min, max, leading, trailing, true, 2),
    ).toBe(false)
  })
})

describe('shouldContinueToroidalFadeOnAxis', () => {
  const min = 0
  const max = 100
  const leading = 10
  const trailing = 10

  it('returns false when velocity reversed away from the boundary', () => {
    expect(
      shouldContinueToroidalFadeOnAxis(90, -80, min, max, leading, trailing, 0.25),
    ).toBe(false)
  })

  it('returns true while still approaching the boundary', () => {
    expect(
      shouldContinueToroidalFadeOnAxis(90, 80, min, max, leading, trailing, 0.25),
    ).toBe(true)
  })
})
