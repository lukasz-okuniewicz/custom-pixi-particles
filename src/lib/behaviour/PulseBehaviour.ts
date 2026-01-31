import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'

/**
 * PulseBehaviour modulates size and/or alpha (and optionally color) with a sine wave over life or time.
 */
export default class PulseBehaviour extends Behaviour {
  enabled = true
  priority = 200

  frequency = 3
  amplitude = 0.3
  pulseSize = true
  pulseAlpha = true
  pulseColor = false
  colorBlend = { r: 255, g: 255, b: 255 }
  /** 'life' = over lifeProgress, 'time' = over global time */
  mode: 'life' | 'time' = 'life'
  phaseOffset = 0
  _time = 0

  init = () => {
    //
  }

  update = (deltaTime: number) => {
    this._time += deltaTime
  }

  apply = (particle: Particle) => {
    if (!this.enabled) return

    const t = this.mode === 'life' ? particle.lifeProgress : (this._time * 0.001) % 1
    const mult = 1 + this.amplitude * Math.sin(this.frequency * Math.PI * 2 * t + this.phaseOffset)

    if (this.pulseSize) {
      particle.size.x = Math.max(0.01, particle.size.x * mult)
      particle.size.y = Math.max(0.01, particle.size.y * mult)
    }

    if (this.pulseAlpha) {
      particle.color.alpha = Math.max(0, Math.min(1, particle.color.alpha * mult))
    }

    if (this.pulseColor && this.colorBlend) {
      particle.color.r = Math.min(255, particle.color.r * (1 - 0.2 * (mult - 1)) + (this.colorBlend as any).r * 0.2 * (mult - 1))
      particle.color.g = Math.min(255, particle.color.g * (1 - 0.2 * (mult - 1)) + (this.colorBlend as any).g * 0.2 * (mult - 1))
      particle.color.b = Math.min(255, particle.color.b * (1 - 0.2 * (mult - 1)) + (this.colorBlend as any).b * 0.2 * (mult - 1))
    }
  }

  getName() {
    return BehaviourNames.PULSE_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      frequency: this.frequency,
      amplitude: this.amplitude,
      pulseSize: this.pulseSize,
      pulseAlpha: this.pulseAlpha,
      pulseColor: this.pulseColor,
      colorBlend: this.colorBlend ? { ...this.colorBlend } : { r: 255, g: 255, b: 255 },
      mode: this.mode,
      phaseOffset: this.phaseOffset,
      name: this.getName(),
    }
  }
}
