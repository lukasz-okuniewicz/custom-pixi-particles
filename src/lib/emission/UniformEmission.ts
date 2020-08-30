import { AbstractEmission, EmissionTypes } from './index'

export default class UniformEmission extends AbstractEmission {
  _maxParticles = 0
  _maxLife = 1
  _emitPerSecond = 0
  _frames = 0

  howMany(deltaTime: number, particlesCount: number) {
    const ratio = this._emitPerSecond * deltaTime
    this._frames += ratio

    let numberToEmit = 0
    if (this._frames >= 1.0) {
      numberToEmit = Math.round(this._frames)
      this._frames = 0
    }

    return numberToEmit
  }

  refresh() {
    this.emitPerSecond = this._maxParticles / this._maxLife
  }

  set maxLife(value: number) {
    this._maxLife = Math.max(value, 1)
    this.refresh()
  }

  set maxParticles(value: number) {
    this._maxParticles = Math.max(value, 0)
    this.refresh()
  }

  get emitPerSecond() {
    return this._emitPerSecond
  }

  set emitPerSecond(value: number) {
    this._emitPerSecond = Math.max(value, 0)
  }

  getName = () => {
    return EmissionTypes.DEFAULT
  }
}
