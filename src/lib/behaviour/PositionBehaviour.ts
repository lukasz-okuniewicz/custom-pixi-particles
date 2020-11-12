import { Point } from '../util'
import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'

export default class PositionBehaviour extends Behaviour {
  enabled = false
  priority = 100
  spawnType: string = 'Rectangle'
  radius: number = 0
  sinX: boolean = false
  sinY: boolean = false
  sinXVal = new Point()
  sinYVal = new Point()
  sinXValVariance = new Point()
  sinYValVariance = new Point()
  position = new Point()
  positionVariance = new Point()
  velocity = new Point()
  velocityVariance = new Point()
  acceleration = new Point()
  accelerationVariance = new Point()

  init = (particle: Particle) => {
    if (!this.enabled) return

    if (this.spawnType === 'Rectangle') {
      particle.movement.x = this.calculate(this.position.x, this.positionVariance.x)
      particle.movement.y = this.calculate(this.position.y, this.positionVariance.y)
    } else if (this.spawnType === 'Ring') {
      const angle = Math.random() * Math.PI * 2
      particle.movement.x = this.calculate(this.position.x, this.positionVariance.x) + Math.cos(angle) * this.radius
      particle.movement.y = this.calculate(this.position.y, this.positionVariance.y) + Math.sin(angle) * this.radius
    } else if (this.spawnType === 'Frame') {
      const w = this.radius
      const h = this.radius
      if (Math.random() < w / (w + h)) {
        particle.movement.x = Math.random() * w + particle.movement.x
        particle.movement.y = Math.random() < 0.5 ? particle.movement.y : particle.movement.y + h - 1
      } else {
        particle.movement.y = Math.random() * h + particle.movement.y
        particle.movement.x = Math.random() < 0.5 ? particle.movement.x : particle.movement.x + w - 1
      }
      particle.movement.x += this.calculate(this.position.x, this.positionVariance.x)
      particle.movement.y += this.calculate(this.position.y, this.positionVariance.y)
    }

    particle.velocity.x = this.calculate(this.velocity.x, this.velocityVariance.x)
    particle.velocity.y = this.calculate(this.velocity.y, this.velocityVariance.y)

    particle.acceleration.x = this.calculate(this.acceleration.x, this.accelerationVariance.x)
    particle.acceleration.y = this.calculate(this.acceleration.y, this.accelerationVariance.y)

    particle.sinXVal.x = this.calculate(this.sinXVal.x, this.sinXValVariance.x)
    particle.sinXVal.y = this.calculate(this.sinXVal.y, this.sinXValVariance.y)
    particle.sinYVal.x = this.calculate(this.sinYVal.x, this.sinYValVariance.x)
    particle.sinYVal.y = this.calculate(this.sinYVal.y, this.sinYValVariance.y)

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

    if (this.sinX) {
      particle.x = particle.movement.x + Math.sin(Math.PI * (particle.movement.y / particle.sinXVal.x)) * particle.sinXVal.y
    } else {
      particle.x = particle.movement.x
    }

    if (this.sinY) {
      particle.y = particle.movement.y + Math.sin(Math.PI * (particle.movement.x / particle.sinYVal.x)) * particle.sinYVal.y
    } else {
      particle.y = particle.movement.y
    }
  }

  getName() {
    return BehaviourNames.POSITION_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      spawnType: this.spawnType,
      radius: this.radius,
      sinX: this.sinX,
      sinY: this.sinY,
      sinXVal: this.sinXVal,
      sinYVal: this.sinYVal,
      sinXValVariance: this.sinXValVariance,
      sinYValVariance: this.sinYValVariance,
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
