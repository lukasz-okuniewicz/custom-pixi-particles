import { Point } from '../util'
import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'
import Model from '../Model'

export default class PositionBehaviour extends Behaviour {
  /** Default true so integration runs when config omits `enabled` (most emitters need this). */
  enabled = true
  priority = 100
  sinX: boolean = false
  sinY: boolean = false
  sinXVal = new Point()
  sinYVal = new Point()
  sinXValVariance = new Point()
  sinYValVariance = new Point()
  positionVariance = new Point()
  velocity = new Point()
  velocityVariance = new Point()
  acceleration = new Point()
  accelerationVariance = new Point()
  drag = 0
  dragVariance = 0
  maxSpeed = -1
  maxSpeedVariance = 0
  boundsMode: 'none' | 'wrap' | 'bounce' | 'clamp' = 'none'
  boundsMin = new Point(-1000, -1000)
  boundsMax = new Point(1000, 1000)
  bounceDamping = 1

  /**
   * Function that initializes a particle
   * @param {Particle} particle - The particle to be initialized
   * @param {Model} model - The model of the particle
   */
  init = (particle: Particle, model: Model) => {
    particle.positionDrag = Math.max(0, this.calculate(this.drag, this.dragVariance))
    particle.positionMaxSpeed = this.calculate(this.maxSpeed, this.maxSpeedVariance)
    particle.velocity.x = this.calculate(this.velocity.x, this.velocityVariance.x)
    particle.velocity.y = this.calculate(this.velocity.y, this.velocityVariance.y)

    particle.acceleration.x = this.calculate(this.acceleration.x, this.accelerationVariance.x)
    particle.acceleration.y = this.calculate(this.acceleration.y, this.accelerationVariance.y)

    if (this.sinX) {
      particle.sinXVal.x = this.calculate(this.sinXVal.x, this.sinXValVariance.x)
      particle.sinXVal.y = this.calculate(this.sinXVal.y, this.sinXValVariance.y)
    }
    if (this.sinY) {
      particle.sinYVal.x = this.calculate(this.sinYVal.x, this.sinYValVariance.x)
      particle.sinYVal.y = this.calculate(this.sinYVal.y, this.sinYValVariance.y)
    }

    particle.x = particle.movement.x
    particle.y = particle.movement.y
  }

  /**
   * Adds a random variance to the given value
   * @param {number} value - The value to calculate
   * @param {number} variance - The random variance to add
   * @returns {number} The calculated value
   */
  calculate = (value: number, variance: number) => {
    return value + this.varianceFrom(variance)
  }

  /**
   * Applies the particle's velocity and acceleration to move it and calculate its size, rotation, and position.
   * @param {Particle} particle - The particle to be moved
   * @param {number} deltaTime - The time delta for the movement calculation
   * @param {Model} model - The model containing information about the particle's movement
   */
  apply = (particle: Particle, deltaTime: number, model: Model) => {
    if (!this.enabled || particle.skipPositionBehaviour) return
    const { acceleration, sinXVal, sinYVal, movement } = particle

    const PI = Math.PI

    particle.velocity.x += acceleration.x * deltaTime
    particle.velocity.y += acceleration.y * deltaTime
    if (particle.positionDrag > 0) {
      const dragFactor = Math.max(0, 1 - particle.positionDrag * deltaTime)
      particle.velocity.x *= dragFactor
      particle.velocity.y *= dragFactor
    }
    if (particle.positionMaxSpeed > 0) {
      const speedSq = particle.velocity.x * particle.velocity.x + particle.velocity.y * particle.velocity.y
      const maxSpeedSq = particle.positionMaxSpeed * particle.positionMaxSpeed
      if (speedSq > maxSpeedSq) {
        const speed = Math.sqrt(speedSq)
        const scale = particle.positionMaxSpeed / speed
        particle.velocity.x *= scale
        particle.velocity.y *= scale
      }
    }

    let movementX = movement.x + particle.velocity.x * deltaTime
    let movementY = movement.y + particle.velocity.y * deltaTime
    const bounded = this.applyBounds(movementX, movementY, particle)
    movementX = bounded.x
    movementY = bounded.y

    particle.movement.x = movementX
    particle.movement.y = movementY

    if (this.sinX) {
      particle.x = movementX + Math.sin(PI * (movementY / sinXVal.x)) * sinXVal.y
    } else {
      particle.x = movementX
    }

    if (this.sinY) {
      particle.y = movementY + Math.sin(PI * (movementX / sinYVal.x)) * sinYVal.y
    } else {
      particle.y = movementY
    }
  }

  private applyBounds(x: number, y: number, particle: Particle) {
    if (this.boundsMode === 'none') {
      return { x, y }
    }
    const minX = Math.min(this.boundsMin.x, this.boundsMax.x)
    const maxX = Math.max(this.boundsMin.x, this.boundsMax.x)
    const minY = Math.min(this.boundsMin.y, this.boundsMax.y)
    const maxY = Math.max(this.boundsMin.y, this.boundsMax.y)

    let bx = x
    let by = y

    if (this.boundsMode === 'wrap') {
      if (bx < minX) bx = maxX
      else if (bx > maxX) bx = minX
      if (by < minY) by = maxY
      else if (by > maxY) by = minY
      return { x: bx, y: by }
    }

    if (this.boundsMode === 'clamp') {
      if (bx < minX) bx = minX
      else if (bx > maxX) bx = maxX
      if (by < minY) by = minY
      else if (by > maxY) by = maxY
      return { x: bx, y: by }
    }

    // bounce
    const damping = Math.max(0, this.bounceDamping)
    if (bx < minX) {
      bx = minX
      particle.velocity.x = Math.abs(particle.velocity.x) * damping
    } else if (bx > maxX) {
      bx = maxX
      particle.velocity.x = -Math.abs(particle.velocity.x) * damping
    }
    if (by < minY) {
      by = minY
      particle.velocity.y = Math.abs(particle.velocity.y) * damping
    } else if (by > maxY) {
      by = maxY
      particle.velocity.y = -Math.abs(particle.velocity.y) * damping
    }
    return { x: bx, y: by }
  }

  /**
   * Gets the name of the behaviour
   * @return {BehaviourNames} The name of the behaviour
   */
  getName() {
    return BehaviourNames.POSITION_BEHAVIOUR
  }

  /**
   * @description Retrieves the properties of the object.
   * @returns {Object} The properties of the object.
   */
  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      sinX: this.sinX,
      sinY: this.sinY,
      sinXVal: this.sinXVal,
      sinYVal: this.sinYVal,
      sinXValVariance: this.sinXValVariance,
      sinYValVariance: this.sinYValVariance,
      positionVariance: {
        x: this.positionVariance.x,
        y: this.positionVariance.y,
      },
      velocity: {
        x: this.velocity.x,
        y: this.velocity.y,
      },
      velocityVariance: {
        x: this.velocityVariance.x,
        y: this.velocityVariance.y,
      },
      acceleration: {
        x: this.acceleration.x,
        y: this.acceleration.y,
      },
      accelerationVariance: {
        x: this.accelerationVariance.x,
        y: this.accelerationVariance.y,
      },
      drag: this.drag,
      dragVariance: this.dragVariance,
      maxSpeed: this.maxSpeed,
      maxSpeedVariance: this.maxSpeedVariance,
      boundsMode: this.boundsMode,
      boundsMin: this.boundsMin,
      boundsMax: this.boundsMax,
      bounceDamping: this.bounceDamping,
      name: this.getName(),
    }
  }
}
