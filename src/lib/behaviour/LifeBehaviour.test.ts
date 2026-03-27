import { describe, expect, it } from 'vitest'
import LifeBehaviour from './LifeBehaviour'
import TimelineBehaviour from './TimelineBehaviour'
import Particle from '../Particle'

describe('LifeBehaviour', () => {
  it('keeps default finite life behavior parity', () => {
    const b = new LifeBehaviour()
    b.maxLifeTime = 2
    b.timeVariance = 0

    const p = new Particle()
    b.init(p)
    b.apply(p, 1)

    expect(p.lifeTime).toBe(1)
    expect(p.lifeProgress).toBe(0.5)
  })

  it('supports start delay and time scale', () => {
    const b = new LifeBehaviour()
    b.maxLifeTime = 2
    b.startDelay = 0.5
    b.timeScale = 2
    b.timeVariance = 0
    b.startDelayVariance = 0
    b.timeScaleVariance = 0

    const p = new Particle()
    b.init(p)
    b.apply(p, 0.25)
    expect(p.lifeTime).toBe(0)
    expect(p.lifeProgress).toBe(0)

    b.apply(p, 0.5)
    expect(p.lifeTime).toBe(0.5)
    expect(p.lifeProgress).toBe(0.25)
  })

  it('supports progressMode loop and pingPong', () => {
    const loop = new LifeBehaviour()
    loop.maxLifeTime = 1
    loop.progressMode = 'loop'
    const pLoop = new Particle()
    loop.init(pLoop)
    loop.apply(pLoop, 1.2)
    expect(pLoop.lifeProgress).toBeCloseTo(0.2, 5)

    const ping = new LifeBehaviour()
    ping.maxLifeTime = 1
    ping.progressMode = 'pingPong'
    const pPing = new Particle()
    ping.init(pPing)
    ping.apply(pPing, 1.2)
    expect(pPing.lifeProgress).toBeCloseTo(0.8, 5)
  })

  it('supports infinite life visual phase offset', () => {
    const b = new LifeBehaviour()
    b.maxLifeTime = -1
    b.timeVariance = 0
    b.infiniteLifeVisualPeriod = 4
    b.infiniteLifePhaseOffset = 0

    const p = new Particle()
    b.init(p)
    p.infiniteLifePhaseOffsetSeconds = 1
    b.apply(p, 0.1)

    expect(p.maxLifeTime).toBe(Infinity)
    expect(p.lifeProgress).toBeCloseTo(0.275, 5)
  })
})

describe('TimelineBehaviour with infinite life opt-in', () => {
  it('uses lifeProgress for infinite lifetime when enabled by life behaviour', () => {
    const p = new Particle()
    p.maxLifeTime = Infinity
    p.lifeTime = 10
    p.lifeProgress = 0.5
    p.timelineUseLifeProgressForInfinite = true

    const timeline = new TimelineBehaviour()
    timeline.timeline = [
      { time: 0, properties: { size: 10 } },
      { time: 1, properties: { size: 20 } },
    ]
    timeline.apply(p, 0)

    expect(p.size.x).toBe(15)
    expect(p.size.y).toBe(15)
  })
})
