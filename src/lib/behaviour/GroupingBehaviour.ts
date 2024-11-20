import { Point } from '../util'
import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'

export default class GroupingBehaviour extends Behaviour {
  enabled = true
  priority = 0

  groupCenter = new Point(0, 0) // Shared center for the group
  groupRadius = 100 // Radius of the group
  attractionStrength = 0.1 // Strength of attraction toward the group center
  repulsionStrength = 0 // Strength of repulsion between particles
  orbitSpeed = 0 // Speed of orbiting (0 for no orbit)
  randomness = 0.2 // Adds randomness to particle movement
  boundaryEnforcement = false // Enforce group boundary limits
  dynamicRadiusSpeed = 0 // Speed for dynamic radius scaling
  maxRadius = 150 // Maximum radius for dynamic scaling
  minRadius = 50 // Minimum radius for dynamic scaling
  clusterPoints: Point[] = [] // Additional cluster points

  private particleAngles: Map<number, number> = new Map() // Store unique angles for each particle

  init(particle: Particle) {
    // Assign each particle an initial random angle within the group
    const initialAngle = Math.random() * Math.PI * 2
    this.particleAngles.set(particle.uid, initialAngle)
  }

  apply(particle: Particle, deltaTime: number) {
    if (!this.enabled) return

    const angle = this.particleAngles.get(particle.uid) || 0

    // Calculate vector toward the group center or nearest cluster point
    const targetPoint = this.getNearestClusterPoint(particle.movement)
    const dx = targetPoint.x - particle.movement.x
    const dy = targetPoint.y - particle.movement.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Apply attraction toward the target point
    particle.movement.x += dx * this.attractionStrength * deltaTime
    particle.movement.y += dy * this.attractionStrength * deltaTime

    // Apply orbiting behavior if enabled
    if (this.orbitSpeed !== 0) {
      const currentAngle = angle + this.orbitSpeed * deltaTime
      this.particleAngles.set(particle.uid, currentAngle)

      particle.movement.x = targetPoint.x + Math.cos(currentAngle) * Math.min(distance, this.groupRadius)
      particle.movement.y = targetPoint.y + Math.sin(currentAngle) * Math.min(distance, this.groupRadius)
    }

    // Apply repulsion from other particles
    this.applyRepulsion(particle)

    // Add randomness for natural movement
    particle.movement.x += (Math.random() - 0.5) * this.randomness
    particle.movement.y += (Math.random() - 0.5) * this.randomness

    // Enforce group boundary limits if enabled
    if (this.boundaryEnforcement) {
      this.enforceBoundary(particle)
    }

    // Dynamically adjust the group radius
    this.adjustDynamicRadius(deltaTime)
  }

  /**
   * Adjusts the group radius dynamically over time
   */
  adjustDynamicRadius(deltaTime: number) {
    if (this.dynamicRadiusSpeed !== 0) {
      this.groupRadius += this.dynamicRadiusSpeed * deltaTime

      if (this.groupRadius > this.maxRadius || this.groupRadius < this.minRadius) {
        this.dynamicRadiusSpeed *= -1 // Reverse direction
      }

      this.groupRadius = Math.max(this.minRadius, Math.min(this.groupRadius, this.maxRadius))
    }
  }

  /**
   * Applies repulsion forces to keep particles apart
   */
  applyRepulsion(particle: Particle) {
    if (this.repulsionStrength === 0) return

    this.clusterPoints.forEach((point) => {
      const dx = point.x - particle.movement.x
      const dy = point.y - particle.movement.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance > 0 && distance < this.groupRadius) {
        const force = (this.repulsionStrength / distance) ** 2
        particle.movement.x -= dx * force
        particle.movement.y -= dy * force
      }
    })
  }

  /**
   * Enforces boundary limits to keep particles within the group radius
   */
  enforceBoundary(particle: Particle) {
    const dx = particle.movement.x - this.groupCenter.x
    const dy = particle.movement.y - this.groupCenter.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance > this.groupRadius) {
      const angle = Math.atan2(dy, dx)
      particle.movement.x = this.groupCenter.x + Math.cos(angle) * this.groupRadius
      particle.movement.y = this.groupCenter.y + Math.sin(angle) * this.groupRadius
    }
  }

  /**
   * Finds the nearest cluster point to a given position
   */
  getNearestClusterPoint(position: Point): Point {
    if (this.clusterPoints.length === 0) {
      return this.groupCenter
    }

    let nearest = this.groupCenter
    let minDistance = Infinity

    for (const point of this.clusterPoints) {
      const dx = point.x - position.x
      const dy = point.y - position.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < minDistance) {
        minDistance = distance
        nearest = point
      }
    }

    return nearest
  }

  getName() {
    return BehaviourNames.GROUPING_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      groupCenter: { x: this.groupCenter.x, y: this.groupCenter.y },
      groupRadius: this.groupRadius,
      attractionStrength: this.attractionStrength,
      repulsionStrength: this.repulsionStrength,
      orbitSpeed: this.orbitSpeed,
      randomness: this.randomness,
      boundaryEnforcement: this.boundaryEnforcement,
      dynamicRadiusSpeed: this.dynamicRadiusSpeed,
      maxRadius: this.maxRadius,
      minRadius: this.minRadius,
      clusterPoints: this.clusterPoints,
      name: this.getName(),
    }
  }
}
