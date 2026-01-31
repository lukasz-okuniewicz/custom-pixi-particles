import { Point } from '../util'
import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'

/**
 * TrailBehaviour modulates alpha (and optionally scale) by recent speed for comet-tail / motion-blur feel.
 */
export default class TrailBehaviour extends Behaviour {
  enabled = true
  priority = -20

  /** Alpha multiplier at zero speed (0-1) */
  minAlpha = 0.2
  /** Alpha multiplier at max speed (0-1) */
  maxAlpha = 1
  /** Speed above which we use maxAlpha */
  speedForMaxAlpha = 200
  scaleBySpeed = false
  minScale = 0.5
  maxScale = 1
  private prevMovement: Map<number, Point> = new Map()

  init = (particle: Particle) => {
    if (!this.enabled) return
    const p = new Point(particle.movement.x, particle.movement.y)
    this.prevMovement.set(particle.uid, p)
  }

  apply = (particle: Particle, deltaTime: number) => {
    if (!this.enabled) return

    const prev = this.prevMovement.get(particle.uid)
    if (!prev) return

    const dx = particle.movement.x - prev.x
    const dy = particle.movement.y - prev.y
    const speed = deltaTime > 0 ? Math.sqrt(dx * dx + dy * dy) / deltaTime : 0

    const t = Math.min(1, speed / this.speedForMaxAlpha)
    const alphaMult = this.minAlpha + (this.maxAlpha - this.minAlpha) * t
    particle.color.alpha = Math.max(0, Math.min(1, particle.color.alpha * alphaMult))

    if (this.scaleBySpeed) {
      const scaleMult = this.minScale + (this.maxScale - this.minScale) * t
      particle.size.x = Math.max(0.01, particle.size.x * scaleMult)
      particle.size.y = Math.max(0.01, particle.size.y * scaleMult)
    }

    prev.x = particle.movement.x
    prev.y = particle.movement.y
  }

  onParticleRemoved = (particle: Particle) => {
    this.prevMovement.delete(particle.uid)
  }

  getName() {
    return BehaviourNames.TRAIL_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      minAlpha: this.minAlpha,
      maxAlpha: this.maxAlpha,
      speedForMaxAlpha: this.speedForMaxAlpha,
      scaleBySpeed: this.scaleBySpeed,
      minScale: this.minScale,
      maxScale: this.maxScale,
      name: this.getName(),
    }
  }
}
