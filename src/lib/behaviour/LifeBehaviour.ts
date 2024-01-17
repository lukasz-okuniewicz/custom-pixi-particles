import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'

/**
 * This class is responsible for managing the lifetimes of particles.
 * It sets the maximum lifetime of the particle and updates its progress.
 *
 * @extends Behaviour
 */
export default class LifeBehaviour extends Behaviour {
  /**
   * Whether or not this behaviour is enabled.
   *
   * @type {boolean}
   */
  enabled = true

  /**
   * The priority of this behaviour.
   *
   * @type {number}
   */
  priority = 10000

  /**
   * The maximum life time of the particle that this behaviour will set.
   *
   * @type {number}
   */
  maxLifeTime = 0

  /**
   * The variance of the particle's life time.
   *
   * @type {number}
   */
  timeVariance = 0

  /**
   * Sets the particle's life time and maximum life time.
   *
   * @param {Particle} particle - The particle to set the life time of.
   * @returns {void}
   */
  init = (particle: Particle) => {
    particle.lifeTime = 0
    particle.lifeProgress = 0
    particle.maxLifeTime = Math.max(this.maxLifeTime + this.varianceFrom(this.timeVariance), 0.0)
  }

  /**
   * Updates the particle's life time and progress.
   *
   * @param {Particle} particle - The particle to update.
   * @param {number} deltaTime - The time since the last update.
   * @returns {void}
   */
  apply = (particle: Particle, deltaTime: number) => {
    const { maxLifeTime } = particle
    const lifeTime = particle.lifeTime + deltaTime

    particle.lifeTime = lifeTime

    if (maxLifeTime > 0) {
      particle.lifeProgress = Math.min(1.0, lifeTime / maxLifeTime)
    }
  }

  /**
   * Returns the name of this behaviour.
   *
   * @returns {string} - The name of the behaviour.
   */
  getName() {
    return BehaviourNames.LIFE_BEHAVIOUR
  }

  /**
   * Returns the properties of the behaviour.
   *
   * @returns {Object} - The properties of the behaviour.
   */
  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      maxLifeTime: this.maxLifeTime,
      timeVariance: this.timeVariance,
      name: this.getName(),
    }
  }
}
