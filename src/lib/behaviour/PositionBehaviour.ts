import { Point } from '../util'
import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'
import Model from "../Model";

export default class PositionBehaviour extends Behaviour {
  enabled = false
  priority = 100
  spawnType: string = 'Rectangle'
  radius: number = 0
  warp: boolean = false
  warpSpeed: number = 0
  warpBaseSpeed: number = 0
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
  cameraZConverter: number = 10
  warpFov: number = 20
  warpStretch: number = 5
  warpDistanceScaleConverter: number = 2000

  init = (particle: Particle, model: Model) => {
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

    if (this.sinX) {
      particle.sinXVal.x = this.calculate(this.sinXVal.x, this.sinXValVariance.x)
      particle.sinXVal.y = this.calculate(this.sinXVal.y, this.sinXValVariance.y)
    }
    if (this.sinY) {
      particle.sinYVal.x = this.calculate(this.sinYVal.x, this.sinYValVariance.x)
      particle.sinYVal.y = this.calculate(this.sinYVal.y, this.sinYValVariance.y)
    }

    particle.x = particle.movement.x
    particle.y = particle.movement.y

    this.restartWarp(particle, true, model);
  }

  restartWarp = (particle: Particle, initial: boolean, model: Model) => {
    if (!this.warp) return;
    if (initial) {
      particle.z = Math.random() * this.warpDistanceScaleConverter
    } else {
      particle.z = model.cameraZ + Math.random() * (this.warpDistanceScaleConverter / 2)
    }
    const distance = Math.random() * this.positionVariance.x + 1;
    const deg = Math.random() * (Math.PI * 2);
    particle.movement.x = Math.cos(deg) * distance;
    particle.movement.y = Math.sin(deg) * distance;
    particle.color.alpha = (1 - (distance / this.positionVariance.x)) * 0.5
  }

  calculate = (value: number, variance: number) => {
    return value + this.varianceFrom(variance)
  }

  apply = (particle: Particle, deltaTime: number, model: Model) => {
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

    if (model.warp) {
      if (particle.z < model.cameraZ) {
        this.restartWarp(particle, false, model);
      }
      const z = particle.z - model.cameraZ
      const dxCenter = particle.movement.x
      const dyCenter = particle.movement.y
      const distanceCenter = Math.sqrt(dxCenter * dxCenter + dyCenter * dyCenter)
      const distanceScale = Math.max(0, (this.warpDistanceScaleConverter - z) / this.warpDistanceScaleConverter)
      const fovZ = this.warpFov / z
      particle.x = particle.movement.x * fovZ
      particle.y = particle.movement.y * fovZ
      particle.size.x = distanceScale * particle.sizeStart.x
      particle.size.y = distanceScale * particle.sizeStart.y + distanceScale * this.warpSpeed * this.warpStretch * distanceCenter
      particle.rotation = Math.atan2(dyCenter, dxCenter) + Math.PI / 2
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
      warp: this.warp,
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
      warpSpeed: this.warpSpeed,
      warpBaseSpeed: this.warpBaseSpeed,
      cameraZConverter: this.warpBaseSpeed,
      warpFov: this.warpFov,
      warpStretch: this.warpStretch,
      warpDistanceScaleConverter: this.warpDistanceScaleConverter,
      name: this.getName(),
    }
  }
}
