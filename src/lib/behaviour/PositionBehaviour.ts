import { Point } from '../util'
import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'

export default class PositionBehaviour extends Behaviour {
  enabled = false
  priority = 100
  position = new Point()
  positionVariance = new Point()
  velocity = new Point()
  velocityVariance = new Point()
  acceleration = new Point()
  accelerationVariance = new Point()

  init = (particle: Particle) => {
    if (!this.enabled) return
    particle.movement.x = this.calculate(this.position.x, this.positionVariance.x)
    particle.movement.y = this.calculate(this.position.y, this.positionVariance.y)

    particle.velocity.x = this.calculate(this.velocity.x, this.velocityVariance.x)
    particle.velocity.y = this.calculate(this.velocity.y, this.velocityVariance.y)

    particle.acceleration.x = this.calculate(this.acceleration.x, this.accelerationVariance.x)
    particle.acceleration.y = this.calculate(this.acceleration.y, this.accelerationVariance.y)

    particle.x = particle.movement.x
    particle.y = particle.movement.y
  }

  calculate = (value: number, variance: number) => {
    return value + this.varianceFrom(variance)
  }

  apply = (particle: Particle, deltaTime: number) => {
    if (!this.enabled) return
    particle.velocity.x += particle.acceleration.x * deltaTime
    particle.velocity.y += particle.acceleration.y * deltaTime

    particle.movement.x += particle.velocity.x * deltaTime
    particle.movement.y += particle.velocity.y * deltaTime

    particle.x = particle.movement.x
    particle.y = particle.movement.y
  }

  getName() {
    return BehaviourNames.POSITION_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      position: {
        x: this.position.x,
        y: this.position.y,
      },
      positionVariance: {
        x: this.position.x,
        y: this.position.y,
      },
      velocity: {
        x: this.position.x,
        y: this.position.y,
      },
      velocityVariance: {
        x: this.position.x,
        y: this.position.y,
      },
      acceleration: {
        x: this.position.x,
        y: this.position.y,
      },
      accelerationVariance: {
        x: this.position.x,
        y: this.position.y,
      },
      name: this.getName(),
    }
  }
}
