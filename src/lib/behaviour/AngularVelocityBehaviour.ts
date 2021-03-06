import Behaviour from './Behaviour'
import math from '../util/maths'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'

export default class AngularVelocityBehaviour extends Behaviour {
  private enabled: boolean = false
  private degrees: number = 0
  private degreesVariance: number = 0
  private maxRadius: number = 0
  private maxRadiusVariance: number = 0
  private minRadius: number = 0
  private minRadiusVariance: number = 0
  protected priority: number = 100

  init = (particle: Particle) => {
    if (!this.enabled) return
    particle.radiansPerSecond = math.degreesToRadians(this.degrees + this.varianceFrom(this.degreesVariance))
    particle.radiusStart = this.maxRadius + this.varianceFrom(this.maxRadiusVariance)
    particle.radiusEnd = this.minRadius + this.varianceFrom(this.minRadiusVariance)

    particle.x = 0
    particle.y = 0
    particle.radius = particle.radiusStart
    particle.angle = 0
  }

  apply = (particle: Particle, deltaTime: number) => {
    if (!this.enabled) return
    particle.velocityAngle += particle.radiansPerSecond * deltaTime
    particle.radius = particle.radiusStart + (particle.radiusEnd - particle.radiusStart) * particle.lifeProgress

    particle.movement.x = Math.cos(particle.velocityAngle) * particle.radius
    particle.movement.y = Math.sin(particle.velocityAngle) * particle.radius

    particle.x = particle.movement.x
    particle.y = particle.movement.y
  }

  getName() {
    return BehaviourNames.ANGULAR_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      degrees: this.degrees,
      degreesVariance: this.degreesVariance,
      maxRadius: this.maxRadius,
      maxRadiusVariance: this.maxRadiusVariance,
      minRadius: this.minRadius,
      minRadiusVariance: this.minRadiusVariance,
      priority: this.priority,
      name: this.getName(),
    }
  }
}
