import { Point } from '../util'
import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'

/**
 * RippleBehaviour applies a radial wave offset from an origin (water ripple / shockwave).
 */
export default class RippleBehaviour extends Behaviour {
  enabled = true
  priority = 55

  origin = new Point(0, 0)
  waveSpeed = 200
  wavelength = 80
  amplitude = 15
  decayWithDistance = true
  decayFactor = 0.002
  _time = 0

  init = () => {
    //
  }

  update = (deltaTime: number) => {
    this._time += deltaTime
  }

  apply = (particle: Particle) => {
    if (!this.enabled || particle.skipPositionBehaviour) return

    const dx = particle.movement.x - this.origin.x
    const dy = particle.movement.y - this.origin.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx)

    const phase = (this._time * this.waveSpeed - dist) / this.wavelength
    let amp = this.amplitude * Math.sin(phase * Math.PI * 2)
    if (this.decayWithDistance) {
      amp *= Math.exp(-this.decayFactor * dist)
    }

    particle.movement.x += Math.cos(angle) * amp
    particle.movement.y += Math.sin(angle) * amp
  }

  getName() {
    return BehaviourNames.RIPPLE_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      origin: { x: this.origin.x, y: this.origin.y },
      waveSpeed: this.waveSpeed,
      wavelength: this.wavelength,
      amplitude: this.amplitude,
      decayWithDistance: this.decayWithDistance,
      decayFactor: this.decayFactor,
      name: this.getName(),
    }
  }
}
