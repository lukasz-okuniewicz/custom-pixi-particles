import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'

/**
 * FloatUpBehaviour adds a constant drift (e.g. upward) and optional fade-out over life.
 * Perfect for damage numbers, floating text, rising sparks, or floating collectible hints.
 */
export default class FloatUpBehaviour extends Behaviour {
  enabled = true
  /** Run after SizeBehaviour when enabled; shrink works with or without it */
  priority = -10

  /** Drift direction in degrees (0 = right, 90 = up) */
  direction = 90
  /** Drift speed in units per second */
  speed = 80
  /** Fade out alpha over life (1 = start visible, end transparent) */
  fadeOut = true
  /** Optionally shrink size over life */
  shrinkOverLife = false

  init = () => {
    //
  }

  apply(particle: Particle, deltaTime: number) {
    if (!this.enabled) return

    const rad = (this.direction * Math.PI) / 180
    const vx = Math.cos(rad) * this.speed * deltaTime
    const vy = Math.sin(rad) * this.speed * deltaTime
    particle.x += vx
    particle.y += vy
    particle.movement.x += vx
    particle.movement.y += vy

    if (this.fadeOut && particle.maxLifeTime > 0) {
      particle.color.alpha = 1 - particle.lifeProgress
    }
    if (this.shrinkOverLife) {
      const scale = Math.max(0.01, 1 - particle.lifeProgress)
      const curX = particle.size.x
      const curY = particle.size.y
      const fallback = 1
      const baseX = typeof curX === 'number' && !Number.isNaN(curX) && curX > 0 ? curX : fallback
      const baseY = typeof curY === 'number' && !Number.isNaN(curY) && curY > 0 ? curY : fallback
      particle.size.x = Math.max(0.01, baseX * scale)
      particle.size.y = Math.max(0.01, baseY * scale)
    }
  }

  getName() {
    return BehaviourNames.FLOAT_UP_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      direction: this.direction,
      speed: this.speed,
      fadeOut: this.fadeOut,
      shrinkOverLife: this.shrinkOverLife,
      name: this.getName(),
    }
  }
}
