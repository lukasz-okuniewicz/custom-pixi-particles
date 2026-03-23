import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'
import type Model from '../Model'
import type TurbulencePool from '../util/turbulencePool'

/**
 * V-shaped wake forces behind a moving source (stylized Kelvin wake).
 */
export default class KelvinWakeBehaviour extends Behaviour {
  enabled = true
  priority = 212

  /** Source position (e.g. vehicle); update from gameplay */
  sourceX = 0
  sourceY = 0
  /** Source velocity (world units/sec) */
  sourceVelocityX = 200
  sourceVelocityY = 0
  /** Half-angle between wake arms (radians); ~0.35–0.6 typical */
  wakeAngle = 0.45
  strength = 90
  decayAlongRay = 0.004
  lateralJitter = 12
  maxWakeDistance = 500

  init(_particle: Particle, _model: Model, _turbulencePool: TurbulencePool) {}

  apply(particle: Particle, deltaTime: number, _model: Model) {
    if (!this.enabled || particle.skipPositionBehaviour) return

    const vx = this.sourceVelocityX
    const vy = this.sourceVelocityY
    const spd = Math.hypot(vx, vy)
    if (spd < 1e-3) return

    const dirx = vx / spd
    const diry = vy / spd
    const px = particle.movement.x - this.sourceX
    const py = particle.movement.y - this.sourceY

    const backx = -dirx
    const backy = -diry
    const rx = -diry
    const ry = dirx

    const along = px * backx + py * backy
    if (along < 0 || along > this.maxWakeDistance) return

    const side = px * rx + py * ry
    const a = this.wakeAngle
    const d1 = Math.abs(side - along * Math.tan(a))
    const d2 = Math.abs(side + along * Math.tan(a))
    const w1 = Math.exp(-d1 * d1 * this.decayAlongRay)
    const w2 = Math.exp(-d2 * d2 * this.decayAlongRay)
    const w = (w1 + w2) * (1 + (Math.random() - 0.5) * (this.lateralJitter / 100))

    const fx = backx * w * this.strength * deltaTime
    const fy = backy * w * this.strength * deltaTime
    particle.velocity.x += fx
    particle.velocity.y += fy
  }

  getName() {
    return BehaviourNames.KELVIN_WAKE_BEHAVIOUR
  }

  getProps(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      priority: this.priority,
      sourceX: this.sourceX,
      sourceY: this.sourceY,
      sourceVelocityX: this.sourceVelocityX,
      sourceVelocityY: this.sourceVelocityY,
      wakeAngle: this.wakeAngle,
      strength: this.strength,
      decayAlongRay: this.decayAlongRay,
      lateralJitter: this.lateralJitter,
      maxWakeDistance: this.maxWakeDistance,
      name: this.getName(),
    }
  }
}
