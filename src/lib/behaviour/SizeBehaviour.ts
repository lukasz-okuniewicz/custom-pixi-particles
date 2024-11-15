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
    let variance = this.varianceFrom(this.startVariance)

    let sizeStartX = this.sizeStart.x + variance
    let sizeStartY = this.sizeStart.y + variance

    variance = this.varianceFrom(this.endVariance)

    let sizeEndX = this.sizeEnd.x + variance
    let sizeEndY = this.sizeEnd.y + variance

    if (!this.allowNegativeValues) {
      sizeStartX = Math.max(sizeStartX, 0)
      sizeStartY = Math.max(sizeStartY, 0)
      sizeEndX = Math.max(sizeEndX, 0)
      sizeEndY = Math.max(sizeEndY, 0)
    }

    particle.sizeDifference = {
      x: sizeEndX - sizeStartX,
      y: sizeEndY - sizeStartY,
    }

    particle.sizeStart.x = sizeStartX
    particle.sizeStart.y = sizeStartY
    particle.sizeEnd.x = sizeEndX
    particle.sizeEnd.y = sizeEndY
    particle.size.copyFrom(particle.sizeStart)
  }

  apply = (particle: Particle) => {
    if (!this.enabled) return
    if (particle.skipSizeBehaviour) return
    const { sizeStart, lifeProgress, sizeDifference, size } = particle

    particle.size.copyFrom(sizeStart)
    let sizeX = size.x + sizeDifference.x * lifeProgress
    let sizeY = size.y + sizeDifference.y * lifeProgress

    if (!this.allowNegativeValues) {
      sizeX = Math.max(0, sizeX)
      sizeY = Math.max(0, sizeY)
    }

    particle.size.x = sizeX
    particle.size.y = sizeY
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
        x: this.sizeEnd.x,
        y: this.sizeEnd.y,
      },
      startVariance: this.startVariance,
      endVariance: this.endVariance,
      name: this.getName(),
    }
  }
}
