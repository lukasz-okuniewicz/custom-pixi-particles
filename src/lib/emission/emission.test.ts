import { describe, expect, it, vi, afterEach } from 'vitest'
import AbstractEmission from './AbstractEmission'
import StandardEmission from './StandardEmission'
import UniformEmission from './UniformEmission'
import RandomEmission from './RandomEmission'
import PersistentFillEmission from './PersistentFillEmission'
import BurstScheduleEmission from './BurstScheduleEmission'
import CurveEmission from './CurveEmission'
import { EmissionRegistry } from './EmissionRegistry'
import * as util from '../util'
import Emitter from '../emitter/Emitter'
import Model from '../Model'

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

  it('supports deterministic seeded emission', () => {
    const r = new RandomEmission()
    r.maxParticles = 100
    r.emissionRate = 20
    ;(r as any)._seed = 42
    r.reset()

    const first = r.howMany(0.5, 0)
    const second = r.howMany(0.5, 0)

    r.reset()
    expect(r.howMany(0.5, 0)).toBe(first)
    expect(r.howMany(0.5, 0)).toBe(second)
  })
})

describe('BurstScheduleEmission', () => {
  it('emits burst on cadence and respects capacity', () => {
    const b = new BurstScheduleEmission()
    b._maxParticles = 50
    b._burstCount = 10
    b._cooldown = 0.5
    b._jitter = 0
    b.reset()

    expect(b.howMany(0.1, 0)).toBe(10)
    expect(b.howMany(0.1, 0)).toBe(0)
    expect(b.howMany(0.4, 0)).toBe(10)
    expect(b.howMany(0.5, 45)).toBe(5)
  })
})

describe('CurveEmission', () => {
  it('samples curve rate and accumulates emissions', () => {
    const c = new CurveEmission()
    c._maxParticles = 100
    c._duration = 1
    c._curve = [
      [0, 0],
      [0.5, 20],
      [1, 0],
    ]
    c.validate()

    expect(c.howMany(0.25, 0)).toBe(2)
    expect(c.howMany(0.25, 0)).toBe(5)
  })
})

describe('EmissionRegistry + parser integration', () => {
  it('creates custom emission from registry', () => {
    class CustomEmission extends AbstractEmission {
      _maxParticles = 10
      _customRate = 0
      howMany() {
        return 0
      }
      getName() {
        return 'CustomEmission'
      }
    }
    EmissionRegistry.register('CustomEmission', CustomEmission as any)

    const model = new Model()
    const emitter = new Emitter(model)
    const parser = emitter.getParser()
    parser.read(
      {
        behaviours: [],
        emitController: {
          name: 'CustomEmission',
          _maxParticles: 20,
          _customRate: 7,
        },
        duration: 1,
      },
      model,
    )

    expect(emitter.emitController.getName()).toBe('CustomEmission')
    expect((emitter.emitController as any)._customRate).toBe(7)
    EmissionRegistry.unregister('CustomEmission')
  })

  it('swaps emit controller class during update when name changes', () => {
    const model = new Model()
    const emitter = new Emitter(model)
    const parser = emitter.getParser()

    parser.read(
      {
        behaviours: [],
        emitController: {
          name: 'UniformEmission',
          _maxParticles: 20,
          _emitPerSecond: 10,
        },
        duration: 1,
      },
      model,
    )
    expect(emitter.emitController).toBeInstanceOf(UniformEmission)

    parser.update(
      {
        behaviours: [],
        emitController: {
          name: 'RandomEmission',
          _maxParticles: 20,
          _emissionRate: 15,
        },
        duration: 1,
      },
      model,
      false,
    )
    expect(emitter.emitController).toBeInstanceOf(RandomEmission)
    expect((emitter.emitController as RandomEmission).emissionRate).toBe(15)
  })
})
