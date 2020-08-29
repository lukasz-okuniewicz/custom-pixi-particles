import { Behaviour, BehaviourNames } from './index'
import math from '../util/maths'
import Particle from '../Particle'

export default class RotationBehaviour extends Behaviour {
  enabled = false
  priority = 0
  rotation = 0
  variance = 0

  init = (particle: Particle) => {
    if (!this.enabled) return
    particle.rotationDelta = this.rotation + this.varianceFrom(this.variance)
  }

  apply = (particle: Particle, deltaTime: number) => {
    if (!this.enabled) return
    particle.rotation += particle.rotationDelta * deltaTime
  }

  getName() {
    return BehaviourNames.ROTATION_BEHAVIOUR
  }

  get rotationInDegrees() {
    return math.radiansToDegrees(this.variance)
  }

  set rotationInDegrees(value: number) {
    this.rotation = math.radiansToDegrees(value)
  }

  get varianceInDegrees() {
    return math.radiansToDegrees(this.variance)
  }

  set varianceInDegrees(value: number) {
    this.variance = math.radiansToDegrees(value)
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      rotation: this.rotation,
      variance: this.variance,
      name: this.getName(),
    }
  }
}
