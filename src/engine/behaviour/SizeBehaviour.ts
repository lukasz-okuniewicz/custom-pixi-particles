import { Point } from '../util'
import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'

export default class SizeBehaviour extends Behaviour {
  enabled = true
  priority = 0
  allowNegativeValues = false
  sizeStart = new Point(1, 1)
  sizeEnd = new Point(1, 1)
  startVariance = 0
  endVariance = 0

  init = (particle: Particle) => {
    if (!this.enabled) return
    let variance = this.varianceFrom(this.startVariance)
    particle.sizeStart.x = this.sizeStart.x + variance
    particle.sizeStart.y = this.sizeStart.y + variance

    variance = this.varianceFrom(this.endVariance)
    particle.sizeEnd.x = this.sizeEnd.x + variance
    particle.sizeEnd.y = this.sizeEnd.y + variance

    if (!this.allowNegativeValues) {
      particle.sizeStart.x = Math.max(particle.sizeStart.x, 0)
      particle.sizeStart.y = Math.max(particle.sizeStart.y, 0)
      particle.sizeEnd.x = Math.max(particle.sizeEnd.x, 0)
      particle.sizeEnd.y = Math.max(particle.sizeEnd.y, 0)
    }

    particle.size.copyFrom(particle.sizeStart)
  }

  apply = (particle: Particle, deltaTime: number) => {
    if (!this.enabled) return
    particle.size.copyFrom(particle.sizeStart)
    particle.size.x += (particle.sizeEnd.x - particle.sizeStart.x) * particle.lifeProgress
    particle.size.y += (particle.sizeEnd.y - particle.sizeStart.y) * particle.lifeProgress

    if (!this.allowNegativeValues) {
      particle.size.x = Math.max(0, particle.size.x)
      particle.size.x = Math.max(0, particle.size.x)
    }
  }

  getName() {
    return BehaviourNames.SIZE_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      allowNegativeValues: this.allowNegativeValues,
      sizeStart: {
        x: this.sizeStart.x,
        y: this.sizeStart.y,
      },
      sizeEnd: {
        x: this.sizeStart.x,
        y: this.sizeStart.y,
      },
      startVariance: this.startVariance,
      endVariance: this.endVariance,
      name: this.getName(),
    }
  }
}
