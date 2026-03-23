import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'
import type Model from '../Model'
import type TurbulencePool from '../util/turbulencePool'

/**
 * Weak spring toward an external target (e.g. another emitter centroid). Set targetX/targetY from game code.
 */
export default class EmitterAttractorLinkBehaviour extends Behaviour {
  enabled = true
  priority = 230

  active = true
  targetX = 0
  targetY = 0
  strength = 120
  /** 0 = uniform, >0 = weaker when far */
  falloff = 0
  /** 1 = x only, 2 = y only, 3 = both */
  axisMask = 3

  init(_particle: Particle, _model: Model, _turbulencePool: TurbulencePool) {}

  apply(particle: Particle, deltaTime: number, _model: Model) {
    if (!this.enabled || !this.active || particle.skipPositionBehaviour) return

    const dx = this.targetX - particle.movement.x
    const dy = this.targetY - particle.movement.y
    const dist = Math.hypot(dx, dy) || 1e-6
    let ax = (dx / dist) * this.strength
    let ay = (dy / dist) * this.strength
    if (this.falloff > 0) {
      const f = 1 / (1 + dist * this.falloff * 0.01)
      ax *= f
      ay *= f
    }
    if ((this.axisMask & 1) === 0) ax = 0
    if ((this.axisMask & 2) === 0) ay = 0
    particle.velocity.x += ax * deltaTime
    particle.velocity.y += ay * deltaTime
  }

  getName() {
    return BehaviourNames.EMITTER_ATTRACTOR_LINK_BEHAVIOUR
  }

  getProps(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      priority: this.priority,
      active: this.active,
      targetX: this.targetX,
      targetY: this.targetY,
      strength: this.strength,
      falloff: this.falloff,
      axisMask: this.axisMask,
      name: this.getName(),
    }
  }
}
