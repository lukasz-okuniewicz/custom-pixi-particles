import { describe, expect, it } from 'vitest'
import math from './maths'

describe('maths', () => {
  it('degreesToRadians converts 180 to π', () => {
    expect(math.degreesToRadians(180)).toBeCloseTo(Math.PI)
  })

  it('degreesToRadians converts 90 to π/2', () => {
    expect(math.degreesToRadians(90)).toBeCloseTo(Math.PI / 2)
  })
})
