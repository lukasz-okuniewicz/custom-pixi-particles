import { AbstractEmission, EmissionTypes } from './index'
import { Random } from '../util'

export default class RandomEmission extends AbstractEmission {
  _maxParticles = 0
  _emissionRate = 0

  howMany(deltaTime: number, particlesCount: number) {
    if (particlesCount < this.maxParticles) {
      const count = Math.round(Random.uniform(0, Math.ceil(this.emissionRate * deltaTime)))
      const total = particlesCount + count
      return total > this._maxParticles ? this.maxParticles - particlesCount : count
    }

    return 0
  }

  get emissionRate() {
    return this._emissionRate
  }

  set emissionRate(value: number) {
    this._emissionRate = Math.max(0, value)
  }

  get maxParticles() {
    return this._maxParticles
  }

  set maxParticles(value: number) {
    this._maxParticles = Math.max(0, value)
  }

  getName = () => {
    return EmissionTypes.RANDOM
  }
}
