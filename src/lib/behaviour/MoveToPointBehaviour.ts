// src/lib/behaviour/MoveToPointBehaviour.ts
import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'
import { Point } from '../util'

/**
 * MoveToPointBehaviour makes particles move towards a specified target point
 * when active, with options for different path types.
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

  // Internal state to manage pathTime reset on activation
  private _wasActiveLastFrame: Map<number, boolean> = new Map()

  constructor() {
    super()
    // Ensure targetPoint is initialized as a Point instance for copyFromRawData in parser
    this.targetPoint = new Point(0, 0)
  }

  /**
   * Initializes particle properties for the behaviour.
   * particle.pathTime is reset to 0 by Particle.reset().
   * @param {Particle} particle - The particle to initialize.
   */
  init = (particle: Particle) => {
    // particle.pathTime is initialized to 0 in Particle.reset()
    // No specific particle init needed here beyond what Particle.reset() does for pathTime.
  }

  /**
   * Applies the behaviour to the particle. If active, moves the particle
   * towards the targetPoint along the specified path.
   * @param {Particle} particle - The particle to apply the behaviour to.
   * @param {number} deltaTime - Time elapsed since the last frame.
   */
  apply = (particle: Particle, deltaTime: number) => {
    if (!this.enabled) {
      if (this._wasActiveLastFrame.has(particle.uid)) {
        // If behaviour was active and is now disabled, ensure cleanup for this particle
        this._wasActiveLastFrame.delete(particle.uid)
        // Optionally reset pathTime if deactivation should clear path progress
        // particle.pathTime = 0;
      }
      return
    }

    const isActiveThisFrame = this.active
    const wasActivePreviously = this._wasActiveLastFrame.get(particle.uid) ?? false

    if (!isActiveThisFrame) {
      if (wasActivePreviously) {
        // Behaviour was active, now it's not. Reset pathTime for next activation.
        particle.pathTime = 0
        this._wasActiveLastFrame.set(particle.uid, false) // Or delete if preferred
      }
      return
    }

    // Behaviour is active this frame
    if (!wasActivePreviously) {
      // Behaviour just became active for this particle
      particle.pathTime = 0 // Reset path progress
    }
    this._wasActiveLastFrame.set(particle.uid, true)

    // Take control of particle's direct movement
    particle.velocity.set(0, 0)
    particle.acceleration.set(0, 0)

    const dx = this.targetPoint.x - particle.x
    const dy = this.targetPoint.y - particle.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < this.arrivalThreshold) {
      particle.x = this.targetPoint.x
      particle.y = this.targetPoint.y
      particle.pathTime = 0 // Reset pathTime on arrival
      if (this.killOnArrival) {
        if (particle.maxLifeTime > 0) {
          particle.lifeTime = particle.maxLifeTime
          if (this.resetMaxLifeTime) {
            particle.maxLifeTime = 0
          }
        }
      }
      // Note: _wasActiveLastFrame remains true; if active remains true, it will just stay at target.
      return
    }

    const moveAmount = this.speed * deltaTime

    if (moveAmount >= distance) {
      // Will reach or pass target this step
      particle.x = this.targetPoint.x
      particle.y = this.targetPoint.y
      particle.pathTime = 0 // Reset pathTime on arrival
      if (this.killOnArrival) {
        if (particle.maxLifeTime > 0) {
          particle.lifeTime = particle.maxLifeTime
          if (this.resetMaxLifeTime) {
            particle.maxLifeTime = 0
          }
        }
      }
    } else {
      const normDx = dx / distance
      const normDy = dy / distance

      if (this.pathType === 'sinusoidal') {
        const perpDx = -normDy // Perpendicular vector component
        const perpDy = normDx // Perpendicular vector component

        // Calculate sinusoidal offset magnitude
        const sinMagnitude = this.sinusoidalAmplitude * Math.sin(particle.pathTime * this.sinusoidalFrequency)

        // Apply movement along direct path + sinusoidal offset
        particle.x += normDx * moveAmount + perpDx * sinMagnitude
        particle.y += normDy * moveAmount + perpDy * sinMagnitude

        particle.pathTime += deltaTime
      } else {
        // 'linear' path (default)
        particle.x += normDx * moveAmount
        particle.y += normDy * moveAmount
      }
    }

    // Sync particle.movement to the new x, y.
    particle.movement.x = particle.x
    particle.movement.y = particle.y
  }

  /**
   * Called by the Emitter when a particle is removed.
   * Used here to clean up internal state for the removed particle.
   * @param {Particle} particle - The particle being removed.
   */
  onParticleRemoved = (particle: Particle) => {
    this._wasActiveLastFrame.delete(particle.uid)
  }

  /**
   * Gets the name of the behaviour.
   * @returns {string} - The name of the behaviour.
   */
  getName() {
    return BehaviourNames.MOVE_TO_POINT_BEHAVIOUR
  }

  /**
   * Gets the properties of the behaviour for configuration.
   * @returns {object} - The properties of the behaviour.
   */
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
      name: this.getName(),
    }
  }
}
