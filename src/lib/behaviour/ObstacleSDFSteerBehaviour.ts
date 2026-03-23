import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'
import type Model from '../Model'
import type TurbulencePool from '../util/turbulencePool'

export type SDFPrimitive =
  | { type: 'circle'; cx: number; cy: number; r: number }
  | { type: 'box'; minX: number; minY: number; maxX: number; maxY: number }

/**
 * Push / slide along SDF obstacles (union of circles and axis-aligned boxes).
 */
export default class ObstacleSDFSteerBehaviour extends Behaviour {
  enabled = true
  priority = 290

  primitives: SDFPrimitive[] = []
  margin = 4
  pushStrength = 400
  /** 0 = full normal push, 1 = more tangential slip */
  slipFactor = 0.35
  maxPushPerFrame = 120

  init(_particle: Particle, _model: Model, _turbulencePool: TurbulencePool) {}

  private sdf(px: number, py: number): number {
    let d = Infinity
    for (const p of this.primitives) {
      if (p.type === 'circle') {
        const dx = px - p.cx
        const dy = py - p.cy
        d = Math.min(d, Math.hypot(dx, dy) - p.r)
      } else {
        const qx = Math.max(p.minX - px, px - p.maxX, 0)
        const qy = Math.max(p.minY - py, py - p.maxY, 0)
        if (qx === 0 && qy === 0) {
          const ins = Math.min(px - p.minX, p.maxX - px, py - p.minY, p.maxY - py)
          d = Math.min(d, -ins)
        } else {
          d = Math.min(d, Math.hypot(qx, qy))
        }
      }
    }
    return d
  }

  private grad(px: number, py: number): { gx: number; gy: number } {
    const e = 1
    const dx = (this.sdf(px + e, py) - this.sdf(px - e, py)) / (2 * e)
    const dy = (this.sdf(px, py + e) - this.sdf(px, py - e)) / (2 * e)
    const len = Math.hypot(dx, dy) || 1e-6
    return { gx: dx / len, gy: dy / len }
  }

  apply(particle: Particle, deltaTime: number, _model: Model) {
    if (!this.enabled || particle.skipPositionBehaviour || this.primitives.length === 0) return

    const px = particle.movement.x
    const py = particle.movement.y
    const d = this.sdf(px, py)

    if (d >= this.margin) return

    const { gx, gy } = this.grad(px, py)
    const pen = Math.min(this.margin - d, this.maxPushPerFrame)
    const push = this.pushStrength * Math.max(0, pen) * deltaTime

    const slip = this.slipFactor
    const tx = -gy
    const ty = gx
    const nx = gx
    const ny = gy

    particle.velocity.x += nx * push * (1 - slip) + tx * slip * push * 0.15
    particle.velocity.y += ny * push * (1 - slip) + ty * slip * push * 0.15

    const vx = particle.velocity.x
    const vy = particle.velocity.y
    const vdotn = vx * nx + vy * ny
    if (vdotn < 0) {
      particle.velocity.x -= vdotn * nx * slip
      particle.velocity.y -= vdotn * ny * slip
    }
  }

  getName() {
    return BehaviourNames.OBSTACLE_SDF_STEER_BEHAVIOUR
  }

  getProps(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      priority: this.priority,
      primitives: this.primitives,
      margin: this.margin,
      pushStrength: this.pushStrength,
      slipFactor: this.slipFactor,
      maxPushPerFrame: this.maxPushPerFrame,
      name: this.getName(),
    }
  }
}
