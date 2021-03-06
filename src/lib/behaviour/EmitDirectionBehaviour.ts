import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import math from '../util/maths'
import Particle from '../Particle'

let _tmp = 0

export default class EmitDirectionBehaviour extends Behaviour {
  enabled = true
  priority = 0
  angle = 0
  variance = 0

  init = (particle: Particle) => {
    if (!this.enabled) return
    const directionAngle = this.angle + this.varianceFrom(this.variance)
    particle.directionCos = Math.cos(directionAngle)
    particle.directionSin = Math.sin(directionAngle)
  }

  apply = (particle: Particle, deltaTime: number) => {
    if (!this.enabled) return
    _tmp = particle.directionCos * particle.x - particle.directionSin * particle.y
    particle.y = particle.directionSin * particle.x + particle.directionCos * particle.y
    particle.x = _tmp
  }

  getName() {
    return BehaviourNames.EMIT_DIRECTION
  }

  get angleInDegrees() {
    return math.radiansToDegrees(this.variance)
  }

  set angleInDegrees(value: number) {
    this.angle = math.degreesToRadians(value)
  }

  get varianceInDegrees() {
    return math.radiansToDegrees(this.variance)
  }

  set varianceInDegrees(value: number) {
    this.variance = math.degreesToRadians(value)
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      angle: this.angle,
      variance: this.variance,
      name: this.getName(),
    }
  }
}
