import { describe, expect, it } from 'vitest'
import List from './List'

function node(id: string) {
  return { id, prev: null as any, next: null as any }
}

describe('List', () => {
  it('starts empty', () => {
    const list = new List()
    expect(list.isEmpty()).toBe(true)
    expect(list.length).toBe(0)
    expect(list.first).toBeNull()
  })

  it('add prepends so first is the newest item', () => {
    const list = new List()
    const a = node('a')
    const b = node('b')
    list.add(a)
    list.add(b)
    expect(list.length).toBe(2)
    expect(list.first).toBe(b)
    expect(b.next).toBe(a)
    expect(a.prev).toBe(b)
    expect(a.next).toBeNull()
    expect(b.prev).toBeNull()
  })

  it('forEach walks from first to tail', () => {
    const list = new List()
    list.add(node('x'))
    list.add(node('y'))
    const order: string[] = []
    list.forEach((n: { id: string }) => order.push(n.id))
    expect(order).toEqual(['y', 'x'])
  })

  it('remove updates links and length', () => {
    const list = new List()
    const a = node('a')
    const b = node('b')
    list.add(a)
    list.add(b)
    list.remove(b)
    expect(list.length).toBe(1)
    expect(list.first).toBe(a)
    expect(a.prev).toBeNull()
    expect(a.next).toBeNull()
    expect(b.prev).toBeNull()
    expect(b.next).toBeNull()
  })

  it('remove first item promotes next to first', () => {
    const list = new List()
    const a = node('a')
    const b = node('b')
    list.add(a)
    list.add(b)
    list.remove(b)
    expect(list.first).toBe(a)
  })

  it('remove middle item preserves order', () => {
    const list = new List()
    const a = node('a')
    const b = node('b')
    const c = node('c')
    list.add(a)
    list.add(b)
    list.add(c)
    list.remove(b)
    expect(list.length).toBe(2)
    expect(c.next).toBe(a)
    expect(a.prev).toBe(c)
  })

  it('reset clears list', () => {
    const list = new List()
    list.add(node('a'))
    list.reset()
    expect(list.isEmpty()).toBe(true)
    expect(list.length).toBe(0)
  })

  it('add clears prev/next on the inserted item', () => {
    const list = new List()
    const item: any = { id: 'i', prev: {}, next: {} }
    list.add(item)
    expect(item.prev).toBeNull()
    expect(item.next).toBeNull()
  })
})
