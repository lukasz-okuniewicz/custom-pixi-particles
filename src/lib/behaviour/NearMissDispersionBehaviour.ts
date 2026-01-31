import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'

/**
 * NearMissDispersionBehaviour: on trigger, particles that were converging scatter in the miss direction.
 * Asymmetric scatter encodes near-miss type (above/below, left/right).
 */
export default class NearMissDispersionBehaviour extends Behaviour {
  enabled = true
  priority = 200

  /** Set true to trigger dispersion (game sets on near-miss) */
  triggered = false
  /** Scatter direction angle in radians (0=right, PI/2=down) */
  scatterAngle = Math.PI / 2
  /** Scatter magnitude */
  scatterStrength = 300
  /** Per-particle scatter - adds randomness */
  scatterVariance = 100

  private _triggeredForUid = new Set<number>()

  init = () => {}

  apply = (particle: Particle, deltaTime: number) => {
    if (!this.enabled) return
    if (!this.triggered) {
      this._triggeredForUid.clear()
      return
    }

    if (!this._triggeredForUid.has(particle.uid)) {
      this._triggeredForUid.add(particle.uid)
      const angle = this.scatterAngle + (Math.random() - 0.5) * 0.5
      const strength = this.scatterStrength + (Math.random() - 0.5) * 2 * this.scatterVariance
      particle.velocity.x += Math.cos(angle) * strength
      particle.velocity.y += Math.sin(angle) * strength
    }
  }

  onParticleRemoved = (particle: Particle) => {
    this._triggeredForUid.delete(particle.uid)
  }

  getName() {
    return BehaviourNames.NEAR_MISS_DISPERSION_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      triggered: this.triggered,
      scatterAngle: this.scatterAngle,
      scatterStrength: this.scatterStrength,
      scatterVariance: this.scatterVariance,
      name: this.getName(),
    }
  }
}
