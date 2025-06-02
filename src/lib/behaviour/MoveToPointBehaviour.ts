import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'
import { Point } from '../util'

/**
 * MoveToPointBehaviour makes particles move towards a specified target point
 * when active.
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

  constructor() {
    super()
    // Ensure targetPoint is initialized as a Point instance for copyFromRawData in parser
    this.targetPoint = new Point(0, 0)
  }

  /**
   * Initializes particle properties for the behaviour.
   * This behaviour doesn't require specific per-particle initialization at creation time,
   * as its effect is mostly global and trigger-based.
   * @param {Particle} particle - The particle to initialize.
   */
  init = (particle: Particle) => {
    // No particle-specific setup needed when it's created,
    // as the movement is controlled by the 'active' state of the behaviour.
  }

  /**
   * Applies the behaviour to the particle. If active, moves the particle
   * towards the targetPoint.
   * @param {Particle} particle - The particle to apply the behaviour to.
   * @param {number} deltaTime - Time elapsed since the last frame.
   */
  apply = (particle: Particle, deltaTime: number) => {
    if (!this.enabled || !this.active) {
      // If the behaviour is not enabled or not active, do nothing.
      // The particle will continue its movement based on other behaviours.
      return
    }

    // If the particle is already considered dead by other means, don't process further.
    if (particle.isDead()) {
      return
    }

    const dx = this.targetPoint.x - particle.x
    const dy = this.targetPoint.y - particle.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // When this behaviour is active, it takes full control of the particle's position.
    // We also zero out current velocity and acceleration to prevent interference
    // from other behaviours for this frame's positioning.
    particle.velocity.set(0, 0)
    particle.acceleration.set(0, 0)

    // If particle is already at or very close to the target
    if (distance < this.arrivalThreshold) {
      particle.x = this.targetPoint.x
      particle.y = this.targetPoint.y
      if (this.killOnArrival) {
        // Mark the particle as dead. The Emitter will pick this up and remove it.
        // Ensure maxLifeTime is positive; otherwise, this won't "kill" it effectively.
        if (particle.maxLifeTime > 0) {
          particle.lifeTime = particle.maxLifeTime
          if (this.resetMaxLifeTime) {
            particle.maxLifeTime = 0
          }
        } else {
          // If maxLifeTime is 0 or negative (infinite),
          // we can't use it to kill. Consider an alternative
          // or ensure particles using this feature have a finite life.
          // For now, we'll just set it to a high value, but ideally,
          // this feature is for particles with defined lifespans.
          // Or, one could introduce a specific "killNow" flag on the particle
          // if the Emitter was modified to check for it.
          // Simplest for now is to rely on a positive maxLifeTime.
          // If maxLifeTime is not > 0, the particle won't be "killed" by this mechanism.
        }
      }
    } else {
      const moveAmount = this.speed * deltaTime
      if (moveAmount >= distance) {
        // If the movement step is enough to reach the target, snap to target
        particle.x = this.targetPoint.x
        particle.y = this.targetPoint.y
        if (this.killOnArrival) {
          if (particle.maxLifeTime > 0) {
            particle.lifeTime = particle.maxLifeTime
            if (this.resetMaxLifeTime) {
              particle.maxLifeTime = 0
            }
          }
        }
      } else {
        // Move towards the target
        particle.x += (dx / distance) * moveAmount
        particle.y += (dy / distance) * moveAmount
      }
    }

    // Sync particle.movement to the new x, y. This helps if this behaviour
    // becomes inactive, allowing other behaviours like PositionBehaviour
    // to resume more smoothly from the particle's current position.
    particle.movement.x = particle.x
    particle.movement.y = particle.y
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
      name: this.getName(),
    }
  }
}
