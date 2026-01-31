import { Point } from '../util'
import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'

/**
 * OrbitBehaviour makes particles orbit around a center with optional spiral (radius change over time).
 */
export default class OrbitBehaviour extends Behaviour {
  enabled = true
  priority = 45

  center = new Point(0, 0)
  baseRadius = 100
  radiusVariance = 0
  angularSpeed = 1
  spiralRate = 0
  /** Start angle variance (radians) */
  angleVariance = Math.PI * 2
  private particleAngle: Map<number, number> = new Map()
  private particleRadius: Map<number, number> = new Map()

  init = (particle: Particle) => {
    if (!this.enabled) return
    const angle = Math.random() * Math.PI * 2
    this.particleAngle.set(particle.uid, angle)
    const radius =
      this.baseRadius + (this.radiusVariance > 0 ? (Math.random() - 0.5) * 2 * this.radiusVariance : 0)
    this.particleRadius.set(particle.uid, Math.max(1, radius))
  }

  apply = (particle: Particle, deltaTime: number) => {
    if (!this.enabled || particle.skipPositionBehaviour) return

    let angle = this.particleAngle.get(particle.uid) ?? 0
    let radius = this.particleRadius.get(particle.uid) ?? this.baseRadius

    angle += this.angularSpeed * deltaTime
    radius += this.spiralRate * deltaTime
    radius = Math.max(1, radius)

    this.particleAngle.set(particle.uid, angle)
    this.particleRadius.set(particle.uid, radius)

    particle.movement.x = this.center.x + Math.cos(angle) * radius
    particle.movement.y = this.center.y + Math.sin(angle) * radius
  }

  onParticleRemoved = (particle: Particle) => {
    this.particleAngle.delete(particle.uid)
    this.particleRadius.delete(particle.uid)
  }

  getName() {
    return BehaviourNames.ORBIT_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      center: { x: this.center.x, y: this.center.y },
      baseRadius: this.baseRadius,
      radiusVariance: this.radiusVariance,
      angularSpeed: this.angularSpeed,
      spiralRate: this.spiralRate,
      angleVariance: this.angleVariance,
      name: this.getName(),
    }
  }
}
