import { describe, expect, it } from 'vitest'
import Point from './Point'

describe('Point', () => {
  it('set updates x and y', () => {
    const p = new Point(1, 2)
    p.set(9, 8)
    expect(p.x).toBe(9)
    expect(p.y).toBe(8)
  })

  it('set with undefined y preserves y', () => {
    const p = new Point(1, 2)
    p.set(9, undefined as unknown as number)
    expect(p.x).toBe(9)
    expect(p.y).toBe(2)
  })

  it('copyFrom copies coordinates', () => {
    const p = new Point()
    p.copyFrom({ x: 3, y: 4 })
    expect(p.x).toBe(3)
    expect(p.y).toBe(4)
  })

  it('add adds coordinates', () => {
    const p = new Point(10, 20)
    p.add({ x: 1, y: -5 })
    expect(p.x).toBe(11)
    expect(p.y).toBe(15)
  })
})
