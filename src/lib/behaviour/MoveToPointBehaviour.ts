// src/lib/behaviour/MoveToPointBehaviour.ts
import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'
import { Point } from '../util'

/**
 * MoveToPointBehaviour makes particles move towards a specified target point
 * when active, with options for different path types and easing.
 * @extends Behaviour
 */
export default class MoveToPointBehaviour extends Behaviour {
  enabled: boolean = true
  /**
   * When true, particles will move towards the targetPoint.
   */
  active: boolean = false
  /**
   * The target (x, y) coordinates for the particles.
   */
  targetPoint: Point = new Point(0, 0)
  /**
   * The speed at which particles move towards the target point (units per second).
   */
  speed: number = 100
  /**
   * If true, particles will be marked as "dead" (lifeTime >= maxLifeTime)
   * once they reach the targetPoint while this behaviour is active.
   */
  killOnArrival: boolean = false
  resetMaxLifeTime: boolean = false
  /**
   * The distance threshold to consider a particle "at" the target point.
   */
  arrivalThreshold: number = 1.0
  /**
   * Priority determines execution order. A lower number means it runs later.
   * This should run after default position behaviours to override the particle's position.
   * PositionBehaviour is 100, EmitDirection is 0. Set to -10 to run after them.
   */
  priority: number = -10

  /**
   * Type of path the particle will follow.
   * 'linear': Straight line to the target.
   * 'sinusoidal': Moves towards the target with a sine wave perpendicular to the path.
   */
  pathType: 'linear' | 'sinusoidal' = 'linear'
  /**
   * Amplitude of the sine wave for 'sinusoidal' pathType.
   */
  sinusoidalAmplitude: number = 20
  /**
   * Frequency of the sine wave for 'sinusoidal' pathType (in radians per unit of pathTime).
   */
  sinusoidalFrequency: number = 5
  /**
   * Easing function to apply to the particle's movement towards the target.
   * Examples: 'linear', 'back.in', 'back.out', 'back.inOut', 'power1.in', 'power1.out', 'power1.inOut',
   * 'bounce.in', 'bounce.out', 'bounce.inOut', 'elastic.in', 'elastic.out', 'elastic.inOut', 'steps'
   */
  pathEasing: string = 'linear' // Default to linear

  // Internal state
  private _wasActiveLastFrame: Map<number, boolean> = new Map()
  private _lastTargetPoint: Point = new Point(0, 0)

  constructor() {
    super()
    this.targetPoint = new Point(0, 0)
    this._lastTargetPoint.copyFrom(this.targetPoint)
  }

  init = (particle: Particle) => {
    // Particle properties are reset in Particle.reset()
  }

  private _initializeParticleForMove(particle: Particle) {
    particle.moveToPointInitialX = particle.x
    particle.moveToPointInitialY = particle.y
    const dx = this.targetPoint.x - particle.moveToPointInitialX
    const dy = this.targetPoint.y - particle.moveToPointInitialY
    particle.moveToPointTotalDistance = Math.sqrt(dx * dx + dy * dy)
    particle.moveToPointAccumulatedLinearDistance = 0
    particle.pathTime = 0 // Reset for sinusoidal path as well
  }

  apply = (particle: Particle, deltaTime: number) => {
    if (!this.enabled) {
      if (this._wasActiveLastFrame.has(particle.uid)) {
        this._wasActiveLastFrame.delete(particle.uid)
      }
      return
    }

    const isActiveThisFrame = this.active
    const wasActivePreviously = this._wasActiveLastFrame.get(particle.uid) ?? false
    const targetChanged =
      this.targetPoint.x !== this._lastTargetPoint.x || this.targetPoint.y !== this._lastTargetPoint.y

    if (targetChanged) {
      this._lastTargetPoint.copyFrom(this.targetPoint)
    }

    if (!isActiveThisFrame) {
      if (wasActivePreviously) {
        this._wasActiveLastFrame.set(particle.uid, false)
        particle.moveToPointAccumulatedLinearDistance = 0
        particle.moveToPointTotalDistance = 0
        particle.pathTime = 0
      }
      return
    }

    if (!wasActivePreviously || (isActiveThisFrame && targetChanged)) {
      this._initializeParticleForMove(particle)
    }
    this._wasActiveLastFrame.set(particle.uid, true)

    // If already very close to the target at the start of this frame (before any movement this frame)
    // Or if the total distance to cover was 0 from the start
    if (particle.moveToPointTotalDistance < this.arrivalThreshold) {
      particle.x = this.targetPoint.x
      particle.y = this.targetPoint.y
      if (this.killOnArrival) {
        if (particle.maxLifeTime > 0) {
          particle.lifeTime = particle.maxLifeTime
          if (this.resetMaxLifeTime) particle.maxLifeTime = 0
        }
      }
      particle.movement.x = particle.x
      particle.movement.y = particle.y
      return // Already arrived or no distance to cover
    }

    particle.velocity.set(0, 0)
    particle.acceleration.set(0, 0)

    const moveAmount = this.speed * deltaTime
    particle.moveToPointAccumulatedLinearDistance += moveAmount

    let normalizedProgress =
      particle.moveToPointTotalDistance > 0
        ? particle.moveToPointAccumulatedLinearDistance / particle.moveToPointTotalDistance
        : 1

    // Ensure progress doesn't exceed 1.0 before easing, which could cause overshooting with certain eases.
    normalizedProgress = Math.min(1.0, normalizedProgress)

    const easedProgress = this._applyEasing(normalizedProgress, this.pathEasing)

    // Calculate the position on the straight line path based on eased progress
    let currentXOnLine =
      particle.moveToPointInitialX + (this.targetPoint.x - particle.moveToPointInitialX) * easedProgress
    let currentYOnLine =
      particle.moveToPointInitialY + (this.targetPoint.y - particle.moveToPointInitialY) * easedProgress

    // Apply sinusoidal offset if applicable and the linear journey is not yet complete
    if (this.pathType === 'sinusoidal' && normalizedProgress < 1.0) {
      const dirToTargetX = (this.targetPoint.x - particle.moveToPointInitialX) / particle.moveToPointTotalDistance
      const dirToTargetY = (this.targetPoint.y - particle.moveToPointInitialY) / particle.moveToPointTotalDistance

      const perpDx = -dirToTargetY // Perpendicular vector component
      const perpDy = dirToTargetX // Perpendicular vector component

      // The sinusoidal offset should diminish as it approaches the target
      // We can scale the amplitude by (1 - easedProgress) or (1 - normalizedProgress)
      // Using (1 - normalizedProgress) makes the wave die out more linearly with distance.
      const diminishingFactor = Math.max(0, 1 - normalizedProgress) // Ensure factor is not negative
      const currentAmplitude = this.sinusoidalAmplitude * diminishingFactor

      const sinMagnitude = currentAmplitude * Math.sin(particle.pathTime * this.sinusoidalFrequency)

      particle.x = currentXOnLine + perpDx * sinMagnitude
      particle.y = currentYOnLine + perpDy * sinMagnitude

      particle.pathTime += deltaTime // Advance sinusoidal path time
    } else {
      // For linear path, or if sinusoidal path has "completed" its linear component
      particle.x = currentXOnLine
      particle.y = currentYOnLine
    }

    // Final Arrival Snap and State Reset
    // This check is based on the linear progress.
    if (normalizedProgress >= 1.0) {
      particle.x = this.targetPoint.x // Snap precisely to target
      particle.y = this.targetPoint.y

      particle.moveToPointAccumulatedLinearDistance = 0
      particle.moveToPointTotalDistance = 0
      particle.pathTime = 0

      if (this.killOnArrival) {
        if (particle.maxLifeTime > 0) {
          particle.lifeTime = particle.maxLifeTime
          if (this.resetMaxLifeTime) particle.maxLifeTime = 0
        }
      }
    }

    particle.movement.x = particle.x
    particle.movement.y = particle.y
  }

  onParticleRemoved = (particle: Particle) => {
    this._wasActiveLastFrame.delete(particle.uid)
  }

  private _applyEasing(t: number, easeType: string): number {
    // Ensure t is clamped between 0 and 1 before applying easing
    const clampedT = Math.max(0, Math.min(1, t))
    switch (easeType) {
      case 'back.in':
        return this._easeBackIn(clampedT)
      case 'back.out':
        return this._easeBackOut(clampedT)
      case 'back.inOut':
        return this._easeBackInOut(clampedT)
      case 'power1.in':
        return this._easePower1In(clampedT)
      case 'power1.out':
        return this._easePower1Out(clampedT)
      case 'power1.inOut':
        return this._easePower1InOut(clampedT)
      case 'bounce.in':
        return this._easeBounceIn(clampedT)
      case 'bounce.out':
        return this._easeBounceOut(clampedT)
      case 'bounce.inOut':
        return this._easeBounceInOut(clampedT)
      case 'elastic.in':
        return this._easeElasticIn(clampedT)
      case 'elastic.out':
        return this._easeElasticOut(clampedT)
      case 'elastic.inOut':
        return this._easeElasticInOut(clampedT)
      case 'steps':
        return this._easeSteps(clampedT)
      case 'linear':
      default:
        return clampedT
    }
  }

  private _easeBackInOut(t: number, c1 = 1.70158, c2 = c1 * 1.525): number {
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2
  }

  private _easeBackIn(t: number, c1 = 1.70158): number {
    return t * t * ((c1 + 1) * t - c1)
  }

  private _easeBackOut(t: number, c1 = 1.70158): number {
    const tInv = t - 1
    return tInv * tInv * ((c1 + 1) * tInv + c1) + 1
  }

  private _easePower1In(t: number): number {
    return t
  }

  private _easePower1Out(t: number): number {
    return t // Linear
  }

  private _easePower1InOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
  }

  private _easeBounceIn(t: number): number {
    return 1 - this._easeBounceOut(1 - t)
  }

  private _easeBounceOut(t: number): number {
    const n1 = 7.5625
    const d1 = 2.75
    if (t < 1 / d1) {
      return n1 * t * t
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375
    }
  }

  private _easeBounceInOut(t: number): number {
    return t < 0.5 ? (1 - this._easeBounceOut(1 - 2 * t)) / 2 : (1 + this._easeBounceOut(2 * t - 1)) / 2
  }

  private _easeElasticIn(t: number, amplitude = 1, period = 0.3): number {
    if (t === 0) return 0
    if (t === 1) return 1
    const s = (period / (2 * Math.PI)) * Math.asin(1 / amplitude)
    return -(amplitude * Math.pow(2, 10 * (t -= 1)) * Math.sin(((t - s) * (2 * Math.PI)) / period))
  }

  private _easeElasticOut(t: number, amplitude = 1, period = 0.3): number {
    if (t === 0) return 0
    if (t === 1) return 1
    const s = (period / (2 * Math.PI)) * Math.asin(1 / amplitude)
    return amplitude * Math.pow(2, -10 * t) * Math.sin(((t - s) * (2 * Math.PI)) / period) + 1
  }

  private _easeElasticInOut(t: number, amplitude = 1, period = 0.45): number {
    if (t === 0) return 0
    if (t === 1) return 1
    const s = (period / (2 * Math.PI)) * Math.asin(1 / amplitude)
    if ((t *= 2) < 1) {
      return -0.5 * (amplitude * Math.pow(2, 10 * (t -= 1)) * Math.sin(((t - s) * (2 * Math.PI)) / period))
    }
    return amplitude * Math.pow(2, -10 * (t -= 1)) * Math.sin(((t - s) * (2 * Math.PI)) / period) * 0.5 + 1
  }

  private _easeSteps(t: number, numSteps = 12): number {
    const stepSize = 1 / numSteps
    const stepIndex = Math.floor(t / stepSize)
    return Math.min(stepIndex * stepSize, 1.0)
  }

  getName() {
    return BehaviourNames.MOVE_TO_POINT_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      active: this.active,
      targetPoint: { x: this.targetPoint.x, y: this.targetPoint.y },
      speed: this.speed,
      killOnArrival: this.killOnArrival,
      resetMaxLifeTime: this.resetMaxLifeTime,
      arrivalThreshold: this.arrivalThreshold,
      priority: this.priority,
      pathType: this.pathType,
      sinusoidalAmplitude: this.sinusoidalAmplitude,
      sinusoidalFrequency: this.sinusoidalFrequency,
      pathEasing: this.pathEasing,
      name: this.getName(),
    }
  }
}
