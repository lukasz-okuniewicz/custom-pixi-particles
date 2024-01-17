import Behaviour from './Behaviour'
import math from '../util/maths'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'

/**
 * AngularVelocityBehaviour is a subclass of Behaviour and defines the angular velocity of a particle.
 *
 * @class AngularVelocityBehaviour
 * @extends {Behaviour}
 */
export default class AngularVelocityBehaviour extends Behaviour {
  protected priority: number = 100
  private enabled: boolean = false
  private degrees: number = 0
  private degreesVariance: number = 0
  private maxRadius: number = 0
  private maxRadiusVariance: number = 0
  private minRadius: number = 0
  private minRadiusVariance: number = 0

  /**
   * Initializes particle properties of the behaviour
   *
   * @param {Particle} particle - The current particle
   * @memberof AngularVelocityBehaviour
   */
  init = (particle: Particle) => {
    particle.radiansPerSecond = math.degreesToRadians(this.degrees + this.varianceFrom(this.degreesVariance))
    const radiusStart = this.maxRadius + this.varianceFrom(this.maxRadiusVariance)
    particle.radiusStart = radiusStart
    particle.radiusEnd = this.minRadius + this.varianceFrom(this.minRadiusVariance)

    particle.x = 0
    particle.y = 0
    particle.radius = radiusStart
    particle.angle = 0
  }

  /**
   * Applies the behaviour to the particle
   *
   * @param {Particle} particle - The current particle
   * @param {number} deltaTime - Time elapsed since the last frame
   * @memberof AngularVelocityBehaviour
   */
  apply = (particle: Particle, deltaTime: number) => {
    const { radiusStart, radiusEnd, radiansPerSecond, lifeProgress } = particle
    const velocityAngle = particle.velocityAngle + radiansPerSecond * deltaTime
    const radius = radiusStart + (radiusEnd - radiusStart) * lifeProgress
    const movementX = Math.cos(velocityAngle) * radius
    const movementY = Math.sin(velocityAngle) * radius

    particle.velocityAngle = velocityAngle
    particle.radius = radius
    particle.movement.x = movementX
    particle.movement.y = movementY
    particle.x = movementX
    particle.y = movementY
  }

  /**
   * Returns the name of the behaviour
   *
   * @returns {string} Name of the behaviour
   * @memberof AngularVelocityBehaviour
   */
  getName() {
    return BehaviourNames.ANGULAR_BEHAVIOUR
  }

  /**
   * Returns the properties of the behaviour
   *
   * @returns {object} Properties of the behaviour
   * @memberof AngularVelocityBehaviour
   */
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
