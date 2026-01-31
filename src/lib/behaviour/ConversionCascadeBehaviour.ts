import { Point } from '../util'
import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'

/**
 * ConversionCascadeBehaviour: particles flow from source to destination when conversion is active.
 * Chip→credit, multiplier application - value transformation as directed flow.
 */
export default class ConversionCascadeBehaviour extends Behaviour {
  enabled = true
  priority = -10

  /** Set true to start conversion flow */
  active = false
  source = new Point(0, 0)
  target = new Point(400, 300)
  speed = 200
  killOnArrival = true
  arrivalThreshold = 5

  private _activeForUid = new Map<number, boolean>()
  private _initialForUid = new Map<number, { x: number; y: number; dist: number }>()

  init = () => {}

  apply = (particle: Particle, deltaTime: number) => {
    if (!this.enabled || !this.active) {
      this._activeForUid.delete(particle.uid)
      this._initialForUid.delete(particle.uid)
      return
    }

    if (!this._activeForUid.get(particle.uid)) {
      this._activeForUid.set(particle.uid, true)
      const dx = this.target.x - particle.movement.x
      const dy = this.target.y - particle.movement.y
      this._initialForUid.set(particle.uid, {
        x: particle.movement.x,
        y: particle.movement.y,
        dist: Math.sqrt(dx * dx + dy * dy) || 1,
      })
    }

    const dx = this.target.x - particle.movement.x
    const dy = this.target.y - particle.movement.y
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.1
    if (dist < this.arrivalThreshold && this.killOnArrival) {
      particle.lifeTime = particle.maxLifeTime
      this._activeForUid.delete(particle.uid)
      this._initialForUid.delete(particle.uid)
      return
    }

    particle.velocity.set(0, 0)
    particle.acceleration.set(0, 0)
    const move = this.speed * deltaTime
    particle.movement.x += (dx / dist) * move
    particle.movement.y += (dy / dist) * move
    particle.x = particle.movement.x
    particle.y = particle.movement.y
  }

  onParticleRemoved = (particle: Particle) => {
    this._activeForUid.delete(particle.uid)
    this._initialForUid.delete(particle.uid)
  }

  getName() {
    return BehaviourNames.CONVERSION_CASCADE_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      active: this.active,
      source: { x: this.source.x, y: this.source.y },
      target: { x: this.target.x, y: this.target.y },
      speed: this.speed,
      killOnArrival: this.killOnArrival,
      arrivalThreshold: this.arrivalThreshold,
      name: this.getName(),
    }
  }
}
