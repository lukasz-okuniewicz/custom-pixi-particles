import { describe, expect, it, vi } from 'vitest'
import FormPatternBehaviour from './FormPatternBehaviour'
import Particle from '../Particle'
import List from '../util/List'

describe('FormPatternBehaviour update fast path', () => {
  it('skips _collectParticlesSorted on steady frame after initial assignment', () => {
    const fp = new FormPatternBehaviour()
    fp.active = true
    fp.enabled = true
    fp.patternMode = 'presetShape'
    fp.presetShape = 'circle'
    fp.pointBudget = 64

    const list = new List()
    for (let i = 0; i < 3; i++) {
      const p = new Particle()
      p.maxLifeTime = 100
      p.lifeTime = 0
      p.x = i * 10
      p.y = i * 5
      list.add(p)
    }
    fp.particleListGetter = () => list

    const spy = vi.spyOn(fp as any, '_collectParticlesSorted')

    fp.update(16)
    expect(spy).toHaveBeenCalledTimes(1)

    fp.update(16)
    expect(spy).toHaveBeenCalledTimes(1)

    fp.morphBlend = 0.5
    fp.update(16)
    expect(spy).toHaveBeenCalledTimes(2)

    spy.mockRestore()
  })

  it('runs full path when particle count changes', () => {
    const fp = new FormPatternBehaviour()
    fp.active = true
    fp.enabled = true
    fp.patternMode = 'presetShape'
    fp.presetShape = 'circle'
    fp.pointBudget = 64

    const list = new List()
    const p0 = new Particle()
    p0.maxLifeTime = 100
    p0.lifeTime = 0
    p0.x = 0
    p0.y = 0
    list.add(p0)
    fp.particleListGetter = () => list

    const spy = vi.spyOn(fp as any, '_collectParticlesSorted')
    fp.update(16)
    fp.update(16)
    expect(spy).toHaveBeenCalledTimes(1)

    const p1 = new Particle()
    p1.maxLifeTime = 100
    p1.lifeTime = 0
    p1.x = 1
    p1.y = 1
    list.add(p1)
    fp.update(16)
    expect(spy).toHaveBeenCalledTimes(2)

    spy.mockRestore()
  })
})
