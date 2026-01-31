import { Point } from '../util'
import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'

/**
 * VortexBehaviour applies spiral motion around a center point with optional radial flow.
 */
export default class VortexBehaviour extends Behaviour {
  enabled = true
  /** Must run before PositionBehaviour (100) so vortex offset is included in final x,y */
  priority = 110

  center = new Point(0, 0)
  /** Tangential speed ≈ strength/dist (units per second). Use 500–3000 for visible spiral. */
  strength = 1200
  /** 'in' | 'out' | 'none' */
  spiralDirection: 'in' | 'out' | 'none' = 'in'
  spiralStrength = 150
  falloffPower = 1
  minDistance = 1

  init = () => {
    //
  }

  apply = (particle: Particle, deltaTime: number) => {
    if (!this.enabled || particle.skipPositionBehaviour) return

    const dx = particle.movement.x - this.center.x
    const dy = particle.movement.y - this.center.y
    const distSq = dx * dx + dy * dy
    const dist = Math.sqrt(distSq) || this.minDistance

    // Tangential speed = strength / dist (falloff), so displacement = (strength * factor * deltaTime) in tangential direction
    const factor = Math.pow(dist, -this.falloffPower)
    const tangential = this.strength * factor * deltaTime

    const perpX = -dy / dist
    const perpY = dx / dist

    particle.movement.x += perpX * tangential
    particle.movement.y += perpY * tangential

    if (this.spiralDirection !== 'none') {
      const radial = this.spiralStrength * factor * deltaTime
      const dir = this.spiralDirection === 'in' ? -1 : 1
      particle.movement.x += (dx / dist) * radial * dir
      particle.movement.y += (dy / dist) * radial * dir
    }
  }

  getName() {
    return BehaviourNames.VORTEX_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      center: { x: this.center.x, y: this.center.y },
      strength: this.strength,
      spiralDirection: this.spiralDirection,
      spiralStrength: this.spiralStrength,
      falloffPower: this.falloffPower,
      minDistance: this.minDistance,
      name: this.getName(),
    }
  }
}
