import { describe, expect, it } from 'vitest'
import Particle from './Particle'

describe('Particle', () => {
  it('isDead when lifeTime >= maxLifeTime', () => {
    const p = new Particle()
    p.maxLifeTime = 10
    p.lifeTime = 9.99
    expect(p.isDead()).toBe(false)
    p.lifeTime = 10
    expect(p.isDead()).toBe(true)
  })

  it('isAlmostDead in the last 0.1 of lifetime', () => {
    const p = new Particle()
    p.maxLifeTime = 1
    p.lifeTime = 0.85
    expect(p.isAlmostDead()).toBe(false)
    p.lifeTime = 0.91
    expect(p.isAlmostDead()).toBe(true)
  })

  it('reset clears lifeTime and maxLifeTime (pool slot reads as dead at 0/0)', () => {
    const p = new Particle()
    p.maxLifeTime = 50
    p.lifeTime = 50
    expect(p.isDead()).toBe(true)
    p.reset()
    expect(p.lifeTime).toBe(0)
    expect(p.maxLifeTime).toBe(0)
    expect(p.isDead()).toBe(true)
  })

  it('hide sets visible false when sprite visible', () => {
    const p = new Particle()
    p.sprite = { visible: true } as any
    p.hide()
    expect((p.sprite as any).visible).toBe(false)
  })

  it('hide no-ops when sprite missing or already hidden', () => {
    const p = new Particle()
    p.sprite = null
    expect(() => p.hide()).not.toThrow()
    p.sprite = { visible: false } as any
    p.hide()
    expect((p.sprite as any).visible).toBe(false)
  })
})
