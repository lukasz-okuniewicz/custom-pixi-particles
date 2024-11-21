import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'

export default class SoundReactiveBehaviour extends Behaviour {
  enabled = true
  priority = 0

  isPlaying: boolean = false
  audioContext: AudioContext | null = null // Audio context for analysis
  analyser: AnalyserNode | null = null // Audio analyser node
  frequencyData: Uint8Array | null = null // Frequency data array
  amplitudeFactor = 0.1 // Scale factor for amplitude effects
  frequencyFactor = 1 // Scale factor for frequency effects
  beatSensitivity = 1 // Sensitivity to detect beats

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

    // Apply amplitude effect to size
    particle.size.x += amplitude * this.amplitudeFactor * deltaTime
    particle.size.y += amplitude * this.amplitudeFactor * deltaTime

    // Apply frequency effect to velocity or position
    particle.velocity.x += dominantFrequency * this.frequencyFactor * deltaTime
    particle.velocity.y += dominantFrequency * this.frequencyFactor * deltaTime

    // Add beat reaction if sensitivity is high enough
    if (this.isBeatDetected(amplitude)) {
      particle.color.r = 255 // Flash red on beat
      particle.color.g = 0
      particle.color.b = 0
    } else {
      particle.color.r = Math.max(0, particle.color.r - 5) // Fade back to normal
      particle.color.g = Math.max(0, particle.color.g - 5)
      particle.color.b = Math.max(0, particle.color.b - 5)
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

  getName() {
    return BehaviourNames.SOUND_REACTIVE_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      isPlaying: this.isPlaying,
      amplitudeFactor: this.amplitudeFactor,
      frequencyFactor: this.frequencyFactor,
      beatSensitivity: this.beatSensitivity,
      name: this.getName(),
    }
  }
}
