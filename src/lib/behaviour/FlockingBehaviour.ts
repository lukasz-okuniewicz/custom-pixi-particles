import BoidsFlockingBehaviour from './BoidsFlockingBehaviour'
import BehaviourNames from './BehaviourNames'

export default class FlockingBehaviour extends BoidsFlockingBehaviour {
  separationRadius = 34
  separationStrength = 1.4
  alignmentRadius = 56
  alignmentStrength = 0.9
  cohesionRadius = 84
  cohesionStrength = 0.55
  maxSpeed = 320
  maxSteerForce = 520

  getName(): string {
    return BehaviourNames.FLOCKING_BEHAVIOUR
  }
}
