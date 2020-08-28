import { Behaviour, BehaviourNames } from './index'
import math from '../util/math'
import Particle from '../Particle'

export default class RotationBehaviour extends Behaviour {
  priority = 0
  rotation = 0
  variance = 0

  init = (particle: Particle) => {
    particle.rotationDelta = this.rotation + this.varianceFrom(this.variance)
  }

  apply = (particle: Particle, deltaTime: number) => {
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
}
