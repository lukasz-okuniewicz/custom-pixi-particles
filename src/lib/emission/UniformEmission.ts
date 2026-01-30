import AbstractEmission from './AbstractEmission'
import EmissionTypes from './EmissionTypes'

/**
 * UniformEmission class is the implementation of the abstract class AbstractEmission.
 * It implements the method howMany and has other methods to set and get the related data.
 *
 * @class UniformEmission
 * @extends AbstractEmission
 */
export default class UniformEmission extends AbstractEmission {
  _maxParticles = 0
  _maxLife = 1
  _emitPerSecond = 0
  _frames = 0

  /**
   * Calculates the number of particles to emit.
   *
   * @param {number} deltaTime - The elapsed time between frames.
   * @param {number} particlesCount - The current number of particles on the screen.
   * @returns {number} The number of particles to emit in the current frame.
   */
  howMany(deltaTime: number, particlesCount: number) {
    if (particlesCount >= this._maxParticles) {
      this._frames = 0
      return 0
    }

    const ratio = this._emitPerSecond * deltaTime
    this._frames += ratio

    let numberToEmit = 0
    if (this._frames >= 1.0) {
      numberToEmit = Math.floor(this._frames)
      this._frames -= numberToEmit
    }

    const capacity = this._maxParticles - particlesCount
    if (numberToEmit > capacity) {
      numberToEmit = Math.max(0, capacity)
      this._frames = 0
    }

    return numberToEmit
  }

  /**
   * Reset the emission so the next frame can emit immediately (no initial delay).
   */
  reset() {
    this._frames = 1.0
  }

  /**
   * Recalculates the emitPerSecond value based on the maxParticles and maxLife values.
   */
  refresh() {
    this.emitPerSecond = this._maxParticles / this._maxLife
  }

  /**
   * Sets the maxLife value and calls refresh() to recalculate the emitPerSecond.
   *
   * @param {number} value - The new maxLife value.
   */
  set maxLife(value: number) {
    this._maxLife = Math.max(value, 1)
    this.refresh()
  }

  /**
   * Sets the maxParticles value and calls refresh() to recalculate the emitPerSecond.
   *
   * @param {number} value - The new maxParticles value.
   */
  set maxParticles(value: number) {
    this._maxParticles = Math.max(value, 0)
    this.refresh()
  }

  /**
   * Returns the emitPerSecond value.
   *
   * @returns {number} The emitPerSecond value.
   */
  get emitPerSecond() {
    return this._emitPerSecond
  }

  /**
   * Sets the emitPerSecond value.
   *
   * @param {number} value - The new emitPerSecond value.
   */
  set emitPerSecond(value: number) {
    this._emitPerSecond = Math.max(value, 0)
  }

  /**
   * Returns EmissionTypes.DEFAULT.
   *
   * @returns {string} EmissionTypes.DEFAULT.
   */
  getName = () => {
    return EmissionTypes.DEFAULT
  }
}
