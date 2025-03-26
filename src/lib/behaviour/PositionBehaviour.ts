import {Point} from '../util'
import {Behaviour, BehaviourNames} from './index'
import Particle from '../Particle'
import Model from '../Model'
import MinMax from '../util/MinMax'
import ThereBack from '../util/ThereBack'

export default class PositionBehaviour extends Behaviour {
  enabled = false
  priority = 100
  warp: boolean = false
  warpSpeed: number = 0
  warpBaseSpeed: number = 0
  sinX: boolean = false
  sinY: boolean = false
  sinXVal = new Point()
  sinYVal = new Point()
  sinXValVariance = new Point()
  sinYValVariance = new Point()
  positionVariance = new Point()
  velocity = new Point()
  velocityVariance = new Point()
  acceleration = new Point()
  accelerationVariance = new Point()
  cameraZConverter: number = 10
  warpFov: number = 20
  warpStretch: number = 5
  warpDistanceScaleConverter: number = 2000
  warpDistanceToCenter: boolean = false

  fromAtoB: boolean = false
  fromAtoBTwoWays: boolean = false
  pointA = new Point()
  pointB = new Point()
  thereDuration = new MinMax()
  thereAmplitude = new MinMax()
  backDuration = new MinMax()
  backAmplitude = new MinMax()
  there: ThereBack = new ThereBack()
  back: ThereBack = new ThereBack()

  /**
   * Function that initializes a particle
   * @param {Particle} particle - The particle to be initialized
   * @param {Model} model - The model of the particle
   */
  init = (particle: Particle, model: Model) => {
    if (!this.fromAtoB) {
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

      this.restartWarp(particle, true, model)
    } else {
      particle.thereDuration =
        Math.random() * (this.thereDuration.max - this.thereDuration.min) + this.thereDuration.min
      particle.thereAmplitude =
        Math.random() * (this.thereAmplitude.max - this.thereAmplitude.min) + this.thereAmplitude.min
      particle.backDuration = Math.random() * (this.backDuration.max - this.backDuration.min) + this.backDuration.min
      particle.backAmplitude =
        Math.random() * (this.backAmplitude.max - this.backAmplitude.min) + this.backAmplitude.min
      particle.pointA.copyFrom(this.pointA)
      particle.pointB.copyFrom(this.pointB)
      particle.xStart = this.pointA.x
      particle.yStart = this.pointA.y
      particle.xTarget = this.pointB.x
      particle.yTarget = this.pointB.y
      particle.there.copyFrom(this.there)
      particle.back.copyFrom(this.back)
    }
  }

  /**
   * Restarts the warp of a particle
   * @param {Particle} particle - The particle to restart the warp on
   * @param {boolean} initial - True if this is the initial warp, false if it is a subsequent one
   * @param {Model} model - The model containing the camera Z property
   */
  restartWarp = (particle: Particle, initial: boolean, model: Model) => {
    if (!this.warp) return

    const { sizeStart } = particle

    if (initial) {
      particle.z = Math.random() * this.warpDistanceScaleConverter
    } else {
      particle.z = model.cameraZ + Math.random() * this.warpDistanceScaleConverter
    }
    const distance = Math.random() * this.positionVariance.x + 1
    const deg = Math.random() * (Math.PI * 2)
    particle.warpSizeStart.x = (1 - distance / this.positionVariance.x) * 0.5 * sizeStart.x
    particle.warpSizeStart.y = (1 - distance / this.positionVariance.y) * 0.5 * sizeStart.y
    if (this.warpDistanceToCenter) {
      particle.movement.x = Math.cos(deg) * distance
      particle.movement.y = Math.sin(deg) * distance
    } else {
      particle.x = Math.cos(deg) * distance
      particle.y = Math.sin(deg) * distance
    }
    particle.color.alpha = (1 - distance / this.positionVariance.x) * 0.5
  }

  /**
   * Adds a random variance to the given value
   * @param {number} value - The value to calculate
   * @param {number} variance - The random variance to add
   * @returns {number} The calculated value
   */
  calculate = (value: number, variance: number) => {
    return value + this.varianceFrom(variance)
  }

  /**
   * Applies the particle's velocity and acceleration to move it and calculate its size, rotation, and position.
   * @param {Particle} particle - The particle to be moved
   * @param {number} deltaTime - The time delta for the movement calculation
   * @param {Model} model - The model containing information about the particle's movement
   */
  apply = (particle: Particle, deltaTime: number, model: Model) => {
    if (particle.skipPositionBehaviour) return
    if (!this.fromAtoB) {
      const { acceleration, sinXVal, sinYVal, z, warpSizeStart, movement } = particle
      const { cameraZ } = model

      const PI = Math.PI

      particle.velocity.x += acceleration.x * deltaTime
      particle.velocity.y += acceleration.y * deltaTime

      const movementX = movement.x + particle.velocity.x * deltaTime
      const movementY = movement.y + particle.velocity.y * deltaTime

      particle.movement.x = movementX
      particle.movement.y = movementY

      if (this.sinX) {
        particle.x = movementX + Math.sin(PI * (movementY / sinXVal.x)) * sinXVal.y
      } else {
        particle.x = movementX
      }

      if (this.sinY) {
        particle.y = movementY + Math.sin(PI * (movementX / sinYVal.x)) * sinYVal.y
      } else {
        particle.y = movementY
      }

      if (model.warp) {
        if (z < cameraZ) {
          this.restartWarp(particle, false, model)
        }
        const newZ = z - cameraZ
        const dxCenter = movementX
        const dyCenter = movementY
        const distanceCenter = Math.sqrt(dxCenter * dxCenter + dyCenter * dyCenter)
        const distanceScale = Math.max(0, (this.warpDistanceScaleConverter - newZ) / this.warpDistanceScaleConverter)
        const fovZ = this.warpFov / newZ
        particle.x = movementX * fovZ
        particle.y = movementY * fovZ
        particle.size.x = distanceScale * warpSizeStart.x
        particle.size.y =
          distanceScale * warpSizeStart.y + distanceScale * this.warpSpeed * this.warpStretch * distanceCenter
        particle.rotation = Math.atan2(dyCenter, dxCenter) + PI / 2
      }
    } else {
      let progress = particle.progress

      if (this.fromAtoBTwoWays && progress >= 1) {
        particle.direction = -particle.direction
        particle.progress = 0
        progress = 0
        particle.time = 0
      } else if (progress > 1) {
        return
      }

      let easedProgress = progress
      if (particle.direction === 1) {
        if (particle.there.ease === 'back.inOut') {
          easedProgress = this._easeBackInOut(progress)
        } else if (particle.there.ease === 'back.in') {
          easedProgress = this._easeBackIn(progress)
        } else if (particle.there.ease === 'back.out') {
          easedProgress = this._easeBackOut(progress)
        } else if (particle.there.ease === 'power1.in') {
          easedProgress = this._easePower1In(progress)
        } else if (particle.there.ease === 'power1.out') {
          easedProgress = this._easePower1Out(progress)
        } else if (particle.there.ease === 'power1.inOut') {
          easedProgress = this._easePower1InOut(progress)
        } else if (particle.there.ease === 'bounce.in') {
          easedProgress = this._easeBounceIn(progress)
        } else if (particle.there.ease === 'bounce.out') {
          easedProgress = this._easeBounceOut(progress)
        } else if (particle.there.ease === 'bounce.inOut') {
          easedProgress = this._easeBounceInOut(progress)
        } else if (particle.there.ease === 'elastic.in') {
          easedProgress = this._easeElasticIn(progress)
        } else if (particle.there.ease === 'elastic.out') {
          easedProgress = this._easeElasticOut(progress)
        } else if (particle.there.ease === 'elastic.inOut') {
          easedProgress = this._easeElasticInOut(progress)
        } else if (particle.there.ease === 'steps') {
          easedProgress = this._easeSteps(progress)
        }

        const xInterpolated = this._lerp(particle.xStart, particle.xTarget, easedProgress)
        const yInterpolated = this._lerp(particle.yStart, particle.yTarget, easedProgress)

        if (particle.there.x === 'Sin') {
          particle.x = xInterpolated + Math.sin(progress * Math.PI) * particle.thereAmplitude
        } else if (particle.there.x === 'Cos') {
          particle.x = xInterpolated + Math.cos(progress * Math.PI) * particle.thereAmplitude
        } else if (particle.there.x === 'Tan') {
          particle.x = xInterpolated + Math.tan(progress * Math.PI) * particle.thereAmplitude
        } else {
          particle.x = xInterpolated + easedProgress
        }

        if (particle.there.y === 'Sin') {
          particle.y = yInterpolated + Math.sin(progress * Math.PI) * particle.thereAmplitude
        } else if (particle.there.y === 'Cos') {
          particle.y = yInterpolated + Math.cos(progress * Math.PI) * particle.thereAmplitude
        } else if (particle.there.y === 'Tan') {
          particle.y = yInterpolated + Math.tan(progress * Math.PI) * particle.thereAmplitude
        } else {
          particle.y = yInterpolated + easedProgress
        }
      } else {
        if (particle.back.ease === 'back.inOut') {
          easedProgress = this._easeBackInOut(progress)
        } else if (particle.back.ease === 'back.in') {
          easedProgress = this._easeBackIn(progress)
        } else if (particle.back.ease === 'back.out') {
          easedProgress = this._easeBackOut(progress)
        } else if (particle.back.ease === 'power1.in') {
          easedProgress = this._easePower1In(progress)
        } else if (particle.back.ease === 'power1.out') {
          easedProgress = this._easePower1Out(progress)
        } else if (particle.back.ease === 'power1.inOut') {
          easedProgress = this._easePower1InOut(progress)
        } else if (particle.back.ease === 'bounce.in') {
          easedProgress = this._easeBounceIn(progress)
        } else if (particle.back.ease === 'bounce.out') {
          easedProgress = this._easeBounceOut(progress)
        } else if (particle.back.ease === 'bounce.inOut') {
          easedProgress = this._easeBounceInOut(progress)
        } else if (particle.back.ease === 'elastic.in') {
          easedProgress = this._easeElasticIn(progress)
        } else if (particle.back.ease === 'elastic.out') {
          easedProgress = this._easeElasticOut(progress)
        } else if (particle.back.ease === 'elastic.inOut') {
          easedProgress = this._easeElasticInOut(progress)
        } else if (particle.back.ease === 'steps') {
          easedProgress = this._easeSteps(progress)
        }

        const xInterpolated = this._lerp(particle.xTarget, particle.xStart, easedProgress)
        const yInterpolated = this._lerp(particle.yTarget, particle.yStart, easedProgress)

        if (particle.back.x === 'Sin') {
          particle.x = xInterpolated + Math.sin(progress * Math.PI) * particle.backAmplitude
        } else if (particle.back.x === 'Cos') {
          particle.x = xInterpolated + Math.cos(progress * Math.PI) * particle.backAmplitude
        } else if (particle.back.x === 'Tan') {
          particle.x = xInterpolated + Math.tan(progress * Math.PI) * particle.backAmplitude
        } else {
          particle.x = xInterpolated + easedProgress
        }

        if (particle.back.y === 'Sin') {
          particle.y = yInterpolated + Math.sin(progress * Math.PI) * particle.backAmplitude
        } else if (particle.back.y === 'Cos') {
          particle.y = yInterpolated + Math.cos(progress * Math.PI) * particle.backAmplitude
        } else if (particle.back.y === 'Tan') {
          particle.y = yInterpolated + Math.tan(progress * Math.PI) * particle.backAmplitude
        } else {
          particle.y = yInterpolated + easedProgress
        }
      }

      particle.time += deltaTime
      if (particle.direction === 1) {
        particle.progress = particle.time / particle.thereDuration
      } else {
        particle.progress = particle.time / particle.backDuration
      }
    }
  }

  /**
   * Gets the name of the behaviour
   * @return {BehaviourNames} The name of the behaviour
   */
  getName() {
    return BehaviourNames.POSITION_BEHAVIOUR
  }

  _lerp(start: number, end: number, t: number) {
    return start * (1 - t) + end * t
  }

  _easeBackInOut(t: number, c1 = 1.70158, c2 = c1 * 1.525) {
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2
  }

  _easeBackIn(t: number, c1 = 1.70158) {
    t = Math.min(Math.max(t, 0), 1)
    return t * t * ((c1 + 1) * t - c1)
  }

  _easeBackOut(t: number, c1 = 1.70158) {
    t = Math.min(Math.max(t, 0), 1)
    const tInv = t - 1
    return tInv * tInv * ((c1 + 1) * tInv + c1) + 1
  }

  _easePower1In(t: number) {
    return t
  }

  _easePower1Out(t: number) {
    return 1 - Math.pow(1 - t, 2)
  }

  _easePower1InOut(t: number) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
  }

  _easeBounceIn(t: number) {
    return 1 - this._easeBounceOut(1 - t)
  }

  _easeBounceOut(t: number) {
    const n1 = 7.5625
    const d1 = 2.75
    if (t < 1 / d1) {
      return n1 * t * t
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375
    }
  }

  _easeBounceInOut(t: number) {
    return t < 0.5 ? (1 - this._easeBounceOut(1 - 2 * t)) / 2 : (1 + this._easeBounceOut(2 * t - 1)) / 2
  }

  _easeElasticIn(t: number) {
    const c4 = (2 * Math.PI) / 3

    return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4)
  }

  _easeElasticOut(t: number) {
    const c4 = (2 * Math.PI) / 3

    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
  }

  _easeElasticInOut(t: number) {
    const c5 = (2 * Math.PI) / 4.5

    return t === 0
      ? 0
      : t === 1
        ? 1
        : t < 0.5
          ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
          : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1
  }

  _easeSteps(t: number, numSteps = 12) {
    const stepSize = 1 / numSteps
    const stepIndex = Math.floor(t / stepSize)
    return stepIndex * stepSize
  }

  /**
   * @description Retrieves the properties of the object.
   * @returns {Object} The properties of the object.
   */
  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      fromAtoB: this.fromAtoB,
      fromAtoBTwoWays: this.fromAtoBTwoWays,
      there: {
        x: this.there.x,
        y: this.there.y,
        ease: this.there.ease,
      },
      back: {
        x: this.back.x,
        y: this.back.y,
        ease: this.back.ease,
      },
      pointA: {
        x: this.pointA.x,
        y: this.pointA.y,
      },
      pointB: {
        x: this.pointB.x,
        y: this.pointB.y,
      },
      thereDuration: {
        min: this.thereDuration.min,
        max: this.thereDuration.max,
      },
      thereAmplitude: {
        min: this.thereAmplitude.min,
        max: this.thereAmplitude.max,
      },
      backDuration: {
        min: this.backDuration.min,
        max: this.backDuration.max,
      },
      backAmplitude: {
        min: this.backAmplitude.min,
        max: this.backAmplitude.max,
      },
      warp: this.warp,
      sinX: this.sinX,
      sinY: this.sinY,
      sinXVal: this.sinXVal,
      sinYVal: this.sinYVal,
      sinXValVariance: this.sinXValVariance,
      sinYValVariance: this.sinYValVariance,
      positionVariance: {
        x: this.positionVariance.x,
        y: this.positionVariance.y,
      },
      velocity: {
        x: this.velocity.x,
        y: this.velocity.y,
      },
      velocityVariance: {
        x: this.velocityVariance.x,
        y: this.velocityVariance.y,
      },
      acceleration: {
        x: this.acceleration.x,
        y: this.acceleration.y,
      },
      accelerationVariance: {
        x: this.accelerationVariance.x,
        y: this.accelerationVariance.y,
      },
      warpSpeed: this.warpSpeed,
      warpBaseSpeed: this.warpBaseSpeed,
      cameraZConverter: this.cameraZConverter,
      warpFov: this.warpFov,
      warpStretch: this.warpStretch,
      warpDistanceScaleConverter: this.warpDistanceScaleConverter,
      warpDistanceToCenter: this.warpDistanceToCenter,
      name: this.getName(),
    }
  }
}
