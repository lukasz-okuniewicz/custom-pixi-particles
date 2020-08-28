import { AbstractEmission, EmissionTypes } from './index'

export default class StandardEmission extends AbstractEmission {
  _maxParticles = 0
  _emissionRate = 0
  _emitCounter = 0

  howMany(deltaTime: number, particlesCount: number) {
    const rate = 1.0 / this.emissionRate
    let count = 0
    if (particlesCount < this.maxParticles) {
      this._emitCounter += deltaTime
    }

    while (particlesCount < this.maxParticles && this._emitCounter > rate) {
      count++
      this._emitCounter -= rate
    }

    return count
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
    return EmissionTypes.UNIFORM
  }
}
