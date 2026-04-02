import { describe, expect, it } from 'vitest'
import LifeBehaviour from './LifeBehaviour'
import SizeBehaviour from './SizeBehaviour'
import Particle from '../Particle'

describe('SizeBehaviour', () => {
  it('eases size start→end→start on repeat when life is infinite (no jump at phase wrap)', () => {
    const life = new LifeBehaviour()
    life.maxLifeTime = -1
    life.infiniteLifeVisualPeriod = 4
    life.timeVariance = 0

    const size = new SizeBehaviour()
    size.sizeStart.set(10, 10)
    size.sizeEnd.set(100, 100)
    size.maxSize.set(200, 200)

    const p = new Particle()
    life.init(p)
    size.init(p)

    life.apply(p, 2)
    size.apply(p, 0)
    expect(p.lifeProgress).toBeCloseTo(0.5, 5)
    expect(p.size.x).toBeCloseTo(100, 5)

    life.apply(p, 2)
    expect(p.lifeProgress).toBe(0)
    size.apply(p, 0)
    expect(p.size.x).toBeCloseTo(10, 5)

    life.apply(p, 4)
    expect(p.lifeTime).toBe(8)
    size.apply(p, 0)
    expect(p.size.x).toBeCloseTo(10, 5)
  })
})
