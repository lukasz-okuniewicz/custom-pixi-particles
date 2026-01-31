import { createNoise2D } from 'simplex-noise'
import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'

/**
 * FlickerBehaviour adds random or noise-based flicker to alpha and/or scale (fire, neon, glitch).
 */
export default class FlickerBehaviour extends Behaviour {
  enabled = true
  priority = 180

  intensity = 0.3
  speed = 8
  flickerAlpha = true
  flickerSize = false
  /** 'noise' = smooth, 'random' = sharp */
  mode: 'noise' | 'random' = 'noise'
  private noise2D: (x: number, y: number) => number
  private _time = 0

  constructor() {
    super()
    this.noise2D = createNoise2D()
  }

  init = () => {
    //
  }

  update = (deltaTime: number) => {
    this._time += deltaTime
  }

  apply = (particle: Particle) => {
    if (!this.enabled) return

    let mult: number
    if (this.mode === 'noise') {
      const n = this.noise2D(particle.uid * 0.01, this._time * this.speed * 0.001)
      mult = 1 + n * this.intensity
    } else {
      mult = 1 + (Math.random() - 0.5) * 2 * this.intensity
    }

    if (this.flickerAlpha) {
      particle.color.alpha = Math.max(0, Math.min(1, particle.color.alpha * mult))
    }
    if (this.flickerSize) {
      particle.size.x = Math.max(0.01, particle.size.x * mult)
      particle.size.y = Math.max(0.01, particle.size.y * mult)
    }
  }

  getName() {
    return BehaviourNames.FLICKER_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      intensity: this.intensity,
      speed: this.speed,
      flickerAlpha: this.flickerAlpha,
      flickerSize: this.flickerSize,
      mode: this.mode,
      name: this.getName(),
    }
  }
}
