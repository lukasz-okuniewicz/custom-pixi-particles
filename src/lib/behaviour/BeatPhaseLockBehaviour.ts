import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'
import type Model from '../Model'
import type TurbulencePool from '../util/turbulencePool'

/**
 * Lock phase to BPM; writes beatPhase01 for visuals and optional scale pulse.
 */
export default class BeatPhaseLockBehaviour extends Behaviour {
  enabled = true
  /** After SizeBehaviour (0) so scale pulse is not overwritten each frame */
  priority = -35

  bpm = 120
  phaseOffset = 0
  lockStrength = 0.85
  jitter = 0.1
  harmonic = 1

  writePhaseForVisual = true
  applyScalePulse = false
  scalePulseAmount = 0.15

  private _time = 0

  update = (deltaTime: number) => {
    this._time += deltaTime
  }

  init(particle: Particle, _model: Model, _turbulencePool: TurbulencePool) {
    const p = particle as any
    p.beatPhaseOffset = (particle.uid % 97) * 0.01 * this.jitter
  }

  apply(particle: Particle, _deltaTime: number, _model: Model) {
    if (!this.enabled) return

    const p = particle as any
    const omega = ((Math.PI * 2 * this.bpm) / 60) * Math.max(1, this.harmonic)
    const phase = omega * this._time + this.phaseOffset + (p.beatPhaseOffset || 0)
    const base = Math.cos(phase)
    const locked = base * this.lockStrength + (1 - this.lockStrength) * Math.sin(phase * 0.5 + p.beatPhaseOffset)

    if (this.writePhaseForVisual) {
      p.beatPhase01 = 0.5 + 0.5 * locked
    }

    if (this.applyScalePulse) {
      const m = 1 + this.scalePulseAmount * locked
      const lp = particle.lifeProgress
      const bx = particle.sizeStart.x + (particle.sizeEnd.x - particle.sizeStart.x) * lp
      const by = particle.sizeStart.y + (particle.sizeEnd.y - particle.sizeStart.y) * lp
      particle.size.x = bx * m
      particle.size.y = by * m
    }
  }

  getName() {
    return BehaviourNames.BEAT_PHASE_LOCK_BEHAVIOUR
  }

  getProps(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      priority: this.priority,
      bpm: this.bpm,
      phaseOffset: this.phaseOffset,
      lockStrength: this.lockStrength,
      jitter: this.jitter,
      harmonic: this.harmonic,
      writePhaseForVisual: this.writePhaseForVisual,
      applyScalePulse: this.applyScalePulse,
      scalePulseAmount: this.scalePulseAmount,
      name: this.getName(),
    }
  }
}
