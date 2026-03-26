import { describe, expect, it } from 'vitest'
import ParticlePool from './ParticlePool'
import Particle from './Particle'

describe('ParticlePool (instance)', () => {
  it('pop on empty pool creates a new particle', () => {
    const pool = new ParticlePool()
    const p = pool.pop()
    expect(p).toBeInstanceOf(Particle)
    expect(pool.first).toBeNull()
  })

  it('push then pop returns the same particle', () => {
    const pool = new ParticlePool()
    const created = pool.pop()
    const uid = created.uid
    pool.push(created)
    const again = pool.pop()
    expect(again).toBe(created)
    expect(again.uid).toBe(uid)
  })

  it('pop unwinds stack order', () => {
    const pool = new ParticlePool()
    const a = pool.pop()
    const b = pool.pop()
    pool.push(a)
    pool.push(b)
    expect(pool.pop()).toBe(b)
    expect(pool.pop()).toBe(a)
  })
})
