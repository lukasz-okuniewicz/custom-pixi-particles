// src/lib/behaviour/EmitterBehaviours.ts
// tslint:disable:prefer-for-of

import type { IBehaviour } from './IBehaviour'
import Particle from '../Particle'
import Model from '../Model'
import TurbulencePool from '../util/turbulencePool'
import BehaviourNames from './BehaviourNames'

/**
 * EmitterBehaviours class manages the behaviour of particles.
 * Accepts built-in behaviours and custom behaviours that implement IBehaviour.
 */
export default class EmitterBehaviours {
  behaviours: IBehaviour[] = []
  /** Bumps when behaviours are added/removed/reordered so consumers can invalidate caches. */
  structureRevision = 0
  /**
   * Snapshot of enabled behaviours for the current frame; rebuilt when the emitter frame seq
   * or `structureRevision` changes. Avoids scanning disabled entries for every particle.
   */
  private enabledApplyList: IBehaviour[] = []
  private _enabledApplyPreparedForSeq = -1
  private _enabledApplyPreparedForStructureRev = -1
  /** Cached reactive sources for RecursiveFirework — avoids scanning all behaviours each frame. */
  private reactiveSoundBehaviours: IBehaviour[] = []
  private reactivePulseBehaviours: IBehaviour[] = []
  private reactiveBeatPhaseBehaviours: IBehaviour[] = []
  private behaviourByName = new Map<string, IBehaviour>()
  private cachedRecursiveFirework: IBehaviour | null = null
  private reactiveSourceMaskScratch: Array<'soundReactive' | 'pulse' | 'beatPhaseLock'> = []
  private lastSoundEnergy = 0
  private lastSoundBandSum = 0
  private env: Record<
    string,
    {
      value: number
    }
  > = {}

  /**
   * Gets all the enabled behaviours
   *
   * @return {any[]} The enabled behaviours
   */
  getAll = () => {
    return this.behaviours.filter((behaviour: IBehaviour) => {
      return behaviour.enabled
    })
  }

  /**
   * Called at the start of each {@link Emitter.update} after `_behaviourFrameSeq` is bumped.
   */
  prepareEnabledApplyListForFrame = (_model: Model, frameSeq: number) => {
    this.syncEnabledSnapshotsIfNeeded(frameSeq)
  }

  /**
   * Ensures `enabledApplyList` matches the current emitter frame (e.g. when `updateParticle`
   * is used without a full `update()` in tests).
   */
  ensureEnabledApplyList = (model: Model) => {
    const emitter = model.emitter as { _behaviourFrameSeq?: number } | undefined
    const frameSeq = emitter?._behaviourFrameSeq ?? -1
    this.syncEnabledSnapshotsIfNeeded(frameSeq)
  }

  /**
   * Force rebuild on next sync (e.g. after toggling `behaviour.enabled` at runtime without
   * mutating the behaviour list).
   */
  invalidateEnabledApplySnapshot = () => {
    this._enabledApplyPreparedForSeq = -1
    this._enabledApplyPreparedForStructureRev = -1
  }

  private syncEnabledSnapshotsIfNeeded(frameSeq: number) {
    if (
      frameSeq === this._enabledApplyPreparedForSeq &&
      this.structureRevision === this._enabledApplyPreparedForStructureRev
    ) {
      return
    }
    this.rebuildEnabledApplyListCore()
    this.rebuildReactiveSourceRefs()
    this._enabledApplyPreparedForSeq = frameSeq
    this._enabledApplyPreparedForStructureRev = this.structureRevision
  }

  private rebuildEnabledApplyListCore() {
    const out = this.enabledApplyList
    out.length = 0
    for (let i = 0; i < this.behaviours.length; ++i) {
      const behaviour = this.behaviours[i]
      if (!behaviour.enabled) continue
      out.push(behaviour)
    }
  }

  private rebuildReactiveSourceRefs() {
    const sound = this.reactiveSoundBehaviours
    const pulse = this.reactivePulseBehaviours
    const beat = this.reactiveBeatPhaseBehaviours
    sound.length = 0
    pulse.length = 0
    beat.length = 0
    for (let i = 0; i < this.behaviours.length; ++i) {
      const b = this.behaviours[i]
      if (!b.enabled) continue
      const name = typeof (b as { getName?: () => string }).getName === 'function' ? (b as { getName: () => string }).getName() : ''
      if (name === BehaviourNames.SOUND_REACTIVE_BEHAVIOUR) sound.push(b)
      else if (name === BehaviourNames.PULSE_BEHAVIOUR) pulse.push(b)
      else if (name === BehaviourNames.BEAT_PHASE_LOCK_BEHAVIOUR) beat.push(b)
    }
  }

  private refreshRecursiveFireworkCache = () => {
    this.cachedRecursiveFirework = null
    for (let i = 0; i < this.behaviours.length; i++) {
      const b = this.behaviours[i]
      if (b.getName() === BehaviourNames.RECURSIVE_FIREWORK_BEHAVIOUR) {
        this.cachedRecursiveFirework = b
        return
      }
    }
  }

  private rebuildBehaviourNameMap = () => {
    this.behaviourByName.clear()
    for (let i = 0; i < this.behaviours.length; i++) {
      const b = this.behaviours[i]
      this.behaviourByName.set(b.getName(), b)
    }
  }

  /**
   * Clears all the stored behaviours
   */
  clear = () => {
    this.behaviours = []
    this.behaviourByName.clear()
    this.cachedRecursiveFirework = null
    this.enabledApplyList.length = 0
    this.reactiveSoundBehaviours.length = 0
    this.reactivePulseBehaviours.length = 0
    this.reactiveBeatPhaseBehaviours.length = 0
    this.invalidateEnabledApplySnapshot()
    this.structureRevision++
  }

  /**
   * Adds a behaviour (built-in or custom implementing IBehaviour).
   *
   * @param {IBehaviour} behaviour The behaviour to add
   *
   * @return {IBehaviour} The added behaviour
   */
  add = (behaviour: IBehaviour) => {
    if (this.behaviourByName.has(behaviour.getName())) {
      throw new Error('Emitter duplicate')
    }

    this.behaviours.push(behaviour)
    this.behaviours.sort((a: IBehaviour, b: IBehaviour) => {
      return b.priority - a.priority
    })

    this.rebuildBehaviourNameMap()
    this.refreshRecursiveFireworkCache()
    this.structureRevision++
    return behaviour
  }

  /**
   * Checks if there are no behaviours stored
   *
   * @return {boolean} True if there are no behaviours stored, false otherwise
   */
  isEmpty = () => {
    for (let i = 0; i < this.behaviours.length; ++i) {
      if (this.behaviours[i].enabled) return false
    }
    return true
  }

  /**
   * Gets a behaviour by name
   *
   * @param {string} name The name of the behaviour to get
   *
   * @return {any | null} The behaviour with the given name or null if not found
   */
  getByName = (name: string): IBehaviour | null => {
    return this.behaviourByName.get(name) ?? null
  }

  /**
   * Removes a behaviour by name
   *
   * @param {string} name The name of the behaviour to remove
   */
  removeByName = (name: string) => {
    const behaviours: IBehaviour[] = []
    for (let i = 0; i < this.behaviours.length; ++i) {
      if (this.behaviours[i].getName() !== name) {
        behaviours.push(this.behaviours[i])
      }
    }

    this.behaviours = behaviours
    this.rebuildBehaviourNameMap()
    this.refreshRecursiveFireworkCache()
    this.structureRevision++
  }

  /**
   * Initialises the behaviours
   *
   * @param {Particle} particle The particle
   * @param {Model} model The model
   * @param {Model} turbulencePool The turbulencePool
   */
  init = (particle: Particle, model: Model, turbulencePool: TurbulencePool) => {
    this.ensureEnabledApplyList(model)
    const list = this.enabledApplyList
    for (let i = 0; i < list.length; ++i) {
      list[i].init(particle, model, turbulencePool)
    }
  }

  /**
   * Applies the behaviours
   *
   * @param {Particle} particle The particle
   * @param {number} deltaTime The delta time
   * @param {Model} model The model
   */
  apply = (particle: Particle, deltaTime: number, model: Model) => {
    this.ensureEnabledApplyList(model)
    const list = this.enabledApplyList
    for (let i = 0; i < list.length; ++i) {
      list[i].apply(particle, deltaTime, model)
    }
  }

  /**
   * Update once per frame
   *
   * @param {number} deltaTime The delta time
   */
  update = (deltaTime: number, model: Model) => {
    this.ensureEnabledApplyList(model)
    this.collectReactiveSignals(deltaTime, model)
    const list = this.enabledApplyList
    for (let i = 0; i < list.length; ++i) {
      const behaviour = list[i]
      const updateFn = behaviour.update
      if (updateFn) updateFn.call(behaviour, deltaTime)
    }
  }

  private collectReactiveSignals(deltaTime: number, model: Model) {
    model.resetReactiveSignals()
    const recursiveCfg: any = this.cachedRecursiveFirework
    if (!recursiveCfg?.enabled) return

    const blendMode = (recursiveCfg?.reactiveSourceBlendMode || 'single') as 'single' | 'weightedMix' | 'max' | 'priority'
    const sourceWeights = {
      soundReactive: Math.max(0, recursiveCfg?.reactiveSourceWeights?.soundReactive ?? 1),
      pulse: Math.max(0, recursiveCfg?.reactiveSourceWeights?.pulse ?? 1),
      beatPhaseLock: Math.max(0, recursiveCfg?.reactiveSourceWeights?.beatPhaseLock ?? 1),
    }
    const sourcePriority = Array.isArray(recursiveCfg?.reactiveSourcePriority)
      ? recursiveCfg.reactiveSourcePriority
      : ['soundReactive', 'pulse', 'beatPhaseLock']
    const channelWeights = {
      energy: Math.max(0, recursiveCfg?.reactiveChannelWeights?.energy ?? 1),
      lowBand: Math.max(0, recursiveCfg?.reactiveChannelWeights?.lowBand ?? 1),
      midBand: Math.max(0, recursiveCfg?.reactiveChannelWeights?.midBand ?? 1),
      highBand: Math.max(0, recursiveCfg?.reactiveChannelWeights?.highBand ?? 1),
      beat: Math.max(0, recursiveCfg?.reactiveChannelWeights?.beat ?? 1),
      pulsePhase: Math.max(0, recursiveCfg?.reactiveChannelWeights?.pulsePhase ?? 1),
      beatPhase: Math.max(0, recursiveCfg?.reactiveChannelWeights?.beatPhase ?? 1),
      beatPhaseToEnergy: Math.max(0, recursiveCfg?.reactiveChannelWeights?.beatPhaseToEnergy ?? 0),
    }
    const raw = model.reactiveSignals.raw
    const dtSec = Math.max(0.0001, deltaTime / 1000)
    const soundDecimateFrames = Math.max(1, recursiveCfg?.reactiveSoundUpdateEveryNFrames ?? 1)
    const frameCounter = ((recursiveCfg?._reactiveCollectorFrameCounter ?? 0) + 1) | 0
    if (recursiveCfg) (recursiveCfg as any)._reactiveCollectorFrameCounter = frameCounter
    const shouldUpdateSound = frameCounter % soundDecimateFrames === 0
    const fftStride = Math.max(1, ((recursiveCfg as any)?.reactiveSoundFftStride ?? 1) | 0)
    let sourceCount = 0
    const sourceMask = this.reactiveSourceMaskScratch
    sourceMask.length = 0

    const soundList = this.reactiveSoundBehaviours
    for (let si = 0; si < soundList.length; si++) {
      const behaviour = soundList[si] as any
      if (!behaviour.analyser || !behaviour.frequencyData || !behaviour.isPlaying) continue
      if (shouldUpdateSound) {
        try {
          if (typeof behaviour.refreshFrequencyData === 'function') behaviour.refreshFrequencyData()
          else behaviour.analyser.getByteFrequencyData(behaviour.frequencyData as Uint8Array)
        } catch {
          // Ignore transient audio analyser failures and keep rendering alive.
        }
      }
      const fd = behaviour.frequencyData as Uint8Array
      if (!fd || typeof fd.length !== 'number' || typeof (fd as any)[0] !== 'number') continue
      const n = Math.max(1, fd.length)
      const lowEnd = Math.max(1, Math.floor(n * 0.12))
      const midEnd = Math.max(lowEnd + 1, Math.floor(n * 0.45))
      let sum = 0
      let low = 0
      let mid = 0
      let high = 0
      let sampleCount = 0
      let lowCount = 0
      let midCount = 0
      let highCount = 0
      for (let j = 0; j < n; j += fftStride) {
        const v = fd[j] / 255
        sum += v
        sampleCount += 1
        if (j < lowEnd) {
          low += v
          lowCount += 1
        } else if (j < midEnd) {
          mid += v
          midCount += 1
        } else {
          high += v
          highCount += 1
        }
      }
      const energy = sampleCount > 0 ? sum / sampleCount : 0
      const lowBand = lowCount > 0 ? low / lowCount : 0
      const midBand = midCount > 0 ? mid / midCount : 0
      const highBand = highCount > 0 ? high / highCount : 0
      const bandSum = lowBand + midBand + highBand
      const flux = Math.max(0, energy - this.lastSoundEnergy)
      const onset = Math.max(0, bandSum - this.lastSoundBandSum)
      this.lastSoundEnergy = energy
      this.lastSoundBandSum = bandSum
      const beatThreshold = Math.max(0.25, Math.min(1, (behaviour.beatSensitivity || 1) * 0.5))
      raw.soundReactive.energy = Math.max(raw.soundReactive.energy, energy)
      raw.soundReactive.lowBand = Math.max(raw.soundReactive.lowBand, lowBand)
      raw.soundReactive.midBand = Math.max(raw.soundReactive.midBand, midBand)
      raw.soundReactive.highBand = Math.max(raw.soundReactive.highBand, highBand)
      raw.soundReactive.beat = Math.max(raw.soundReactive.beat, energy >= beatThreshold ? 1 : 0)
      model.reactiveSignals.loudness = Math.max(model.reactiveSignals.loudness, energy)
      model.reactiveSignals.flux = Math.max(model.reactiveSignals.flux, flux)
      model.reactiveSignals.onset = Math.max(model.reactiveSignals.onset, onset)
      model.reactiveSignals.source = sourceCount > 0 ? 'mixed' : 'soundReactive'
      if (sourceMask.indexOf('soundReactive') === -1) sourceMask.push('soundReactive')
      sourceCount += 1
    }

    const pulseList = this.reactivePulseBehaviours
    for (let pi = 0; pi < pulseList.length; pi++) {
      const behaviour = pulseList[pi] as any
      const phase = 0.5 + 0.5 * Math.sin((behaviour.frequency || 0) * Math.PI * 2 * ((behaviour._time || 0) * 0.001) + (behaviour.phaseOffset || 0))
      raw.pulse.pulsePhase = Math.max(raw.pulse.pulsePhase, phase)
      raw.pulse.energy = Math.max(raw.pulse.energy, Math.abs((behaviour.amplitude || 0) * phase))
      model.reactiveSignals.source = sourceCount > 0 ? 'mixed' : 'pulse'
      if (sourceMask.indexOf('pulse') === -1) sourceMask.push('pulse')
      sourceCount += 1
    }

    const beatList = this.reactiveBeatPhaseBehaviours
    for (let bi = 0; bi < beatList.length; bi++) {
      const behaviour = beatList[bi] as any
      const omega = ((Math.PI * 2 * (behaviour.bpm || 120)) / 60) * Math.max(1, behaviour.harmonic || 1)
      const phase = omega * (behaviour._time || 0) + (behaviour.phaseOffset || 0)
      const beatPhase = 0.5 + 0.5 * Math.cos(phase)
      raw.beatPhaseLock.beatPhase = Math.max(raw.beatPhaseLock.beatPhase, beatPhase)
      raw.beatPhaseLock.beat = Math.max(raw.beatPhaseLock.beat, beatPhase > 0.92 ? 1 : 0)
      model.reactiveSignals.source = sourceCount > 0 ? 'mixed' : 'beatPhaseLock'
      if (sourceMask.indexOf('beatPhaseLock') === -1) sourceMask.push('beatPhaseLock')
      sourceCount += 1
    }

    // Small decay when no dedicated source is available.
    if (sourceCount === 0) {
      model.reactiveSignals.energy = Math.max(0, model.reactiveSignals.energy - deltaTime * 0.0015)
      return
    }

    const active = {
      soundReactive: raw.soundReactive.energy > 0 || raw.soundReactive.beat > 0,
      pulse: raw.pulse.energy > 0 || raw.pulse.pulsePhase > 0,
      beatPhaseLock: raw.beatPhaseLock.beat > 0 || raw.beatPhaseLock.beatPhase > 0,
    }
    const pickPriority = () => {
      for (let i = 0; i < sourcePriority.length; i++) {
        const s = sourcePriority[i]
        if (s === 'soundReactive' && active.soundReactive) return 'soundReactive'
        if (s === 'pulse' && active.pulse) return 'pulse'
        if (s === 'beatPhaseLock' && active.beatPhaseLock) return 'beatPhaseLock'
      }
      return sourceMask[0] || 'soundReactive'
    }
    const maxEnergy = Math.max(raw.soundReactive.energy, raw.pulse.energy)
    const maxBeat = Math.max(raw.soundReactive.beat, raw.beatPhaseLock.beat)
    if (blendMode === 'single') {
      model.reactiveSignals.energy = maxEnergy
      model.reactiveSignals.lowBand = raw.soundReactive.lowBand
      model.reactiveSignals.midBand = raw.soundReactive.midBand
      model.reactiveSignals.highBand = raw.soundReactive.highBand
      model.reactiveSignals.beat = maxBeat
      model.reactiveSignals.pulsePhase = raw.pulse.pulsePhase
      model.reactiveSignals.beatPhase = raw.beatPhaseLock.beatPhase
    } else if (blendMode === 'max') {
      model.reactiveSignals.energy = maxEnergy
      model.reactiveSignals.lowBand = raw.soundReactive.lowBand
      model.reactiveSignals.midBand = raw.soundReactive.midBand
      model.reactiveSignals.highBand = raw.soundReactive.highBand
      model.reactiveSignals.beat = maxBeat
      model.reactiveSignals.pulsePhase = raw.pulse.pulsePhase
      model.reactiveSignals.beatPhase = raw.beatPhaseLock.beatPhase
      model.reactiveSignals.source = 'mixed'
    } else if (blendMode === 'priority') {
      const selected = pickPriority()
      if (selected === 'soundReactive') {
        model.reactiveSignals.energy = raw.soundReactive.energy
        model.reactiveSignals.lowBand = raw.soundReactive.lowBand
        model.reactiveSignals.midBand = raw.soundReactive.midBand
        model.reactiveSignals.highBand = raw.soundReactive.highBand
        model.reactiveSignals.beat = raw.soundReactive.beat
      } else if (selected === 'pulse') {
        model.reactiveSignals.energy = raw.pulse.energy
        model.reactiveSignals.pulsePhase = raw.pulse.pulsePhase
      } else {
        model.reactiveSignals.beat = raw.beatPhaseLock.beat
        model.reactiveSignals.beatPhase = raw.beatPhaseLock.beatPhase
        model.reactiveSignals.energy = maxEnergy * channelWeights.beatPhaseToEnergy
      }
      if (model.reactiveSignals.energy <= 0) model.reactiveSignals.energy = maxEnergy
      if (model.reactiveSignals.lowBand <= 0) model.reactiveSignals.lowBand = raw.soundReactive.lowBand
      if (model.reactiveSignals.midBand <= 0) model.reactiveSignals.midBand = raw.soundReactive.midBand
      if (model.reactiveSignals.highBand <= 0) model.reactiveSignals.highBand = raw.soundReactive.highBand
      if (model.reactiveSignals.beat <= 0) model.reactiveSignals.beat = maxBeat
      if (model.reactiveSignals.pulsePhase <= 0) model.reactiveSignals.pulsePhase = raw.pulse.pulsePhase
      if (model.reactiveSignals.beatPhase <= 0) model.reactiveSignals.beatPhase = raw.beatPhaseLock.beatPhase
      model.reactiveSignals.source = selected
    } else {
      const ws = sourceWeights.soundReactive
      const wp = sourceWeights.pulse
      const wb = sourceWeights.beatPhaseLock
      const sum = Math.max(0.0001, ws + wp + wb)
      model.reactiveSignals.energy =
        (raw.soundReactive.energy * ws + raw.pulse.energy * wp + maxEnergy * wb * channelWeights.beatPhaseToEnergy) / sum
      model.reactiveSignals.lowBand = (raw.soundReactive.lowBand * ws) / sum
      model.reactiveSignals.midBand = (raw.soundReactive.midBand * ws) / sum
      model.reactiveSignals.highBand = (raw.soundReactive.highBand * ws) / sum
      model.reactiveSignals.beat = (raw.soundReactive.beat * ws + raw.beatPhaseLock.beat * wb) / sum
      model.reactiveSignals.pulsePhase = (raw.pulse.pulsePhase * wp) / sum
      model.reactiveSignals.beatPhase = (raw.beatPhaseLock.beatPhase * wb) / sum
      model.reactiveSignals.source = 'mixed'
    }
    model.reactiveSignals.energy = Math.max(0, Math.min(1, model.reactiveSignals.energy * channelWeights.energy))
    model.reactiveSignals.loudness = Math.max(0, Math.min(1, model.reactiveSignals.loudness * channelWeights.energy))
    model.reactiveSignals.onset = Math.max(0, Math.min(1, model.reactiveSignals.onset))
    model.reactiveSignals.flux = Math.max(0, Math.min(1, model.reactiveSignals.flux))
    model.reactiveSignals.lowBand = Math.max(0, Math.min(1, model.reactiveSignals.lowBand * channelWeights.lowBand))
    model.reactiveSignals.midBand = Math.max(0, Math.min(1, model.reactiveSignals.midBand * channelWeights.midBand))
    model.reactiveSignals.highBand = Math.max(0, Math.min(1, model.reactiveSignals.highBand * channelWeights.highBand))
    model.reactiveSignals.beat = Math.max(0, Math.min(1, model.reactiveSignals.beat * channelWeights.beat))
    model.reactiveSignals.pulsePhase = Math.max(0, Math.min(1, model.reactiveSignals.pulsePhase * channelWeights.pulsePhase))
    model.reactiveSignals.beatPhase = Math.max(0, Math.min(1, model.reactiveSignals.beatPhase * channelWeights.beatPhase))

    // Derived phases for choreography (fall back to whatever is active).
    const basePhase = model.reactiveSignals.beatPhase > 0 ? model.reactiveSignals.beatPhase : model.reactiveSignals.pulsePhase
    model.reactiveSignals.phase1x = basePhase
    model.reactiveSignals.phase2x = (basePhase * 2) % 1
    model.reactiveSignals.phase4x = (basePhase * 4) % 1

    // Simple envelope followers for stability (configurable via RecursiveFireworkBehaviour fields).
    // Defaults are conservative to preserve old behaviour when reactiveV2 is not enabled.
    const envAttackMs = Math.max(1, recursiveCfg?.reactiveEnvelopeAttackMs ?? 35)
    const envReleaseMs = Math.max(1, recursiveCfg?.reactiveEnvelopeReleaseMs ?? 120)
    const a = Math.min(1, dtSec / (envAttackMs / 1000))
    const r = Math.min(1, dtSec / (envReleaseMs / 1000))
    const follow = (key: string, target: number) => {
      const entry = (this.env[key] ||= { value: 0 })
      const k = target > entry.value ? a : r
      entry.value += (target - entry.value) * k
      return entry.value
    }
    model.reactiveSignals.energy = follow('energy', model.reactiveSignals.energy)
    model.reactiveSignals.loudness = follow('loudness', model.reactiveSignals.loudness)
    model.reactiveSignals.onset = follow('onset', model.reactiveSignals.onset)
    model.reactiveSignals.flux = follow('flux', model.reactiveSignals.flux)
    model.reactiveSignals.lowBand = follow('lowBand', model.reactiveSignals.lowBand)
    model.reactiveSignals.midBand = follow('midBand', model.reactiveSignals.midBand)
    model.reactiveSignals.highBand = follow('highBand', model.reactiveSignals.highBand)
  }

  /**
   * Called when a particle is removed from the emitter.
   * Allows behaviours to clean up any per-particle state.
   * @param {Particle} particle The particle being removed.
   */
  onParticleRemoved = (particle: Particle, model: Model) => {
    this.ensureEnabledApplyList(model)
    const list = this.enabledApplyList
    for (let i = 0; i < list.length; ++i) {
      const behaviour = list[i]
      const onRemoved = behaviour.onParticleRemoved
      if (onRemoved) onRemoved.call(behaviour, particle)
    }
  }
}
