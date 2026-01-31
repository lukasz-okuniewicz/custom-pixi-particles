import { Point } from '../util'
import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'

/**
 * ConstrainToShapeBehaviour softly constrains or clamps particle positions to a shape (circle, rect).
 */
export default class ConstrainToShapeBehaviour extends Behaviour {
  enabled = true
  priority = 40

  /** 'circle' | 'rectangle' */
  shapeType: 'circle' | 'rectangle' = 'circle'
  center = new Point(0, 0)
  radius = 200
  /** For rectangle: half-width, half-height */
  halfWidth = 150
  halfHeight = 100
  /** 0 = hard clamp, 1 = full soft blend */
  softness = 0.5
  bounce = false

  init = () => {
    //
  }

  apply = (particle: Particle) => {
    if (!this.enabled || particle.skipPositionBehaviour) return

    const dx = particle.movement.x - this.center.x
    const dy = particle.movement.y - this.center.y

    if (this.shapeType === 'circle') {
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= this.radius) return
      const excess = dist - this.radius
      const pull = excess * (1 - this.softness)
      const nx = dx / dist
      const ny = dy / dist
      particle.movement.x -= nx * pull
      particle.movement.y -= ny * pull
      if (this.bounce) {
        const vdot = particle.velocity.x * nx + particle.velocity.y * ny
        if (vdot > 0) {
          particle.velocity.x -= nx * vdot * 2
          particle.velocity.y -= ny * vdot * 2
        }
      }
    } else {
      let ox = 0,
        oy = 0
      if (dx > this.halfWidth) ox = (dx - this.halfWidth) * (1 - this.softness)
      else if (dx < -this.halfWidth) ox = (dx + this.halfWidth) * (1 - this.softness)
      if (dy > this.halfHeight) oy = (dy - this.halfHeight) * (1 - this.softness)
      else if (dy < -this.halfHeight) oy = (dy + this.halfHeight) * (1 - this.softness)
      particle.movement.x -= ox
      particle.movement.y -= oy
      if (this.bounce && (ox !== 0 || oy !== 0)) {
        if (ox !== 0) particle.velocity.x *= -0.5
        if (oy !== 0) particle.velocity.y *= -0.5
      }
    }
  }

  getName() {
    return BehaviourNames.CONSTRAIN_TO_SHAPE_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      shapeType: this.shapeType,
      center: { x: this.center.x, y: this.center.y },
      radius: this.radius,
      halfWidth: this.halfWidth,
      halfHeight: this.halfHeight,
      softness: this.softness,
      bounce: this.bounce,
      name: this.getName(),
    }
  }
}
