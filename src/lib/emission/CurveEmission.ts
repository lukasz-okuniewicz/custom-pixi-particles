import AbstractEmission from './AbstractEmission'
import EmissionTypes from './EmissionTypes'

type CurvePoint = [number, number]

/**
 * Emission rate sampled from a normalized timeline curve.
 * Curve values represent particles-per-second at each normalized time point.
 */
export default class CurveEmission extends AbstractEmission {
  _maxParticles = 0
  _duration = 1
  _loop = false
  _curve: CurvePoint[] = [
    [0, 0],
    [1, 100],
  ]
  _elapsed = 0
  _carry = 0

  private normalizeCurve(curve: any): CurvePoint[] {
    if (!Array.isArray(curve) || curve.length === 0) {
      return [
        [0, 0],
        [1, 0],
      ]
    }
    const points: CurvePoint[] = []
    for (let i = 0; i < curve.length; i++) {
      const item = curve[i]
      if (!Array.isArray(item) || item.length < 2) continue
      const t = Number(item[0])
      const v = Number(item[1])
      if (!Number.isFinite(t) || !Number.isFinite(v)) continue
      points.push([Math.min(1, Math.max(0, t)), Math.max(0, v)])
    }
    if (points.length === 0) {
      return [
        [0, 0],
        [1, 0],
      ]
    }
    points.sort((a, b) => a[0] - b[0])
    return points
  }

  private sampleRate(t: number) {
    const curve = this._curve
    if (curve.length === 1) {
      return curve[0][1]
    }
    if (t <= curve[0][0]) return curve[0][1]
    for (let i = 1; i < curve.length; i++) {
      const a = curve[i - 1]
      const b = curve[i]
      if (t <= b[0]) {
        const span = b[0] - a[0]
        if (span <= 0) return b[1]
        const ratio = (t - a[0]) / span
        return a[1] + (b[1] - a[1]) * ratio
      }
    }
    return curve[curve.length - 1][1]
  }

  howMany(deltaTime: number, particlesCount: number) {
    if (particlesCount >= this._maxParticles) {
      return 0
    }

    this._elapsed += deltaTime
    let t = 1
    if (this._duration > 0) {
      t = this._loop ? (this._elapsed % this._duration) / this._duration : Math.min(1, this._elapsed / this._duration)
    }

    const rate = this.sampleRate(t)
    this._carry += rate * deltaTime
    let emitCount = Math.floor(this._carry)
    if (emitCount > 0) {
      this._carry -= emitCount
    }

    const capacity = this._maxParticles - particlesCount
    if (emitCount > capacity) {
      emitCount = capacity
      this._carry = 0
    }
    return Math.max(0, emitCount)
  }

  reset() {
    this._elapsed = 0
    this._carry = 0
  }

  validate() {
    this._maxParticles = Math.max(0, this._maxParticles)
    this._duration = Math.max(0.001, this._duration)
    this._loop = Boolean(this._loop)
    this._curve = this.normalizeCurve(this._curve)
    this._elapsed = Math.max(0, this._elapsed)
    this._carry = Math.max(0, this._carry)
  }

  getName = () => {
    return EmissionTypes.CURVE
  }
}
