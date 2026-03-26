import { describe, expect, it, vi, afterEach } from 'vitest'
import AbstractEmission from './AbstractEmission'
import StandardEmission from './StandardEmission'
import UniformEmission from './UniformEmission'
import RandomEmission from './RandomEmission'
import PersistentFillEmission from './PersistentFillEmission'
import * as util from '../util'

describe('AbstractEmission', () => {
  it('howMany throws by default', () => {
    const a = new AbstractEmission()
    expect(() => a.howMany(1, 0)).toThrow('Abstract method')
  })

  it('getName throws by default', () => {
    const a = new AbstractEmission()
    expect(() => a.getName()).toThrow('overridden')
  })
})

describe('StandardEmission', () => {
  it('emits nothing when emissionRate is 0', () => {
    const s = new StandardEmission()
    s.maxParticles = 100
    s.emissionRate = 0
    expect(s.howMany(1, 0)).toBe(0)
  })

  it('emits particles proportional to delta time and caps at maxParticles', () => {
    const s = new StandardEmission()
    s.maxParticles = 100
    s.emissionRate = 10
    expect(s.howMany(1, 0)).toBe(10)
    expect(s.howMany(1, 95)).toBe(5)
    expect(s.howMany(1, 100)).toBe(0)
  })

  it('carries remainder counter across frames', () => {
    const s = new StandardEmission()
    s.maxParticles = 100
    s.emissionRate = 10
    expect(s.howMany(0.05, 0)).toBe(0)
    expect(s.howMany(0.06, 0)).toBe(1)
  })
})

describe('UniformEmission', () => {
  it('returns 0 when at maxParticles', () => {
    const u = new UniformEmission()
    u.maxParticles = 10
    u.emitPerSecond = 100
    expect(u.howMany(0.1, 10)).toBe(0)
  })

  it('emits from fractional accumulation (reset primes _frames)', () => {
    const u = new UniformEmission()
    u.maxParticles = 100
    u.emitPerSecond = 10
    u.reset()
    expect(u.howMany(0.15, 0)).toBe(2)
  })

  it('reset primes _frames so next tick can emit', () => {
    const u = new UniformEmission()
    u.maxParticles = 10
    u.emitPerSecond = 1
    u.reset()
    expect(u.howMany(0.001, 0)).toBeGreaterThanOrEqual(1)
  })
})

describe('PersistentFillEmission', () => {
  it('bursts up to burstPerFrame toward cap', () => {
    const p = new PersistentFillEmission()
    p.maxParticles = 100
    p.burstPerFrame = 30
    expect(p.howMany(16, 0)).toBe(30)
    expect(p.howMany(16, 90)).toBe(10)
    expect(p.howMany(16, 100)).toBe(0)
  })

  it('burstPerFrame floors and has minimum 1', () => {
    const p = new PersistentFillEmission()
    p.burstPerFrame = -5 as any
    expect(p.burstPerFrame).toBe(1)
    p.burstPerFrame = 3.7 as any
    expect(p.burstPerFrame).toBe(3)
  })
})

describe('RandomEmission', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 0 when at capacity', () => {
    const r = new RandomEmission()
    r.maxParticles = 5
    r.emissionRate = 100
    expect(r.howMany(1, 5)).toBe(0)
  })

  it('respects Random.uniform and capacity', () => {
    const r = new RandomEmission()
    r.maxParticles = 10
    r.emissionRate = 20
    vi.spyOn(util.Random, 'uniform').mockReturnValue(5)
    expect(r.howMany(1, 3)).toBe(5)
    vi.spyOn(util.Random, 'uniform').mockReturnValue(100)
    expect(r.howMany(1, 3)).toBe(7)
  })
})
