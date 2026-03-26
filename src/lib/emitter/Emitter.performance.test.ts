import { describe, expect, it } from 'vitest'
import Emitter from './Emitter'
import Model from '../Model'
import Particle from '../Particle'
import EmitterBehaviours from '../behaviour/EmitterBehaviours'
import Behaviour from '../behaviour/Behaviour'
import RVOAvoidanceBehaviour from '../behaviour/RVOAvoidanceBehaviour'
import PhaseCoherenceBehaviour from '../behaviour/PhaseCoherenceBehaviour'
import CurvatureFlowBehaviour from '../behaviour/CurvatureFlowBehaviour'
import TurbulenceBehaviour from '../behaviour/TurbulenceBehaviour'

class DisabledInitProbe extends Behaviour {
  enabled = false
  initCalls = 0
  init() {
    this.initCalls += 1
  }
  apply() {
    /**/
  }
  getName() {
    return 'DisabledInitProbeBehaviour'
  }
  getProps() {
    return { enabled: this.enabled, priority: 0, name: this.getName() }
  }
}

/**
 * Smoke test for the synchronous update path and opt-in per-particle UPDATE events.
 */
describe('Emitter performance-related API', () => {
  it('does not emit per-particle UPDATE when enablePerParticleUpdateEvents is false', () => {
    const model = new Model()
    const emitter = new Emitter(model)
    emitter.play()
    let updateCount = 0
    emitter.on(Emitter.UPDATE, () => {
      updateCount += 1
    })

    const p = emitter.list.add(new Particle())
    p.maxLifeTime = 10
    p.lifeTime = 0
    p.sprite = {} as any
    emitter['updateParticle'](p, 16)

    expect(updateCount).toBe(0)
  })

  it('emits per-particle UPDATE when enablePerParticleUpdateEvents is true', () => {
    const model = new Model()
    const emitter = new Emitter(model)
    emitter.enablePerParticleUpdateEvents = true
    emitter.play()
    let updateCount = 0
    emitter.on(Emitter.UPDATE, () => {
      updateCount += 1
    })

    const p = emitter.list.add(new Particle())
    p.maxLifeTime = 10
    p.lifeTime = 0
    p.sprite = {} as any
    emitter['updateParticle'](p, 16)

    expect(updateCount).toBe(1)
  })

  it('update() is synchronous (no Promise return)', () => {
    const model = new Model()
    const emitter = new Emitter(model)
    emitter.play()
    const ret = emitter.update(16)
    expect(ret).toBeUndefined()
  })

  it('runs many frames of update on a modest particle count without throwing', () => {
    const model = new Model()
    const emitter = new Emitter(model)
    emitter.play()
    const n = 200
    for (let i = 0; i < n; i++) {
      const p = new Particle()
      p.maxLifeTime = 999
      p.lifeTime = 0
      p.sprite = {} as any
      emitter.list.add(p)
    }
    const t0 = performance.now()
    for (let f = 0; f < 50; f++) {
      emitter.update(16)
    }
    const elapsed = performance.now() - t0
    expect(elapsed).toBeLessThan(5000)
    expect(emitter.list.length).toBe(n)
  })

  it('EmitterBehaviours.init skips disabled behaviours', () => {
    const model = new Model()
    const emitter = new Emitter(model)
    const eb = emitter.behaviours
    const probe = new DisabledInitProbe()
    eb.add(probe)
    const p = new Particle()
    eb.init(p, model, emitter.turbulencePool)
    expect(probe.initCalls).toBe(0)
    probe.enabled = true
    eb.invalidateEnabledApplySnapshot()
    eb.init(p, model, emitter.turbulencePool)
    expect(probe.initCalls).toBe(1)
  })

  it('EmitterBehaviours.structureRevision bumps on list mutations', () => {
    const eb = new EmitterBehaviours()
    const a = new DisabledInitProbe()
    a.enabled = true
    expect(eb.structureRevision).toBe(0)
    eb.add(a)
    const afterAdd = eb.structureRevision
    expect(afterAdd).toBeGreaterThan(0)
    eb.removeByName(a.getName())
    expect(eb.structureRevision).toBeGreaterThan(afterAdd)
    const rev = eb.structureRevision
    eb.clear()
    expect(eb.structureRevision).toBeGreaterThan(rev)
  })

  it('runs many frames with RVO spatial path on moderate particle count without throwing', () => {
    const model = new Model()
    const turbPool = model as any
    const emitter = new Emitter(model)
    const rvo = new RVOAvoidanceBehaviour()
    rvo.particleListGetter = () => emitter.list
    emitter.behaviours.add(rvo)
    emitter.play()
    const n = 280
    for (let i = 0; i < n; i++) {
      const p = new Particle()
      p.maxLifeTime = 999
      p.lifeTime = 0
      p.movement.x = (i % 20) * 12
      p.movement.y = Math.floor(i / 20) * 12
      p.sprite = {} as any
      emitter.list.add(p)
    }
    const t0 = performance.now()
    for (let f = 0; f < 80; f++) {
      emitter.update(16)
    }
    const elapsed = performance.now() - t0
    expect(elapsed).toBeLessThan(8000)
    expect(emitter.list.length).toBe(n)
  })

  it('runs many frames with PhaseCoherence spatial path on moderate particle count without throwing', () => {
    const model = new Model()
    const emitter = new Emitter(model)
    const phase = new PhaseCoherenceBehaviour()
    phase.particleListGetter = () => emitter.list
    emitter.behaviours.add(phase)
    emitter.play()
    const n = 280
    for (let i = 0; i < n; i++) {
      const p = new Particle()
      p.maxLifeTime = 999
      p.lifeTime = 0
      p.movement.x = (i % 20) * 14
      p.movement.y = Math.floor(i / 20) * 14
      p.sprite = {} as any
      emitter.list.add(p)
      emitter.behaviours.init(p, model, emitter.turbulencePool)
    }
    const t0 = performance.now()
    for (let f = 0; f < 80; f++) {
      emitter.update(16)
    }
    const elapsed = performance.now() - t0
    expect(elapsed).toBeLessThan(8000)
    expect(emitter.list.length).toBe(n)
  })

  it('runs many frames with CurvatureFlow pooled grid without throwing', () => {
    const model = new Model()
    const emitter = new Emitter(model)
    const curv = new CurvatureFlowBehaviour()
    curv.particleListGetter = () => emitter.list
    emitter.behaviours.add(curv)
    emitter.play()
    const n = 200
    for (let i = 0; i < n; i++) {
      const p = new Particle()
      p.maxLifeTime = 999
      p.lifeTime = 0
      p.movement.x = (i % 16) * 10
      p.movement.y = Math.floor(i / 16) * 10
      p.sprite = {} as any
      emitter.list.add(p)
    }
    const t0 = performance.now()
    for (let f = 0; f < 60; f++) {
      emitter.update(16)
    }
    const elapsed = performance.now() - t0
    expect(elapsed).toBeLessThan(8000)
    expect(emitter.list.length).toBe(n)
  })

  it('rebuilds enabled-behaviour snapshot when invalidateEnabledApplySnapshot is called', () => {
    const model = new Model()
    const emitter = new Emitter(model)
    emitter.play()
    const probe = new DisabledInitProbe()
    probe.enabled = true
    emitter.behaviours.add(probe)
    emitter.update(16)
    const eb = emitter.behaviours as unknown as { enabledApplyList: { length: number } }
    expect(eb.enabledApplyList.length).toBe(1)
    probe.enabled = false
    emitter.behaviours.invalidateEnabledApplySnapshot()
    emitter.update(16)
    expect(eb.enabledApplyList.length).toBe(0)
  })

  it('runs many frames with TurbulenceBehaviour spatial vortex grid without throwing', () => {
    const model = new Model()
    const emitter = new Emitter(model)
    const turb = new TurbulenceBehaviour()
    ;(turb as { enabled?: boolean }).enabled = true
    turb.turbulencePool = emitter.turbulencePool
    turb.effect = 0
    emitter.behaviours.add(turb)
    for (let i = 0; i < 45; i++) {
      const v = new Particle()
      v.maxLifeTime = 999
      v.lifeTime = 0
      v.x = (i % 9) * 40
      v.y = Math.floor(i / 9) * 40
      v.size.x = 1
      v.size.y = 1
      v.velocity.x = 0
      v.velocity.y = 0
      emitter.turbulencePool.list.add(v)
    }
    emitter.play()
    const n = 120
    for (let i = 0; i < n; i++) {
      const p = new Particle()
      p.maxLifeTime = 999
      p.lifeTime = 0
      p.x = (i % 12) * 20
      p.y = Math.floor(i / 12) * 20
      p.sprite = {} as any
      emitter.list.add(p)
      emitter.behaviours.init(p, model, emitter.turbulencePool)
    }
    const t0 = performance.now()
    for (let f = 0; f < 72; f++) {
      emitter.update(16)
    }
    const elapsed = performance.now() - t0
    expect(elapsed).toBeLessThan(8000)
    expect(emitter.list.length).toBe(n)
  })
})
