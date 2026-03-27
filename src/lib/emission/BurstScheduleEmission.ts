import AbstractEmission from './AbstractEmission'
import EmissionTypes from './EmissionTypes'

/**
 * Emits bursts on a cadence. Useful for pulsing/impact-like effects.
 */
export default class BurstScheduleEmission extends AbstractEmission {
  _maxParticles = 0
  _burstCount = 20
  _cooldown = 0.3
  _jitter = 0
  _timeUntilNextBurst = 0
  _pendingBurst = 0

  private getNextCooldown() {
    if (this._jitter <= 0) {
      return this._cooldown
    }
    const jitterRange = this._cooldown * this._jitter
    const offset = (Math.random() * 2 - 1) * jitterRange
    return Math.max(0, this._cooldown + offset)
  }

  howMany(deltaTime: number, particlesCount: number) {
    if (particlesCount >= this._maxParticles) {
      return 0
    }

    this._timeUntilNextBurst -= deltaTime
    let guard = 0
    while (this._timeUntilNextBurst <= 0) {
      this._pendingBurst += this._burstCount
      this._timeUntilNextBurst += this.getNextCooldown()
      guard++
      if (guard > 1000) {
        break
      }
      if (this._cooldown <= 0) {
        break
      }
    }

    const capacity = this._maxParticles - particlesCount
    const emitCount = Math.min(this._pendingBurst, capacity)
    this._pendingBurst = Math.max(0, this._pendingBurst - emitCount)
    return emitCount
  }

  reset() {
    this._timeUntilNextBurst = 0
    this._pendingBurst = 0
  }

  validate() {
    this._maxParticles = Math.max(0, this._maxParticles)
    this._burstCount = Math.max(1, Math.floor(this._burstCount))
    this._cooldown = Math.max(0, this._cooldown)
    this._jitter = Math.min(1, Math.max(0, this._jitter))
    this._timeUntilNextBurst = Math.max(0, this._timeUntilNextBurst)
    this._pendingBurst = Math.max(0, Math.floor(this._pendingBurst))
  }

  getName = () => {
    return EmissionTypes.BURST_SCHEDULE
  }
}
