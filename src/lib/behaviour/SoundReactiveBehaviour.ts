import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'
import { Color, Point } from '../util'

export default class SoundReactiveBehaviour extends Behaviour {
  enabled = true
  priority = 0

  isPlaying: boolean = false
  useColor: boolean = true
  useSize: boolean = true
  useVelocity: boolean = true
  useRotation: boolean = true // New property for rotation
  useRandomColor: boolean = true // New property for random colors
  beatColor: Color = new Color(255, 0, 0, 1) // Default beat color (red with full alpha)
  audioContext: AudioContext | null = null // Audio context for analysis
  analyser: AnalyserNode | null = null // Audio analyser node
  frequencyData: Uint8Array | null = null // Frequency data array
  amplitudeFactor = 0.1 // Scale factor for amplitude effects
  frequencyFactor = 1 // Scale factor for frequency effects
  rotationFactor = 0.05 // Scale factor for rotation effects
  beatSensitivity = 1 // Sensitivity to detect beats
  velocityFactor = new Point(1, 1) // Sensitivity to detect beats

  init() {
    //
  }

  apply(particle: Particle, deltaTime: number) {
    if (!this.enabled || !this.analyser || !this.frequencyData || !this.isPlaying) return

    // Update frequency data
    this.analyser.getByteFrequencyData(this.frequencyData)

    // Compute amplitude and frequency effects
    const amplitude = this.getAmplitude()
    const dominantFrequency = this.getDominantFrequency()

    if (this.useSize) {
      // Apply amplitude effect to size
      particle.size.x += amplitude * this.amplitudeFactor * deltaTime
      particle.size.y += amplitude * this.amplitudeFactor * deltaTime
    }

    if (this.useVelocity) {
      // Apply frequency effect to velocity or position
      particle.velocity.x += dominantFrequency * this.frequencyFactor * deltaTime * this.velocityFactor.x
      particle.velocity.y += dominantFrequency * this.frequencyFactor * deltaTime * this.velocityFactor.y
    }

    if (this.useRotation) {
      // Apply rotation effect based on dominant frequency
      particle.rotation += dominantFrequency * this.rotationFactor * deltaTime
    }

    if (this.useColor) {
      // Add beat reaction with color and alpha logic
      if (this.isBeatDetected(amplitude)) {
        const color = this.useRandomColor ? this.getRandomColor() : this.beatColor
        particle.color.r = color.r
        particle.color.g = color.g
        particle.color.b = color.b
        particle.color.alpha = color.alpha // Ensure alpha is applied
      } else {
        particle.color.r = Math.max(0, particle.color.r - 5) // Fade back to normal
        particle.color.g = Math.max(0, particle.color.g - 5)
        particle.color.b = Math.max(0, particle.color.b - 5)
        particle.color.alpha = Math.max(0, particle.color.alpha - 0.05) // Gradually decrease alpha
      }
    }
  }

  /**
   * Computes the amplitude (average volume level) from the frequency data.
   */
  getAmplitude(): number {
    if (!this.frequencyData) return 0

    const sum = this.frequencyData.reduce((a, b) => a + b, 0)
    return sum / this.frequencyData.length
  }

  /**
   * Finds the dominant frequency (frequency with the highest amplitude).
   */
  getDominantFrequency(): number {
    if (!this.frequencyData) return 0

    let maxAmplitude = 0
    let dominantIndex = 0
    for (let i = 0; i < this.frequencyData.length; i++) {
      if (this.frequencyData[i] > maxAmplitude) {
        maxAmplitude = this.frequencyData[i]
        dominantIndex = i
      }
    }

    return (dominantIndex * (this.analyser?.context.sampleRate ?? 0)) / (this.analyser?.fftSize ?? 1)
  }

  /**
   * Detects a beat based on amplitude and sensitivity.
   */
  isBeatDetected(amplitude: number): boolean {
    return amplitude > this.beatSensitivity * 128 // Threshold for beat detection
  }

  /**
   * Generates a random RGBA color.
   */
  getRandomColor(): Color {
    // Generate a random color if allTheSameColor is false
    const r = Math.floor(Math.random() * 256)
    const g = Math.floor(Math.random() * 256)
    const b = Math.floor(Math.random() * 256)
    const a = 1 // Ensure alpha is explicitly set
    return new Color(r, g, b, a)
  }

  getName() {
    return BehaviourNames.SOUND_REACTIVE_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      isPlaying: this.isPlaying,
      useColor: this.useColor,
      useVelocity: this.useVelocity,
      useSize: this.useSize,
      useRotation: this.useRotation,
      useRandomColor: this.useRandomColor, // Include random color toggle in props
      beatColor: this.beatColor, // Include beat color with alpha in props
      amplitudeFactor: this.amplitudeFactor,
      frequencyFactor: this.frequencyFactor,
      rotationFactor: this.rotationFactor,
      beatSensitivity: this.beatSensitivity,
      velocityFactor: this.velocityFactor,
      name: this.getName(),
    }
  }
}
