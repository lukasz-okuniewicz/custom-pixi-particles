import { describe, expect, it } from 'vitest'
import ThereBack from './ThereBack'

describe('ThereBack', () => {
  it('defaults to empty strings', () => {
    const t = new ThereBack()
    expect(t.x).toBe('')
    expect(t.y).toBe('')
    expect(t.ease).toBe('')
  })

  it('set assigns and returns this', () => {
    const t = new ThereBack()
    const ret = t.set('a', 'b', 'c')
    expect(ret).toBe(t)
    expect(t.x).toBe('a')
    expect(t.y).toBe('b')
    expect(t.ease).toBe('c')
  })

  it('set uses empty string for falsy parts', () => {
    const t = new ThereBack()
    t.set(null as any, undefined as any, '' as any)
    expect(t.x).toBe('')
    expect(t.y).toBe('')
    expect(t.ease).toBe('')
  })

  it('copyFrom copies fields', () => {
    const t = new ThereBack()
    t.copyFrom({ x: '1', y: '2', ease: 'easeOut' })
    expect(t.x).toBe('1')
    expect(t.y).toBe('2')
    expect(t.ease).toBe('easeOut')
  })
})
