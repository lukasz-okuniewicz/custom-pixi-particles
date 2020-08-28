import { Color } from '../util'
import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'

export default class ColorBehaviour extends Behaviour {
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

  apply = (particle: Particle, deltaTime: number) => {
    particle.color.copyFrom(particle.colorStart)

    particle.color.r += (particle.colorEnd.r - particle.colorStart.r) * particle.lifeProgress
    particle.color.g += (particle.colorEnd.g - particle.colorStart.g) * particle.lifeProgress
    particle.color.b += (particle.colorEnd.b - particle.colorStart.b) * particle.lifeProgress

    if (!this.sinus) {
      particle.color.alpha += (particle.colorEnd.alpha - particle.colorStart.alpha) * particle.lifeProgress
    } else {
      particle.color.alpha = Math.sin(particle.lifeProgress * 3.1)
    }
  }

  getName() {
    return BehaviourNames.COLOR_BEHAVIOUR
  }
}
