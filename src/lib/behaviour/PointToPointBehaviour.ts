import { Point } from '../util'
import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'
import type Model from '../Model'
import MinMax from '../util/MinMax'
import ThereBack from '../util/ThereBack'

export default class PointToPointBehaviour extends Behaviour {
  enabled = true
  priority = 90

  fromAtoBTwoWays = false
  pointA = new Point()
  pointB = new Point()
  thereDuration = new MinMax()
  thereAmplitude = new MinMax()
  backDuration = new MinMax()
  backAmplitude = new MinMax()
  there: ThereBack = new ThereBack()
  back: ThereBack = new ThereBack()

  init = (particle: Particle, _model: Model) => {
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

  apply = (particle: Particle, deltaTime: number, _model: Model) => {
    if (!this.enabled || particle.skipPositionBehaviour) return
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
      easedProgress = this.applyEase(progress, particle.there.ease)

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
      easedProgress = this.applyEase(progress, particle.back.ease)

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

    particle.movement.x = particle.x
    particle.movement.y = particle.y
    particle.time += deltaTime
    if (particle.direction === 1) {
      particle.progress = particle.time / particle.thereDuration
    } else {
      particle.progress = particle.time / particle.backDuration
    }
  }

  getName() {
    return BehaviourNames.POINT_TO_POINT_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
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
      name: this.getName(),
    }
  }

  private applyEase(progress: number, ease: string) {
    if (ease === 'back.inOut') return this._easeBackInOut(progress)
    if (ease === 'back.in') return this._easeBackIn(progress)
    if (ease === 'back.out') return this._easeBackOut(progress)
    if (ease === 'power1.in') return this._easePower1In(progress)
    if (ease === 'power1.out') return this._easePower1Out(progress)
    if (ease === 'power1.inOut') return this._easePower1InOut(progress)
    if (ease === 'bounce.in') return this._easeBounceIn(progress)
    if (ease === 'bounce.out') return this._easeBounceOut(progress)
    if (ease === 'bounce.inOut') return this._easeBounceInOut(progress)
    if (ease === 'elastic.in') return this._easeElasticIn(progress)
    if (ease === 'elastic.out') return this._easeElasticOut(progress)
    if (ease === 'elastic.inOut') return this._easeElasticInOut(progress)
    if (ease === 'steps') return this._easeSteps(progress)
    return progress
  }

  private _lerp(start: number, end: number, t: number) {
    return start * (1 - t) + end * t
  }

  private _easeBackInOut(t: number, c1 = 1.70158, c2 = c1 * 1.525) {
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2
  }

  private _easeBackIn(t: number, c1 = 1.70158) {
    t = Math.min(Math.max(t, 0), 1)
    return t * t * ((c1 + 1) * t - c1)
  }

  private _easeBackOut(t: number, c1 = 1.70158) {
    t = Math.min(Math.max(t, 0), 1)
    const tInv = t - 1
    return tInv * tInv * ((c1 + 1) * tInv + c1) + 1
  }

  private _easePower1In(t: number) {
    return t
  }

  private _easePower1Out(t: number) {
    return 1 - Math.pow(1 - t, 2)
  }

  private _easePower1InOut(t: number) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
  }

  private _easeBounceIn(t: number) {
    return 1 - this._easeBounceOut(1 - t)
  }

  private _easeBounceOut(t: number) {
    const n1 = 7.5625
    const d1 = 2.75
    if (t < 1 / d1) return n1 * t * t
    if (t < 2 / d1) return n1 * (t - 1.5 / d1) * (t - 1.5 / d1) + 0.75
    if (t < 2.5 / d1) return n1 * (t - 2.25 / d1) * (t - 2.25 / d1) + 0.9375
    return n1 * (t - 2.625 / d1) * (t - 2.625 / d1) + 0.984375
  }

  private _easeBounceInOut(t: number) {
    return t < 0.5 ? (1 - this._easeBounceOut(1 - 2 * t)) / 2 : (1 + this._easeBounceOut(2 * t - 1)) / 2
  }

  private _easeElasticIn(t: number) {
    const c4 = (2 * Math.PI) / 3
    return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4)
  }

  private _easeElasticOut(t: number) {
    const c4 = (2 * Math.PI) / 3
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
  }

  private _easeElasticInOut(t: number) {
    const c5 = (2 * Math.PI) / 4.5
    return t === 0
      ? 0
      : t === 1
        ? 1
        : t < 0.5
          ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
          : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1
  }

  private _easeSteps(t: number, numSteps = 12) {
    const stepSize = 1 / numSteps
    const stepIndex = Math.floor(t / stepSize)
    return stepIndex * stepSize
  }
}
