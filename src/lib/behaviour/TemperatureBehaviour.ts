import Behaviour from './Behaviour'
import Particle from '../Particle'
import { Color, Point } from '../util'
import behaviourNames from './BehaviourNames'

export type TemperatureZoneShapeType = 'circle' | 'square' | 'rectangle'

type StoredTemperatureColor = {
  r: number
  g: number
  b: number
  alpha: number
}

type TemperatureParticleState = Particle & {
  _temperatureInZone?: boolean
  _temperatureTransitioningOut?: boolean
  _temperatureBlend?: number
  _temperatureOutsideColor?: StoredTemperatureColor | null
  _temperatureLastZoneColor?: StoredTemperatureColor | null
}

export type TemperatureZone = {
  center: Point
  velocity: Point
  color: Color
  shapeType?: TemperatureZoneShapeType
  radius?: number
  halfSize?: number
  halfWidth?: number
  halfHeight?: number
}

/**
 * TemperatureBehaviour adjusts particle velocity and color
 * based on whether they are in a hot or cold zone.
 *
 * Gradual color mode is designed to run after ColorBehaviour (lower priority):
 * ColorBehaviour sets the natural particle color first, then this behaviour
 * blends zone tint on top and eases back to the live natural color on exit.
 */
export default class TemperatureBehaviour extends Behaviour {
  enabled = true
  priority = 50

  zones: TemperatureZone[] = []
  /** When true, particle color eases toward zone / outside colors instead of snapping. */
  gradualColorTransition = false
  /** Blend speed toward the target color (higher = faster). */
  colorTransitionSpeed = 6

  init(particle: Particle) {
    const p = particle as TemperatureParticleState
    p._temperatureInZone = false
    p._temperatureTransitioningOut = false
    p._temperatureBlend = 0
    p._temperatureOutsideColor = null
    p._temperatureLastZoneColor = null
  }

  apply(particle: Particle, deltaTime = 1 / 60) {
    if (!this.enabled || !this.zones || !this.zones.length) return

    const p = particle as TemperatureParticleState
    const activeZone = this.findActiveZone(particle)
    const naturalColor = this.copyColor(particle)
    const wasInZone = p._temperatureInZone === true

    if (!activeZone) {
      if (this.gradualColorTransition) {
        if (wasInZone) {
          p._temperatureTransitioningOut = true
        }
        this.applyGradualOutsideColor(particle, p, naturalColor, deltaTime)
      } else if (wasInZone && p._temperatureOutsideColor && this.matchesAnyZoneColor(particle)) {
        this.writeColor(particle, p._temperatureOutsideColor)
      } else if (!wasInZone) {
        p._temperatureOutsideColor = naturalColor
      }

      p._temperatureInZone = false
      if (!this.gradualColorTransition) {
        this.clearGradualColorState(particle, p)
      }
      return
    }

    if (this.gradualColorTransition) {
      p._temperatureTransitioningOut = false
      if (!wasInZone || !p._temperatureOutsideColor) {
        p._temperatureOutsideColor = naturalColor
      }
      if (!wasInZone && (p._temperatureBlend ?? 0) <= 0) {
        p._temperatureBlend = 0
      }
    } else if (!wasInZone) {
      p._temperatureOutsideColor = naturalColor
    }

    particle.velocity.x *= activeZone.velocity.x
    particle.velocity.y *= activeZone.velocity.y

    const zoneColor = this.zoneColor(activeZone)
    p._temperatureLastZoneColor = zoneColor

    if (this.gradualColorTransition) {
      const blend = this.stepBlendToward(p._temperatureBlend ?? 0, 1, deltaTime)
      p._temperatureBlend = blend
      const outside = p._temperatureOutsideColor ?? naturalColor
      this.writeColor(particle, this.mixColors(outside, zoneColor, blend))
    } else {
      this.writeColor(particle, zoneColor)
      p._temperatureBlend = 1
    }

    p._temperatureInZone = true
  }

  private applyGradualOutsideColor(
    particle: Particle,
    p: TemperatureParticleState,
    naturalColor: StoredTemperatureColor,
    deltaTime: number,
  ) {
    const transitioningOut = p._temperatureTransitioningOut === true
    const startBlend = transitioningOut ? (p._temperatureBlend ?? 1) : (p._temperatureBlend ?? 0)

    if (!transitioningOut && !this.matchesAnyZoneColorValue(naturalColor)) {
      p._temperatureOutsideColor = naturalColor
    }

    const blend = this.stepBlendToward(startBlend, 0, deltaTime)
    p._temperatureBlend = blend

    if (!transitioningOut && blend <= 0.001) {
      p._temperatureBlend = 0
      p._temperatureTransitioningOut = false
      p._temperatureLastZoneColor = null
      return
    }

    const outside = transitioningOut
      ? naturalColor
      : (p._temperatureOutsideColor ?? naturalColor)
    const zone = p._temperatureLastZoneColor ?? outside
    this.writeColor(particle, this.mixColors(outside, zone, blend))

    if (blend <= 0.001) {
      p._temperatureBlend = 0
      p._temperatureTransitioningOut = false
      p._temperatureLastZoneColor = null
    }
  }

  private clearGradualColorState(particle: Particle, p: TemperatureParticleState) {
    p._temperatureBlend = 0
    p._temperatureLastZoneColor = null
  }

  private findActiveZone(particle: Particle): TemperatureZone | null {
    for (const zone of this.zones) {
      if (this.isInZone(particle, zone)) {
        return zone
      }
    }
    return null
  }

  private zoneColor(zone: TemperatureZone): StoredTemperatureColor {
    return {
      r: zone.color.r,
      g: zone.color.g,
      b: zone.color.b,
      alpha: zone.color.alpha ?? 1,
    }
  }

  private copyColor(particle: Particle): StoredTemperatureColor {
    return {
      r: particle.color.r,
      g: particle.color.g,
      b: particle.color.b,
      alpha: particle.color.alpha,
    }
  }

  private writeColor(particle: Particle, color: StoredTemperatureColor) {
    particle.color.r = color.r
    particle.color.g = color.g
    particle.color.b = color.b
    particle.color.alpha = color.alpha
  }

  private mixColors(from: StoredTemperatureColor, to: StoredTemperatureColor, blend: number): StoredTemperatureColor {
    const t = Math.max(0, Math.min(1, blend))
    return {
      r: this.lerp(from.r, to.r, t),
      g: this.lerp(from.g, to.g, t),
      b: this.lerp(from.b, to.b, t),
      alpha: this.lerp(from.alpha, to.alpha, t),
    }
  }

  private stepBlendToward(current: number, target: number, deltaTime: number): number {
    const t = this.getBlendT(deltaTime)
    const next = current + (target - current) * t
    if (target > current) return Math.min(target, next)
    return Math.max(target, next)
  }

  private getBlendT(deltaTime: number): number {
    const speed = Math.max(0, this.colorTransitionSpeed)
    if (speed <= 0) return 0
    const dtSeconds = deltaTime >= 1 ? deltaTime / 60 : deltaTime
    return 1 - Math.exp(-speed * dtSeconds)
  }

  private lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t
  }

  private matchesAnyZoneColor(particle: Particle): boolean {
    return this.matchesAnyZoneColorValue(this.copyColor(particle))
  }

  private matchesAnyZoneColorValue(color: StoredTemperatureColor): boolean {
    for (const zone of this.zones) {
      const zoneColor = this.zoneColor(zone)
      if (color.r === zoneColor.r && color.g === zoneColor.g && color.b === zoneColor.b) {
        return true
      }
    }
    return false
  }

  isInZone(particle: Particle, zone: TemperatureZone): boolean {
    const dx = particle.movement.x - zone.center.x
    const dy = particle.movement.y - zone.center.y
    const shapeType = zone.shapeType ?? 'circle'

    if (shapeType === 'square') {
      const halfSize = zone.halfSize ?? 0
      return Math.abs(dx) < halfSize && Math.abs(dy) < halfSize
    }

    if (shapeType === 'rectangle') {
      const halfWidth = zone.halfWidth ?? 0
      const halfHeight = zone.halfHeight ?? 0
      return Math.abs(dx) < halfWidth && Math.abs(dy) < halfHeight
    }

    const radius = zone.radius ?? 0
    return Math.sqrt(dx * dx + dy * dy) < radius
  }

  getName(): string {
    return behaviourNames.TEMPERATURE_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      zones: this.zones,
      gradualColorTransition: this.gradualColorTransition,
      colorTransitionSpeed: this.colorTransitionSpeed,
    }
  }
}
