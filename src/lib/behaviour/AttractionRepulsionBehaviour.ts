import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'

/**
 * AttractionRepulsionBehaviour applies attraction or repulsion forces to particles
 * without overriding other position-related behaviors.
 * @extends Behaviour
 */
export default class AttractionRepulsionBehaviour extends Behaviour {
  enabled = true
  priority = 200 // Ensure this runs after PositionBehaviour if needed

  /**
   * List of influence points affecting particles.
   * Each point: { point: Point, strength: number, range: number }
   */
  influencePoints = []

  /**
   * Initializes the particle, but does not modify position directly.
   * @param {Particle} particle - The particle to initialize.
   */
  init = (particle: Particle) => {
    // Initialization logic if needed.
  }

  /**
   * Applies attraction or repulsion forces to the particle additively.
   * @param {Particle} particle - The particle to apply the behavior to.
   * @param {number} deltaTime - Time elapsed since the last frame.
   */
  apply = (particle: Particle, deltaTime: number) => {
    if (!this.enabled || particle.skipPositionBehaviour || particle.skipAttractionRepulsionBehaviour) return

    // Accumulate influence forces
    let totalForceX = 0
    let totalForceY = 0

    this.influencePoints.forEach(({ point, strength, range }) => {
      // @ts-ignore
      const dx = point.x - particle.x
      // @ts-ignore
      const dy = point.y - particle.y
      const distanceSquared = dx * dx + dy * dy

      if (distanceSquared > range * range || distanceSquared === 0) return

      const distance = Math.sqrt(distanceSquared)
      const force = strength * (1 - distance / range) * deltaTime

      const normalizedDx = dx / distance
      const normalizedDy = dy / distance

      totalForceX += normalizedDx * force
      totalForceY += normalizedDy * force
    })

    // Add forces to particle velocity (or acceleration for smoother effects)
    particle.velocity.x += totalForceX
    particle.velocity.y += totalForceY

    // Apply updated velocity to position additively
    particle.x += particle.velocity.x * deltaTime
    particle.y += particle.velocity.y * deltaTime
  }

  /**
   * Gets the name of the behavior.
   * @returns {string} - The name of the behavior.
   */
  getName() {
    return BehaviourNames.ATTRACTION_REPULSION_BEHAVIOUR
  }

  /**
   * Gets the properties of the behavior.
   * @returns {object} - The properties of the behavior.
   */
  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      influencePoints: this.influencePoints,
      name: this.getName(),
    }
  }
}
