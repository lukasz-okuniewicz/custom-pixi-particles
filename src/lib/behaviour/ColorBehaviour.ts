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
  }

  apply = (particle: Particle) => {
    const { colorStart, lifeProgress, colorEnd } = particle

    particle.color.copyFrom(colorStart)

    particle.color.r += (colorEnd.r - colorStart.r) * lifeProgress
    particle.color.g += (colorEnd.g - colorStart.g) * lifeProgress
    particle.color.b += (colorEnd.b - colorStart.b) * lifeProgress

    if (!this.sinus) {
      particle.color.alpha += (colorEnd.alpha - colorStart.alpha) * lifeProgress
    } else {
      particle.color.alpha = Math.sin(lifeProgress * 3.1)
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
        _r: this.end.r,
        _g: this.end.g,
        _b: this.end.b,
        _alpha: this.end.alpha,
      },
      startVariance: {
        _r: this.startVariance.r,
        _g: this.startVariance.g,
        _b: this.startVariance.b,
        _alpha: this.startVariance.alpha,
      },
      endVariance: {
        _r: this.endVariance.r,
        _g: this.endVariance.g,
        _b: this.endVariance.b,
        _alpha: this.endVariance.alpha,
      },
      sinus: this.sinus,
      name: this.getName(),
    }
  }
}
