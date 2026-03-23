import { Point } from '../util'
import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'
import type Model from '../Model'
import type TurbulencePool from '../util/turbulencePool'

/**
 * Spatial shear: velocity gains perpendicular components from position offset (streaky flow).
 */
export default class ShearFlowBehaviour extends Behaviour {
  enabled = true
  priority = 305

  pivot = new Point(0, 0)
  /** Shear: vx += shearYX * (y - pivot.y) */
  shearYX = 0.15
  /** Shear: vy += shearXY * (x - pivot.x) */
  shearXY = 0.12
  /** 0 = global shear, >0 = falloff outside this radius from pivot */
  radius = 0
  oscillationHz = 0
  /** Blend factor vs existing velocity (0–1) */
  blendWithVelocity = 1

  private _phase = 0

  update = (deltaTime: number) => {
    if (this.oscillationHz > 0) {
      this._phase += deltaTime * this.oscillationHz * Math.PI * 2
    }
  }

  init(_particle: Particle, _model: Model, _turbulencePool: TurbulencePool) {}

  apply(particle: Particle, deltaTime: number, _model: Model) {
    if (!this.enabled || particle.skipPositionBehaviour) return

    const dx = particle.movement.x - this.pivot.x
    const dy = particle.movement.y - this.pivot.y
    let kx = this.shearYX
    let ky = this.shearXY
    if (this.oscillationHz > 0) {
      const s = Math.sin(this._phase)
      kx *= s
      ky *= s
    }
    let falloff = 1
    if (this.radius > 0) {
      const d = Math.sqrt(dx * dx + dy * dy)
      falloff = Math.max(0, 1 - d / this.radius)
    }
    const sx = kx * dy * falloff * this.blendWithVelocity * deltaTime
    const sy = ky * dx * falloff * this.blendWithVelocity * deltaTime
    particle.velocity.x += sx
    particle.velocity.y += sy
  }

  getName() {
    return BehaviourNames.SHEAR_FLOW_BEHAVIOUR
  }

  getProps(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      priority: this.priority,
      pivot: { x: this.pivot.x, y: this.pivot.y },
      shearYX: this.shearYX,
      shearXY: this.shearXY,
      radius: this.radius,
      oscillationHz: this.oscillationHz,
      blendWithVelocity: this.blendWithVelocity,
      name: this.getName(),
    }
  }
}
