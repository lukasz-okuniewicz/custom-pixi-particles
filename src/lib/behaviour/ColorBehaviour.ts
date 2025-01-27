import { Color } from '../util'
import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'

export default class ColorBehaviour extends Behaviour {
  enabled = false
  priority = 0
  start = new Color()
  end = new Color()
  startVariance = new Color(0, 0, 0, 0)
  endVariance = new Color(0, 0, 0, 0)
  sinus = false

  // New properties
  colorStops: Color[] = [] // Multi-gradient stops
  usePerlin = false // Enable Perlin noise-based color changes
  pulseSpeed = 0 // Speed of the pulse effect
  pulseIntensity = 0 // Intensity of the pulse effect
  mirrorTransition = false // Mirror the color transition midway
  fadeToGray = false // Desaturate color over time
  fadeToTransparent = false // Fade alpha over time
  flickerIntensity = 0 // Intensity of random flickering

  init = (particle: Particle) => {
    if (!this.enabled) return

    function clamp(val: number, min: number, max: number) {
      return Math.min(Math.max(val, min), max)
    }

    // Copy base color
    particle.colorStart.copyFrom(this.start)
    // Add random variance
    particle.colorStart.r += this.varianceFrom(this.startVariance.r)
    particle.colorStart.g += this.varianceFrom(this.startVariance.g)
    particle.colorStart.b += this.varianceFrom(this.startVariance.b)
    particle.colorStart.alpha += this.varianceFrom(this.startVariance.alpha)

    // Clamp color channels to [0..255]
    particle.colorStart.r = clamp(particle.colorStart.r, 0, 255)
    particle.colorStart.g = clamp(particle.colorStart.g, 0, 255)
    particle.colorStart.b = clamp(particle.colorStart.b, 0, 255)
    particle.colorStart.alpha = clamp(particle.colorStart.alpha, 0, 255)

    // Repeat for colorEnd
    particle.colorEnd.copyFrom(this.end)
    particle.colorEnd.r += this.varianceFrom(this.endVariance.r)
    particle.colorEnd.g += this.varianceFrom(this.endVariance.g)
    particle.colorEnd.b += this.varianceFrom(this.endVariance.b)
    particle.colorEnd.alpha += this.varianceFrom(this.endVariance.alpha)

    particle.colorEnd.r = clamp(particle.colorEnd.r, 0, 255)
    particle.colorEnd.g = clamp(particle.colorEnd.g, 0, 255)
    particle.colorEnd.b = clamp(particle.colorEnd.b, 0, 255)
    particle.colorEnd.alpha = clamp(particle.colorEnd.alpha, 0, 255)

    // Initialize particle color to start
    particle.color.copyFrom(particle.colorStart)
  }

  apply = (particle: Particle) => {
    if (!this.enabled) return
    if (particle.skipColorBehaviour) return

    const { lifeProgress } = particle

    // Multi-gradient color transitions
    if (this.colorStops.length > 0) {
      this.applyColorStops(particle, lifeProgress)

      if (this.sinus) {
        particle.color.alpha = Math.sin(lifeProgress * 3.1)
      } else if (this.fadeToTransparent) {
        particle.color.alpha = (1 - lifeProgress) * this.start.alpha
      }
      return
    }

    // Perlin noise color changes
    if (this.usePerlin) {
      this.applyPerlinColor(particle, lifeProgress)
      return
    }

    // Default linear gradient behavior
    const { colorStart, colorEnd } = particle

    let effectiveProgress = lifeProgress

    // Mirror transition if enabled
    if (this.mirrorTransition) {
      effectiveProgress = lifeProgress < 0.5 ? lifeProgress * 2 : (1 - lifeProgress) * 2
    }

    particle.color.copyFrom(colorStart)

    particle.color.r += (colorEnd.r - colorStart.r) * effectiveProgress
    particle.color.g += (colorEnd.g - colorStart.g) * effectiveProgress
    particle.color.b += (colorEnd.b - colorStart.b) * effectiveProgress

    if (!this.sinus) {
      particle.color.alpha += (colorEnd.alpha - colorStart.alpha) * effectiveProgress
    } else {
      if (!this.fadeToTransparent) {
        particle.color.alpha = Math.sin(effectiveProgress * 3.1)
        if (particle.color.alpha > particle.superColorAlphaEnd) {
          particle.color.alpha = particle.superColorAlphaEnd
        }
      }
    }

    // Apply pulse effect if enabled
    if (this.pulseIntensity > 0) {
      this.applyPulseEffect(particle, lifeProgress)
    }

    // Desaturation (fade to gray)
    if (this.fadeToGray) {
      this.applyFadeToGray(particle)
    }

    // Alpha fading (fade to transparent)
    if (this.fadeToTransparent && !this.sinus) {
      particle.color.alpha = (1 - lifeProgress) * this.start.alpha
    }

    // Flickering effect
    if (this.flickerIntensity) {
      this.applyFlickering(particle)
    }
  }

  applyColorStops = (particle: Particle, lifeProgress: number) => {
    const { colorStops } = this

    // Ensure at least two color stops exist
    if (colorStops.length < 2) {
      return
    }

    // Clamp segment to valid range
    const segment = Math.floor(lifeProgress * (colorStops.length - 1))
    const nextSegment = Math.min(segment + 1, colorStops.length - 1) // Prevent out-of-bounds access

    const t = lifeProgress * (colorStops.length - 1) - segment

    const startColor = colorStops[segment]
    const endColor = colorStops[nextSegment] // Safely access the next color stop

    particle.color.r = startColor.r + (endColor.r - startColor.r) * t
    particle.color.g = startColor.g + (endColor.g - startColor.g) * t
    particle.color.b = startColor.b + (endColor.b - startColor.b) * t
    particle.color.alpha = startColor.alpha + (endColor.alpha - startColor.alpha) * t
  }

  pseudoRandomNoise(seed: number): number {
    const x = Math.sin(seed) * 10000
    return x - Math.floor(x) // Returns a value between 0 and 1
  }

  applyPerlinColor = (particle: Particle, lifeProgress: number) => {
    const time = lifeProgress * 10 // Scale time
    particle.color.r = this.pseudoRandomNoise(time) * 255
    particle.color.g = this.pseudoRandomNoise(time + 1) * 255
    particle.color.b = this.pseudoRandomNoise(time + 2) * 255
    particle.color.alpha = this.pseudoRandomNoise(time + 3)
  }

  applyPulseEffect = (particle: Particle, lifeProgress: number) => {
    // Compute pulse value based on life progress, speed, and intensity
    const pulse = 1 + Math.sin(lifeProgress * this.pulseSpeed * Math.PI * 2) * this.pulseIntensity

    // Apply pulse effect to the color
    particle.color.r = Math.max(0, Math.min(255, particle.color.r * pulse))
    particle.color.g = Math.max(0, Math.min(255, particle.color.g * pulse))
    particle.color.b = Math.max(0, Math.min(255, particle.color.b * pulse))
  }

  applyFadeToGray = (particle: Particle) => {
    const { color } = particle
    const gray = (color.r + color.g + color.b) / 3
    particle.color.r = gray
    particle.color.g = gray
    particle.color.b = gray
  }

  applyFlickering = (particle: Particle) => {
    const flickerAmount = (Math.random() - 0.5) * this.flickerIntensity * 255

    particle.color.r = Math.max(0, Math.min(255, particle.color.r + flickerAmount))
    particle.color.g = Math.max(0, Math.min(255, particle.color.g + flickerAmount))
    particle.color.b = Math.max(0, Math.min(255, particle.color.b + flickerAmount))
  }

  getName() {
    return BehaviourNames.COLOR_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      start: {
        _r: this.start.r,
        _g: this.start.g,
        _b: this.start.b,
        _alpha: this.start.alpha,
      },
      end: {
        _r: this.end.r,
        _g: this.end.g,
        _b: this.end.b,
        _alpha: this.end.alpha,
      },
      startVariance: {
        _r: this.startVariance.r,
        _g: this.startVariance.g,
        _b: this.startVariance.b,
        _alpha: this.startVariance.alpha,
      },
      endVariance: {
        _r: this.endVariance.r,
        _g: this.endVariance.g,
        _b: this.endVariance.b,
        _alpha: this.endVariance.alpha,
      },
      sinus: this.sinus,
      colorStops: this.colorStops,
      usePerlin: this.usePerlin,
      pulseSpeed: this.pulseSpeed,
      pulseIntensity: this.pulseIntensity,
      mirrorTransition: this.mirrorTransition,
      fadeToGray: this.fadeToGray,
      fadeToTransparent: this.fadeToTransparent,
      flickerIntensity: this.flickerIntensity,
      name: this.getName(),
    }
  }
}
