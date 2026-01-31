import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'

/**
 * WobbleBehaviour adds per-particle sine wave position (and optional rotation) offset (jelly / bouncy).
 */
export default class WobbleBehaviour extends Behaviour {
  enabled = true
  priority = 60

  frequency = 4
  amplitudeX = 8
  amplitudeY = 8
  wobbleRotation = false
  rotationAmplitude = 0.2
  private particlePhase: Map<number, number> = new Map()
  private _time = 0

  init = (particle: Particle) => {
    if (!this.enabled) return
    this.particlePhase.set(particle.uid, Math.random() * Math.PI * 2)
  }

  update = (deltaTime: number) => {
    this._time += deltaTime
  }

  apply = (particle: Particle) => {
    if (!this.enabled || particle.skipPositionBehaviour) return

    const phase = this.particlePhase.get(particle.uid) ?? 0
    const t = this._time * 0.001 * Math.PI * 2 * this.frequency + phase

    particle.movement.x += Math.sin(t) * this.amplitudeX
    particle.movement.y += Math.sin(t * 1.1) * this.amplitudeY

    if (this.wobbleRotation) {
      particle.rotation += Math.sin(t * 0.7) * this.rotationAmplitude
    }
  }

  onParticleRemoved = (particle: Particle) => {
    this.particlePhase.delete(particle.uid)
  }

  getName() {
    return BehaviourNames.WOBBLE_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      frequency: this.frequency,
      amplitudeX: this.amplitudeX,
      amplitudeY: this.amplitudeY,
      wobbleRotation: this.wobbleRotation,
      rotationAmplitude: this.rotationAmplitude,
      name: this.getName(),
    }
  }
}
