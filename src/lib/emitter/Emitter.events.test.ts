import { describe, expect, it, vi, afterEach } from 'vitest'
import Emitter from './Emitter'
import Model from '../Model'
import Particle from '../Particle'

describe('Emitter events', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('reset emits RESET', () => {
    const emitter = new Emitter(new Model())
    const heard: string[] = []
    emitter.on(Emitter.RESET, () => heard.push('reset'))
    emitter.reset()
    expect(heard).toEqual(['reset'])
  })

  it('stop emits STOP', () => {
    const emitter = new Emitter(new Model())
    emitter.play()
    const heard: string[] = []
    emitter.on(Emitter.STOP, () => heard.push('stop'))
    emitter.stop()
    expect(heard).toEqual(['stop'])
  })

  it('removeParticle emits REMOVE', () => {
    const emitter = new Emitter(new Model())
    emitter.play()
    const p = emitter.list.add(new Particle())
    const removed: Particle[] = []
    emitter.on(Emitter.REMOVE, (particle: Particle) => removed.push(particle))
    p.maxLifeTime = 1
    p.lifeTime = 2
    emitter['updateParticle'](p, 16)
    expect(removed).toEqual([p])
    expect(emitter.list.isEmpty()).toBe(true)
  })

  it('emits FINISHING when particle is almost dead', () => {
    const emitter = new Emitter(new Model())
    emitter.play()
    const p = emitter.list.add(new Particle())
    p.maxLifeTime = 1
    p.lifeTime = 0.95
    p.sprite = {} as any
    const finishing: Particle[] = []
    emitter.on(Emitter.FINISHING, (particle: Particle) => finishing.push(particle))
    emitter['updateParticle'](p, 0)
    expect(finishing).toEqual([p])
  })

  it('emits COMPLETE after duration elapsed and list empty (async)', () => {
    vi.useFakeTimers()
    const emitter = new Emitter(new Model())
    emitter.play()
    emitter.duration.maxTime = 50
    const complete: string[] = []
    emitter.on(Emitter.COMPLETE, () => complete.push('done'))

    emitter.update(100)
    expect(emitter.list.isEmpty()).toBe(true)
    expect(complete).toEqual([])
    vi.runAllTimers()
    expect(complete).toEqual(['done'])
  })

  it('removes particle early when killAtProgress threshold is reached', () => {
    const emitter = new Emitter(new Model())
    emitter.play()
    const p = emitter.list.add(new Particle())
    p.maxLifeTime = 10
    p.lifeTime = 1
    p.lifeProgress = 0.6
    p.killAtProgress = 0.5
    p.sprite = {} as any
    const removed: Particle[] = []
    emitter.on(Emitter.REMOVE, (particle: Particle) => removed.push(particle))
    emitter['updateParticle'](p, 0)
    expect(removed).toEqual([p])
    expect(emitter.list.isEmpty()).toBe(true)
  })
})
