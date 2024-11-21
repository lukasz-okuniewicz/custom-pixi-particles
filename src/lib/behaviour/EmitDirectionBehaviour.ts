import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'

let _tmp = 0

export default class EmitDirectionBehaviour extends Behaviour {
  enabled = true
  priority = 0
  angle = 0
  variance = 0

  // New properties
  oscillate = false // Enable directional oscillation
  oscillationSpeed = 1 // Speed of oscillation
  oscillationAmplitude = 0 // Amplitude of oscillation
  useNoise = false // Use Perlin noise for direction changes
  noiseScale = 0.1 // Scale of the noise effect
  velocityScaling = false // Scale velocity based on life progress

  /**
   * Initializes the particle's direction.
   * @param {Particle} particle - The particle that is being initialized.
   * @memberof EmitDirectionBehaviour
   */
  init = (particle: Particle) => {
    if (!this.enabled) return

    const baseAngle = this.angle + this.varianceFrom(this.variance)

    particle.initialDirectionCos = Math.cos(baseAngle)
    particle.initialDirectionSin = Math.sin(baseAngle)
    particle.directionCos = particle.initialDirectionCos
    particle.directionSin = particle.initialDirectionSin

    particle.velocityScale = 1
  }

  /**
   * Applies the behavior to the particle.
   * @param {Particle} particle - The particle to which the behavior is being applied.
   * @param {number} deltaTime - The amount of time since the behavior was last applied.
   * @memberof EmitDirectionBehaviour
   */
  apply = (particle: Particle, deltaTime: number) => {
    if (!this.enabled) return
    if (particle.skipEmitDirectionBehaviour) return

    const { x, y, directionSin, directionCos, lifeProgress } = particle

    // Apply directional oscillation
    if (this.oscillate) {
      const oscillation = Math.sin(particle.lifeTime * this.oscillationSpeed) * this.oscillationAmplitude
      particle.directionCos = Math.cos(oscillation)
      particle.directionSin = Math.sin(oscillation)
    }

    // Apply Perlin noise-based direction changes
    if (this.useNoise) {
      const noiseValue = this.pseudoRandomNoise(particle.lifeTime * this.noiseScale)
      const noiseAngle = noiseValue * 2 * Math.PI // Map noise to full circle
      particle.directionCos = Math.cos(noiseAngle)
      particle.directionSin = Math.sin(noiseAngle)
    }

    // Scale velocity based on life progress
    if (this.velocityScaling) {
      particle.velocityScale = lifeProgress
    }

    // Apply directional movement
    _tmp = directionCos * x - directionSin * y
    particle.y = directionSin * x + directionCos * y
    particle.x = _tmp

    // Scale movement
    particle.x *= particle.velocityScale
    particle.y *= particle.velocityScale
  }

  pseudoRandomNoise(seed: number): number {
    const prime = 2654435761 // A prime constant
    const x = Math.sin(seed * prime) * 10000 // Scale the randomness
    return x - Math.floor(x) // Ensure result is between 0 and 1
  }

  /**
   * Gets the name of the behavior.
   * @returns {BehaviourNames.EMIT_DIRECTION}
   * @memberof EmitDirectionBehaviour
   */
  getName() {
    return BehaviourNames.EMIT_DIRECTION
  }

  /**
   * Gets the properties of the behavior.
   * @returns {object} - The properties of the behavior.
   * @memberof EmitDirectionBehaviour
   */
  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      angle: this.angle,
      variance: this.variance,
      oscillate: this.oscillate,
      oscillationSpeed: this.oscillationSpeed,
      oscillationAmplitude: this.oscillationAmplitude,
      useNoise: this.useNoise,
      noiseScale: this.noiseScale,
      velocityScaling: this.velocityScaling,
      name: this.getName(),
    }
  }
}
