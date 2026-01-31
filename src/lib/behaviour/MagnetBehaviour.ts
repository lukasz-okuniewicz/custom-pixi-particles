import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'

/**
 * MagnetBehaviour pulls particles toward a point when they are within a radius.
 * Classic "coin magnet" or pickup collection feel in games.
 */
export default class MagnetBehaviour extends Behaviour {
  enabled = true
  priority = 200

  /** Center of the magnet (e.g. player position) */
  center = { x: 0, y: 0 }
  /** Radius within which particles are pulled */
  radius = 150
  /** Pull strength (acceleration per second when at center) */
  strength = 400
  /** Falloff: 1 = linear, 2 = quadratic (stronger near center) */
  falloffExponent = 1
  /** Optional max speed when being pulled (0 = no limit) */
  maxSpeed = 500

  init = () => {
    //
  }

  apply(particle: Particle, deltaTime: number) {
    if (!this.enabled) return

    const dx = this.center.x - particle.movement.x
    const dy = this.center.y - particle.movement.y
    const distSq = dx * dx + dy * dy
    const dist = Math.sqrt(distSq)
    if (dist > this.radius || dist < 0.001) return

    const t = 1 - dist / this.radius
    const force = this.strength * Math.pow(t, this.falloffExponent) * deltaTime
    const nx = dx / dist
    const ny = dy / dist
    particle.velocity.x += nx * force
    particle.velocity.y += ny * force

    if (this.maxSpeed > 0) {
      const vx = particle.velocity.x
      const vy = particle.velocity.y
      const speed = Math.sqrt(vx * vx + vy * vy)
      if (speed > this.maxSpeed) {
        particle.velocity.x = (vx / speed) * this.maxSpeed
        particle.velocity.y = (vy / speed) * this.maxSpeed
      }
    }
  }

  getName() {
    return BehaviourNames.MAGNET_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      center: this.center,
      radius: this.radius,
      strength: this.strength,
      falloffExponent: this.falloffExponent,
      maxSpeed: this.maxSpeed,
      name: this.getName(),
    }
  }
}
