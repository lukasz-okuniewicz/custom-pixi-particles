import { Color } from '../util'
import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'

export default class ColorBehaviour extends Behaviour {
  enabled = false
  priority = 0
  start = new Color()
  end = new Color()
  startVariance = new Color(0, 0, 0, 0)
  endVariance = new Color(0, 0, 0, 0)
  sinus = false
  _rDiff: number = 0
  _gDiff: number = 0
  _bDiff: number = 0
  _aDiff: number = 0

  init = (particle: Particle) => {
    particle.colorStart.copyFrom(this.start)
    particle.colorStart.r += this.varianceFrom(this.startVariance.r)
    particle.colorStart.g += this.varianceFrom(this.startVariance.g)
    particle.colorStart.b += this.varianceFrom(this.startVariance.b)
    particle.colorStart.alpha += this.varianceFrom(this.startVariance.alpha)

    particle.colorEnd.copyFrom(this.end)
    particle.colorEnd.r += this.varianceFrom(this.endVariance.r)
    particle.colorEnd.g += this.varianceFrom(this.endVariance.g)
    particle.colorEnd.b += this.varianceFrom(this.endVariance.b)
    particle.colorEnd.alpha += this.varianceFrom(this.endVariance.alpha)

    particle.color.copyFrom(particle.colorStart)

    this._rDiff = particle.colorEnd.r - particle.colorStart.r
    this._gDiff = particle.colorEnd.g - particle.colorStart.g
    this._bDiff = particle.colorEnd.b - particle.colorStart.b
    this._aDiff = particle.colorEnd.alpha - particle.colorStart.alpha
  }

  apply = (particle: Particle) => {
    particle.color.copyFrom(particle.colorStart)

    particle.color.r += this._rDiff * particle.lifeProgress
    particle.color.g += this._gDiff * particle.lifeProgress
    particle.color.b += this._bDiff * particle.lifeProgress

    if (!this.sinus) {
      particle.color.alpha += this._aDiff * particle.lifeProgress
    } else {
      particle.color.alpha = Math.sin(particle.lifeProgress * 3.1)
    }
  }

  getName() {
    return BehaviourNames.COLOR_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      start: {
        _r: this.start.r,
        _g: this.start.g,
        _b: this.start.b,
        _alpha: this.start.alpha,
      },
      end: {
        _r: this.start.r,
        _g: this.start.g,
        _b: this.start.b,
        _alpha: this.start.alpha,
      },
      startVariance: {
        _r: this.start.r,
        _g: this.start.g,
        _b: this.start.b,
        _alpha: this.start.alpha,
      },
      endVariance: {
        _r: this.start.r,
        _g: this.start.g,
        _b: this.start.b,
        _alpha: this.start.alpha,
      },
      sinus: this.sinus,
      name: this.getName(),
    }
  }
}
