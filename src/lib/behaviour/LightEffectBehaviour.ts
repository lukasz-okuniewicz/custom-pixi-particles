import { Point } from '../util'
import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'

export default class LightEffectBehaviour extends Behaviour {
  enabled = true
  priority = 100

  lightSource = new Point(0, 0) // Position of the light source
  lightIntensity = 1.0 // Maximum intensity of the light
  lightColor = { r: 255, g: 255, b: 255 } // Light color (white)
  attenuationFactor = 0.002 // Controls light falloff with distance
  ambientLight = 0.2 // Minimum light level

  directionalLight = false // Enable directional light
  direction = new Point(0, 1) // Directional light angle (normalized)
  spreadAngle = Math.PI / 4 // Spread angle for the directional light (in radians)

  volumetricLight = false // Enable volumetric light
  volumetricIntensity = 0.3 // Intensity of volumetric light (glow)
  fogDensity = 0.01 // Fog density for scattering effect

  init = () => {
    //
  }

  apply = (particle: Particle, deltaTime: number) => {
    if (!this.enabled) return

    const dx = particle.movement.x - this.lightSource.x
    const dy = particle.movement.y - this.lightSource.y
    const distanceSquared = dx * dx + dy * dy

    // Distance-based intensity (inverse square law with attenuation)
    const intensity = this.lightIntensity / (1 + this.attenuationFactor * distanceSquared)

    // Directional light effect
    let directionalFactor = 1
    if (this.directionalLight) {
      const normalizedDX = dx / Math.sqrt(distanceSquared)
      const normalizedDY = dy / Math.sqrt(distanceSquared)

      const dotProduct = normalizedDX * this.direction.x + normalizedDY * this.direction.y
      const angle = Math.acos(dotProduct)

      // Apply spread angle
      if (angle > this.spreadAngle) {
        directionalFactor = 0 // Outside the spread
      } else {
        directionalFactor = 1 - angle / this.spreadAngle // Gradual falloff
      }
    }

    // Combine intensity and directional factor
    const effectiveIntensity = Math.max(this.ambientLight, Math.min(intensity * directionalFactor, this.lightIntensity))

    // Blend particle color with light color
    particle.color.r = Math.min(255, particle.color.r * effectiveIntensity * (this.lightColor.r / 255))
    particle.color.g = Math.min(255, particle.color.g * effectiveIntensity * (this.lightColor.g / 255))
    particle.color.b = Math.min(255, particle.color.b * effectiveIntensity * (this.lightColor.b / 255))

    // Adjust alpha for glow
    particle.color.alpha = Math.min(1, particle.color.alpha * effectiveIntensity)

    // Volumetric light effect
    if (this.volumetricLight) {
      const fogEffect = Math.exp(-this.fogDensity * Math.sqrt(distanceSquared))
      const volumetricFactor = this.volumetricIntensity * fogEffect
      particle.color.r = Math.min(255, particle.color.r + volumetricFactor * this.lightColor.r)
      particle.color.g = Math.min(255, particle.color.g + volumetricFactor * this.lightColor.g)
      particle.color.b = Math.min(255, particle.color.b + volumetricFactor * this.lightColor.b)
      particle.color.alpha = Math.min(1, particle.color.alpha + volumetricFactor)
    }
  }

  /**
   * Gets the name of the behaviour
   * @return {string} The name of the behaviour
   */
  getName() {
    return BehaviourNames.LIGHT_EFFECT_BEHAVIOUR
  }

  /**
   * @description Retrieves the properties of the object.
   * @returns {Object} The properties of the object.
   */
  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      lightSource: { x: this.lightSource.x, y: this.lightSource.y },
      lightIntensity: this.lightIntensity,
      lightColor: this.lightColor,
      attenuationFactor: this.attenuationFactor,
      ambientLight: this.ambientLight,
      directionalLight: this.directionalLight,
      direction: { x: this.direction.x, y: this.direction.y },
      spreadAngle: this.spreadAngle,
      volumetricLight: this.volumetricLight,
      volumetricIntensity: this.volumetricIntensity,
      fogDensity: this.fogDensity,
      name: this.getName(),
    }
  }
}
