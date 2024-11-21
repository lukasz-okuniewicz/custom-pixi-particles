import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'

/**
 * RotationBehaviour is a Behaviour class used to control the rotation of particles.
 * @extends Behaviour
 */
export default class RotationBehaviour extends Behaviour {
  enabled = false
  priority = 0
  rotation = 0 // Base rotation speed
  variance = 0 // Variance in rotation speed
  oscillate = false // Enable oscillation
  oscillationSpeed = 1 // Speed of oscillation
  oscillationAmplitude = 0 // Amplitude of oscillation
  useNoise = false // Use Perlin noise for rotation
  noiseScale = 0.1 // Scale of Perlin noise
  acceleration = 0 // Rotation acceleration (positive or negative)
  clockwise = true // Clockwise or counterclockwise rotation

  /**
   * Initialise the Behaviour for a particle
   * @param {Particle} particle - The particle to be initialised
   */
  init = (particle: Particle) => {
    if (!this.enabled) return

    // Set base rotation delta with variance
    const baseRotation = this.rotation + this.varianceFrom(this.variance)
    particle.rotationDelta = this.clockwise ? baseRotation : -baseRotation

    // Initialize acceleration if enabled
    particle.rotationAcceleration = this.acceleration
  }

  /**
   * Applies the Behaviour to a particle
   * @param {Particle} particle - The particle to apply the Behaviour to
   * @param {number} deltaTime - The delta time of the runtime
   */
  apply = (particle: Particle, deltaTime: number) => {
    if (!this.enabled) return
    if (particle.skipRotationBehaviour) return

    let deltaRotation = particle.rotationDelta

    // Apply oscillation effect
    if (this.oscillate) {
      const oscillation = Math.sin(particle.lifeTime * this.oscillationSpeed) * this.oscillationAmplitude
      deltaRotation += oscillation
    }

    // Apply noise-based rotation
    if (this.useNoise) {
      const noiseValue = this.pseudoRandomNoise(particle.lifeTime * this.noiseScale)
      deltaRotation += noiseValue * 2 - 1 // Map noise from [0,1] to [-1,1]
    }

    // Apply rotation acceleration
    if (particle.rotationAcceleration) {
      particle.rotationDelta += particle.rotationAcceleration * deltaTime
      deltaRotation = particle.rotationDelta
    }

    // Update particle rotation
    particle.rotation += deltaRotation * deltaTime
  }

  /**
   * Pseudo-random noise generator for smooth transitions
   * @param {number} seed - Input seed for generating noise
   * @returns {number} - Noise value between 0 and 1
   */
  pseudoRandomNoise(seed: number): number {
    const x = Math.sin(seed * 10000) * 10000
    return x - Math.floor(x)
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
      oscillate: this.oscillate,
      oscillationSpeed: this.oscillationSpeed,
      oscillationAmplitude: this.oscillationAmplitude,
      useNoise: this.useNoise,
      noiseScale: this.noiseScale,
      acceleration: this.acceleration,
      clockwise: this.clockwise,
      name: this.getName(),
    }
  }
}
