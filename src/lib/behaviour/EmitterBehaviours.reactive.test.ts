import { describe, expect, it } from 'vitest'
import EmitterBehaviours from './EmitterBehaviours'
import Model from '../Model'

function makeBaseBehaviour(name: string) {
  return {
    enabled: true,
    priority: 0,
    getName: () => name,
    getParser: () => ({}) as any,
    getProps: () => ({ enabled: true, priority: 0, name }),
    init: () => {},
    apply: () => {},
  }
}

describe('EmitterBehaviours reactive blending', () => {
  it('applies channel weight scaling in weightedMix', () => {
    const eb = new EmitterBehaviours()
    const model = new Model()
    const recursiveCfg = {
      ...makeBaseBehaviour('RecursiveFireworkBehaviour'),
      reactiveSourceBlendMode: 'weightedMix',
      reactiveSourceWeights: { soundReactive: 1, pulse: 0, beatPhaseLock: 0 },
      reactiveChannelWeights: { energy: 0.5, lowBand: 1, midBand: 1, highBand: 1, beat: 1, pulsePhase: 1, beatPhase: 1, beatPhaseToEnergy: 0 },
      reactiveEnvelopeAttackMs: 1,
      reactiveEnvelopeReleaseMs: 1,
    }
    const sound = {
      ...makeBaseBehaviour('SoundReactiveBehaviour'),
      analyser: { getByteFrequencyData: () => {} },
      frequencyData: new Uint8Array([255, 255, 255, 255]),
      isPlaying: true,
      beatSensitivity: 0.9,
      refreshFrequencyData: () => {},
    }
    eb.add(recursiveCfg as any)
    eb.add(sound as any)
    eb.update(16, model)
    expect(model.reactiveSignals.energy).toBeCloseTo(0.5, 2)
  })

  it('emits loudness/onset/flux and derived phases', () => {
    const eb = new EmitterBehaviours()
    const model = new Model()
    const recursiveCfg = {
      ...makeBaseBehaviour('RecursiveFireworkBehaviour'),
      reactiveSourceBlendMode: 'weightedMix',
      reactiveSourceWeights: { soundReactive: 1, pulse: 0, beatPhaseLock: 0 },
      reactiveEnvelopeAttackMs: 1,
      reactiveEnvelopeReleaseMs: 1,
    }
    const sound = {
      ...makeBaseBehaviour('SoundReactiveBehaviour'),
      analyser: { getByteFrequencyData: () => {} },
      frequencyData: new Uint8Array([10, 20, 30, 40]),
      isPlaying: true,
      beatSensitivity: 0.9,
      refreshFrequencyData: () => {},
    }
    eb.add(recursiveCfg as any)
    eb.add(sound as any)
    eb.update(16, model)
    expect(model.reactiveSignals.loudness).toBeGreaterThan(0)
    expect(model.reactiveSignals.onset).toBeGreaterThanOrEqual(0)
    expect(model.reactiveSignals.flux).toBeGreaterThanOrEqual(0)
    expect(model.reactiveSignals.phase1x).toBeGreaterThanOrEqual(0)
    expect(model.reactiveSignals.phase1x).toBeLessThanOrEqual(1)
  })

  it('decimates sound updates when reactiveSoundUpdateEveryNFrames > 1', () => {
    const eb = new EmitterBehaviours()
    const model = new Model()
    const recursiveCfg: any = {
      ...makeBaseBehaviour('RecursiveFireworkBehaviour'),
      reactiveSoundUpdateEveryNFrames: 3,
      reactiveEnvelopeAttackMs: 1,
      reactiveEnvelopeReleaseMs: 1,
    }
    let refreshCalls = 0
    const sound: any = {
      ...makeBaseBehaviour('SoundReactiveBehaviour'),
      analyser: { getByteFrequencyData: () => {} },
      frequencyData: new Uint8Array([255, 255, 255, 255]),
      isPlaying: true,
      beatSensitivity: 0.9,
      refreshFrequencyData: () => {
        refreshCalls += 1
      },
    }
    eb.add(recursiveCfg as any)
    eb.add(sound as any)
    eb.update(16, model)
    eb.update(16, model)
    eb.update(16, model)
    expect(refreshCalls).toBe(1)
  })

  it('respects priority order when multiple sources are active', () => {
    const eb = new EmitterBehaviours()
    const model = new Model()
    const recursiveCfg = {
      ...makeBaseBehaviour('RecursiveFireworkBehaviour'),
      reactiveSourceBlendMode: 'priority',
      reactiveSourcePriority: ['pulse', 'soundReactive', 'beatPhaseLock'],
    }
    const sound = {
      ...makeBaseBehaviour('SoundReactiveBehaviour'),
      analyser: { getByteFrequencyData: () => {} },
      frequencyData: new Uint8Array([200, 200, 200, 200]),
      isPlaying: true,
      beatSensitivity: 0.9,
      refreshFrequencyData: () => {},
    }
    const pulse = {
      ...makeBaseBehaviour('PulseBehaviour'),
      frequency: 1.3,
      _time: 100,
      amplitude: 1,
      phaseOffset: 0,
    }
    eb.add(recursiveCfg as any)
    eb.add(sound as any)
    eb.add(pulse as any)
    eb.update(16, model)
    expect(model.reactiveSignals.source).toBe('pulse')
    expect(model.reactiveSignals.pulsePhase).toBeGreaterThan(0)
  })
})
