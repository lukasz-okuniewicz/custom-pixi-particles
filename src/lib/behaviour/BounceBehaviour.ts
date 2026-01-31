import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'

/**
 * BounceBehaviour makes particles bounce off rectangular or circular bounds.
 * Useful for breakout-style games, pinball, ball physics, and contained effects.
 */
export default class BounceBehaviour extends Behaviour {
  enabled = true
  priority = 50

  /** Bounds mode: 'rectangle' uses minX/maxX/minY/maxY; 'circle' uses center + radius */
  mode: 'rectangle' | 'circle' = 'rectangle'
  /** Rectangle bounds (used when mode is 'rectangle') */
  minX = -400
  maxX = 400
  minY = -300
  maxY = 300
  /** Circle bounds (used when mode is 'circle') */
  center = { x: 0, y: 0 }
  radius = 300
  /** Bounciness 0–1 (1 = full bounce, 0 = stick) */
  bounciness = 1
  /** Optional: kill particle after this many bounces (-1 = infinite) */
  maxBounces = -1

  private _bounceCount: Map<number, number> = new Map()

  init(particle: Particle) {
    if (this.maxBounces >= 0) {
      this._bounceCount.set(particle.uid, 0)
    }
  }

  onParticleRemoved = (particle: Particle) => {
    this._bounceCount.delete(particle.uid)
  }

  apply(particle: Particle) {
    if (!this.enabled) return

    let bounced = false
    if (this.mode === 'rectangle') {
      bounced = this.bounceRectangle(particle)
    } else {
      bounced = this.bounceCircle(particle)
    }

    if (bounced && this.maxBounces >= 0) {
      const count = (this._bounceCount.get(particle.uid) ?? 0) + 1
      this._bounceCount.set(particle.uid, count)
      if (count > this.maxBounces) {
        particle.lifeTime = particle.maxLifeTime
      }
    }
  }

  private bounceRectangle(particle: Particle): boolean {
    let bounced = false
    if (particle.x <= this.minX) {
      particle.x = this.minX
      particle.movement.x = this.minX
      particle.velocity.x = Math.abs(particle.velocity.x) * this.bounciness
      bounced = true
    }
    if (particle.x >= this.maxX) {
      particle.x = this.maxX
      particle.movement.x = this.maxX
      particle.velocity.x = -Math.abs(particle.velocity.x) * this.bounciness
      bounced = true
    }
    if (particle.y <= this.minY) {
      particle.y = this.minY
      particle.movement.y = this.minY
      particle.velocity.y = Math.abs(particle.velocity.y) * this.bounciness
      bounced = true
    }
    if (particle.y >= this.maxY) {
      particle.y = this.maxY
      particle.movement.y = this.maxY
      particle.velocity.y = -Math.abs(particle.velocity.y) * this.bounciness
      bounced = true
    }
    return bounced
  }

  private bounceCircle(particle: Particle): boolean {
    const dx = particle.x - this.center.x
    const dy = particle.y - this.center.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < this.radius) return false
    const nx = dx / dist
    const ny = dy / dist
    particle.x = this.center.x + nx * this.radius
    particle.y = this.center.y + ny * this.radius
    particle.movement.x = particle.x
    particle.movement.y = particle.y
    const dot = particle.velocity.x * nx + particle.velocity.y * ny
    particle.velocity.x = (particle.velocity.x - 2 * dot * nx) * this.bounciness
    particle.velocity.y = (particle.velocity.y - 2 * dot * ny) * this.bounciness
    return true
  }

  getName() {
    return BehaviourNames.BOUNCE_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      mode: this.mode,
      minX: this.minX,
      maxX: this.maxX,
      minY: this.minY,
      maxY: this.maxY,
      center: this.center,
      radius: this.radius,
      bounciness: this.bounciness,
      maxBounces: this.maxBounces,
      name: this.getName(),
    }
  }
}
