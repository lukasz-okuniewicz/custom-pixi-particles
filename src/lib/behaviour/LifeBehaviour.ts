import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'

export default class LifeBehaviour extends Behaviour {
  enabled = true
  priority = 10000
  maxLifeTime = 0
  timeVariance = 0

  init = (particle: Particle) => {
    particle.lifeTime = 0
    particle.lifeProgress = 0

    particle.maxLifeTime = this.maxLifeTime + this.varianceFrom(this.timeVariance)
    particle.maxLifeTime = Math.max(particle.maxLifeTime, 0.0)
  }

  apply = (particle: Particle, deltaTime: number) => {
    particle.lifeTime += deltaTime

    if (particle.maxLifeTime > 0) {
      particle.lifeProgress = Math.min(1.0, particle.lifeTime / particle.maxLifeTime)
    }
  }

  getName() {
    return BehaviourNames.LIFE_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      maxLifeTime: this.maxLifeTime,
      timeVariance: this.timeVariance,
      name: this.getName(),
    }
  }
}
