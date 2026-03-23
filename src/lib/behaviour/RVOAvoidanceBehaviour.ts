import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'
import type Model from '../Model'
import type TurbulencePool from '../util/turbulencePool'

/**
 * Lightweight reciprocal avoidance: corrective velocity from nearby particles (2D).
 */
export default class RVOAvoidanceBehaviour extends Behaviour {
  enabled = true
  priority = 255

  neighborRadius = 45
  timeHorizon = 0.4
  maxAccel = 800
  weight = 1
  minSeparation = 18

  particleListGetter: (() => { forEach: (cb: (p: Particle) => void) => void }) | null = null

  init(_particle: Particle, _model: Model, _turbulencePool: TurbulencePool) {}

  apply(particle: Particle, deltaTime: number, _model: Model) {
    if (!this.enabled || particle.skipPositionBehaviour) return

    const list = this.particleListGetter?.()
    if (!list) return

    const px = particle.movement.x
    const py = particle.movement.y
    const vx = particle.velocity.x
    const vy = particle.velocity.y

    let ax = 0
    let ay = 0
    const r = this.neighborRadius
    const rSq = r * r

    list.forEach((other: Particle) => {
      if (other === particle) return
      const ox = other.movement.x
      const oy = other.movement.y
      const dx = px - ox
      const dy = py - oy
      const dSq = dx * dx + dy * dy
      if (dSq > rSq || dSq < 1e-6) return
      const d = Math.sqrt(dSq)
      const combined = this.minSeparation
      const pen = Math.max(0, combined - d)
      if (pen <= 0) return
      const nx = dx / d
      const ny = dy / d

      const ovx = other.velocity.x
      const ovy = other.velocity.y
      const rvx = vx - ovx
      const rvy = vy - ovy
      const closing = rvx * nx + rvy * ny
      const thr = combined / Math.max(0.05, this.timeHorizon)
      if (closing < thr) {
        const t = (1 - d / combined) * this.weight
        ax += nx * pen * t
        ay += ny * pen * t
      } else {
        const t = (pen / combined) * 0.5 * this.weight
        ax += nx * t
        ay += ny * t
      }
    })

    const mag = Math.hypot(ax, ay)
    const cap = this.maxAccel * deltaTime
    if (mag > cap && mag > 1e-6) {
      const s = cap / mag
      ax *= s
      ay *= s
    }
    particle.velocity.x += ax
    particle.velocity.y += ay
  }

  getName() {
    return BehaviourNames.RVO_AVOIDANCE_BEHAVIOUR
  }

  getProps(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      priority: this.priority,
      neighborRadius: this.neighborRadius,
      timeHorizon: this.timeHorizon,
      maxAccel: this.maxAccel,
      weight: this.weight,
      minSeparation: this.minSeparation,
      name: this.getName(),
    }
  }
}
