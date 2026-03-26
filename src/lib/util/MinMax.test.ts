import { describe, expect, it } from 'vitest'
import MinMax from './MinMax'

describe('MinMax', () => {
  it('set updates min and max', () => {
    const m = new MinMax(0, 0)
    m.set(1, 99)
    expect(m.min).toBe(1)
    expect(m.max).toBe(99)
  })

  it('copyFrom copies range', () => {
    const m = new MinMax()
    m.copyFrom({ min: -2, max: 5 })
    expect(m.min).toBe(-2)
    expect(m.max).toBe(5)
  })

  it('add sums both bounds', () => {
    const m = new MinMax(10, 100)
    m.add({ min: 1, max: 2 })
    expect(m.min).toBe(11)
    expect(m.max).toBe(102)
  })
})
