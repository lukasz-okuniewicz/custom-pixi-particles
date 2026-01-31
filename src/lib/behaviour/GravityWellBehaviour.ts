import { Point } from '../util'
import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'

/**
 * GravityWellBehaviour applies inverse-square (or configurable) pull toward a point with optional kill radius.
 */
export default class GravityWellBehaviour extends Behaviour {
  enabled = true
  priority = 48

  center = new Point(0, 0)
  strength = 500
  /** Exponent for falloff: 2 = inverse square */
  falloffExponent = 2
  maxSpeed = 800
  /** Particles inside this radius can be killed or absorbed */
  killRadius = 0
  killOnEnter = false
  minDistance = 1

  init = () => {
    //
  }

  apply = (particle: Particle, deltaTime: number) => {
    if (!this.enabled || particle.skipPositionBehaviour) return

    const dx = this.center.x - particle.movement.x
    const dy = this.center.y - particle.movement.y
    const distSq = dx * dx + dy * dy
    const dist = Math.sqrt(distSq) || this.minDistance

    if (this.killRadius > 0 && dist < this.killRadius && this.killOnEnter) {
      particle.lifeTime = particle.maxLifeTime
      return
    }

    const accel = this.strength / Math.pow(dist, this.falloffExponent)
    const ax = (dx / dist) * accel * deltaTime
    const ay = (dy / dist) * accel * deltaTime

    particle.velocity.x += ax
    particle.velocity.y += ay

    const speed = Math.sqrt(
      particle.velocity.x * particle.velocity.x + particle.velocity.y * particle.velocity.y,
    )
    if (this.maxSpeed > 0 && speed > this.maxSpeed) {
      const scale = this.maxSpeed / speed
      particle.velocity.x *= scale
      particle.velocity.y *= scale
    }
  }

  getName() {
    return BehaviourNames.GRAVITY_WELL_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      center: { x: this.center.x, y: this.center.y },
      strength: this.strength,
      falloffExponent: this.falloffExponent,
      maxSpeed: this.maxSpeed,
      killRadius: this.killRadius,
      killOnEnter: this.killOnEnter,
      minDistance: this.minDistance,
      name: this.getName(),
    }
  }
}
