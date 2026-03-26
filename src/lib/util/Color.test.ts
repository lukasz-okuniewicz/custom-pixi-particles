import { describe, expect, it } from 'vitest'
import Color from './Color'

describe('Color', () => {
  it('hex getter packs RGB', () => {
    const c = new Color(0x12, 0x34, 0x56)
    expect(c.hex).toBe(0x123456)
  })

  it('hex setter unpacks RGB', () => {
    const c = new Color()
    c.hex = 0xaabbcc
    expect(c.r).toBe(0xaa)
    expect(c.g).toBe(0xbb)
    expect(c.b).toBe(0xcc)
  })

  it('copyFrom copies rgba', () => {
    const c = new Color()
    c.copyFrom({ r: 1, g: 2, b: 3, alpha: 0.5 })
    expect(c.r).toBe(1)
    expect(c.g).toBe(2)
    expect(c.b).toBe(3)
    expect(c.alpha).toBe(0.5)
  })

  it('add accumulates components', () => {
    const c = new Color(10, 20, 30, 0.1)
    c.add({ r: 1, g: 2, b: 3, alpha: 0.4 })
    expect(c.r).toBe(11)
    expect(c.g).toBe(22)
    expect(c.b).toBe(33)
    expect(c.alpha).toBeCloseTo(0.5)
  })
})
