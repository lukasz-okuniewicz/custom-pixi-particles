import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import type Particle from '../Particle'
import type Model from '../Model'
import type TurbulencePool from '../util/turbulencePool'

export default class GlitchBehaviour extends Behaviour {
  enabled = true
  priority = -18
  jitterProbability = 0.08
  teleportProbability = 0.006
  jitterDistance = 6
  teleportDistance = 90
  chromaticShift = 24

  init(_particle: Particle, _model: Model, _turbulencePool: TurbulencePool) {}

  apply(particle: Particle, deltaTime: number) {
    if (!this.enabled) return
    if (Math.random() < this.jitterProbability * deltaTime * 60) {
      particle.movement.x += (Math.random() * 2 - 1) * this.jitterDistance
      particle.movement.y += (Math.random() * 2 - 1) * this.jitterDistance
      particle.color.b = Math.min(255, particle.color.b + this.chromaticShift)
    }
    if (Math.random() < this.teleportProbability * deltaTime * 60) {
      particle.movement.x += (Math.random() * 2 - 1) * this.teleportDistance
      particle.movement.y += (Math.random() * 2 - 1) * this.teleportDistance
    }
  }

  getName(): string {
    return BehaviourNames.GLITCH_BEHAVIOUR
  }

  getProps(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      priority: this.priority,
      jitterProbability: this.jitterProbability,
      teleportProbability: this.teleportProbability,
      jitterDistance: this.jitterDistance,
      teleportDistance: this.teleportDistance,
      chromaticShift: this.chromaticShift,
      name: this.getName(),
    }
  }
}
