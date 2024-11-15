import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'

/**
 * RotationBehaviour is a Behaviour class used to control the rotation of particles.
 * @extends Behaviour
 */
export default class RotationBehaviour extends Behaviour {
  /**
   * @type {boolean} enabled - Enable or disable the Behaviour
   */
  enabled = false

  /**
   * @type {number} priority - The priority of the Behaviour.
   */
  priority = 0

  /**
   * @type {number} rotation - The amount of rotation to apply on each particle.
   */
  rotation = 0

  /**
   * @type {number} variance - The amount of variance to apply on the particle's rotation.
   */
  variance = 0

  /**
   * Initialise the Behaviour for a particle
   * @param {Particle} particle - The particle to be initialised
   */
  init = (particle: Particle) => {
    if (!this.enabled) return
    particle.rotationDelta = this.rotation + this.varianceFrom(this.variance)
  }

  /**
   * Applies the Behaviour to a particle
   * @param {Particle} particle - The particle to apply the Behaviour to
   * @param {number} deltaTime - The delta time of the runtime
   */
  apply = (particle: Particle, deltaTime: number) => {
    if (!this.enabled) return
    if (particle.skipRotationBehaviour) return
    particle.rotation += particle.rotationDelta * deltaTime
  }

  /**
   * Gets the name of the Behaviour
   * @returns {string} - The name of the Behaviour
   */
  getName() {
    return BehaviourNames.ROTATION_BEHAVIOUR
  }

  /**
   * Gets the properties of the Behaviour
   * @returns {object} - The properties of the Behaviour
   */
  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      rotation: this.rotation,
      variance: this.variance,
      name: this.getName(),
    }
  }
}
