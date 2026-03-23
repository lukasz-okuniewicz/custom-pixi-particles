import AbstractEmission from './AbstractEmission'
import EmissionTypes from './EmissionTypes'

/**
 * Fills the emitter to a fixed particle count once (over one or more frames),
 * then emits nothing. Use with infinite life and optional toroidal wrap for persistent pools.
 */
export default class PersistentFillEmission extends AbstractEmission {
  _maxParticles = 0
  _burstPerFrame = 500

  /**
   * @param deltaTime - unused; API matches other emission controllers
   * @param particlesCount - current live particle count
   */
  howMany(_deltaTime: number, particlesCount: number) {
    if (particlesCount >= this._maxParticles) {
      return 0
    }
    const capacity = this._maxParticles - particlesCount
    return Math.min(capacity, this._burstPerFrame)
  }

  reset() {
    //
  }

  set maxParticles(value: number) {
    this._maxParticles = Math.max(value, 0)
  }

  get maxParticles() {
    return this._maxParticles
  }

  set burstPerFrame(value: number) {
    this._burstPerFrame = Math.max(1, Math.floor(value))
  }

  get burstPerFrame() {
    return this._burstPerFrame
  }

  getName = () => {
    return EmissionTypes.PERSISTENT_FILL
  }
}
