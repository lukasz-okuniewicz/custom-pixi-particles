import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'

/**
 * HomingBehaviour steers particles toward a target point over time.
 * Good for homing missiles, collectibles flying to the player, or guided projectiles.
 */
export default class HomingBehaviour extends Behaviour {
  enabled = true
  priority = 200

  /** Target position (can be updated at runtime for e.g. player position) */
  target = { x: 0, y: 0 }
  /** How strongly velocity is steered toward target per second (e.g. 2–10) */
  strength = 5
  /** Optional max speed clamp (0 = no clamp) */
  maxSpeed = 0
  /** Delay before homing starts (seconds) */
  delay = 0

  init = () => {
    //
  }

  apply(particle: Particle, deltaTime: number) {
    if (!this.enabled) return
    if (particle.lifeProgress < this.delay / Math.max(0.001, particle.maxLifeTime)) return

    const dx = this.target.x - particle.movement.x
    const dy = this.target.y - particle.movement.y
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 0.0001) return

    const nx = dx / len
    const ny = dy / len
    const steer = this.strength * deltaTime
    particle.velocity.x += nx * steer
    particle.velocity.y += ny * steer

    if (this.maxSpeed > 0) {
      const vx = particle.velocity.x
      const vy = particle.velocity.y
      const speed = Math.sqrt(vx * vx + vy * vy)
      if (speed > this.maxSpeed) {
        const scale = this.maxSpeed / speed
        particle.velocity.x = vx * scale
        particle.velocity.y = vy * scale
      }
    }
  }

  getName() {
    return BehaviourNames.HOMING_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      target: this.target,
      strength: this.strength,
      maxSpeed: this.maxSpeed,
      delay: this.delay,
      name: this.getName(),
    }
  }
}
