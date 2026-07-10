import Behaviour from './Behaviour'
import Particle from '../Particle'
import type Model from '../Model'
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
  _temperatureActiveZoneIndex?: number
  _toroidalJustWrapped?: boolean
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
 * Runs after ColorBehaviour and ToroidalWrapBehaviour (lower priority):
 * base color and final position are known before zone tinting is applied.
 */
export default class TemperatureBehaviour extends Behaviour {
  enabled = true
  /** Below ToroidalWrapBehaviour (45) so zone checks use post-wrap positions. */
  priority = 40

  zones: TemperatureZone[] = []
  /** When true, particle color eases toward zone / outside colors instead of snapping. */
  gradualColorTransition = false
  /** Blend speed toward the target color (higher = faster). */
  colorTransitionSpeed = 6

  private _reconciledVisibilityResumeGeneration = -1

  init(particle: Particle) {
    const p = particle as TemperatureParticleState
    p._temperatureInZone = false
    p._temperatureTransitioningOut = false
    p._temperatureBlend = 0
    p._temperatureOutsideColor = null
    p._temperatureLastZoneColor = null
    p._temperatureActiveZoneIndex = -1
    p._toroidalJustWrapped = false
    particle.skipColorBehaviour = false
  }

  apply(particle: Particle, deltaTime = 1 / 60, model?: Model) {
    if (!this.enabled || !this.zones || !this.zones.length) return

    const p = particle as TemperatureParticleState
    const justWrapped = p._toroidalJustWrapped === true
    if (justWrapped) {
      p._toroidalJustWrapped = false
    }

    const activeZoneIndex = this.findActiveZoneIndex(particle)
    const activeZone = activeZoneIndex >= 0 ? this.zones[activeZoneIndex] : null
    const naturalColor = this.copyColor(particle)
    const wasInZone = p._temperatureInZone === true
    const previousZoneIndex = p._temperatureActiveZoneIndex ?? -1
    const zoneChanged =
      wasInZone &&
      activeZone !== null &&
      previousZoneIndex >= 0 &&
      activeZoneIndex !== previousZoneIndex
    const visibilityResume =
      (model?.visibilityResumeGeneration ?? 0) > this._reconciledVisibilityResumeGeneration
    let residualTint =
      !activeZone && this.hasResidualZoneTint(particle, p, wasInZone, justWrapped)
    if (
      !activeZone &&
      visibilityResume &&
      (wasInZone || this.matchesAnyZoneColorValue(naturalColor, 12))
    ) {
      residualTint = true
    }

    if (!activeZone) {
      if (this.gradualColorTransition) {
        if (residualTint) {
          p._temperatureTransitioningOut = true
        }
        this.applyGradualOutsideColor(particle, p, naturalColor, deltaTime)
      } else if (residualTint) {
        const restoreColor = this.getRestoreOutsideColor(p, naturalColor)
        if (
          restoreColor &&
          (justWrapped && wasInZone || this.shouldInstantRestore(particle, naturalColor))
        ) {
          this.writeColor(particle, restoreColor)
        }
      } else if (!wasInZone && !residualTint && !this.matchesAnyZoneColorValue(naturalColor)) {
        p._temperatureOutsideColor = naturalColor
      }

      p._temperatureInZone = false
      p._temperatureActiveZoneIndex = -1
      this.syncColorSkip(particle, p, false)
      if (!this.gradualColorTransition) {
        this.clearGradualColorState(particle, p)
      }
      return
    }

    if (this.gradualColorTransition) {
      p._temperatureTransitioningOut = false
      if (!wasInZone) {
        p._temperatureOutsideColor = naturalColor
        if ((p._temperatureBlend ?? 0) <= 0) {
          p._temperatureBlend = 0
        }
      } else if (zoneChanged) {
        // Ease from the current zone tint into the new zone instead of snapping.
        p._temperatureOutsideColor = naturalColor
        p._temperatureBlend = 0
      } else if (!p._temperatureOutsideColor) {
        p._temperatureOutsideColor = naturalColor
      }
    } else if (!wasInZone) {
      p._temperatureOutsideColor = naturalColor
    } else if (justWrapped && !this.matchesAnyZoneColorValue(naturalColor, 12)) {
      // Wrapped into a zone from a non-tinted color — refresh outside reference.
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
    }

    p._temperatureInZone = true
    p._temperatureActiveZoneIndex = activeZoneIndex
    this.syncColorSkip(particle, p, true)
  }

  onParticlesUpdated(model?: Model) {
    const resumeGeneration = model?.visibilityResumeGeneration ?? 0
    if (resumeGeneration > this._reconciledVisibilityResumeGeneration) {
      this._reconciledVisibilityResumeGeneration = resumeGeneration
    }
  }

  private applyGradualOutsideColor(
    particle: Particle,
    p: TemperatureParticleState,
    naturalColor: StoredTemperatureColor,
    deltaTime: number,
  ) {
    const transitioningOut = p._temperatureTransitioningOut === true
    const startBlend = transitioningOut ? (p._temperatureBlend ?? 1) : (p._temperatureBlend ?? 0)

    if (
      !transitioningOut &&
      !this.matchesAnyZoneColorValue(naturalColor) &&
      !this.hasResidualZoneTint(particle, p, false, false)
    ) {
      p._temperatureOutsideColor = naturalColor
    }

    const blend = this.stepBlendToward(startBlend, 0, deltaTime)
    p._temperatureBlend = blend

    if (!transitioningOut && blend <= 0.001) {
      p._temperatureBlend = 0
      p._temperatureTransitioningOut = false
      p._temperatureLastZoneColor = null
      this.syncColorSkip(particle, p, false)
      return
    }

    const outside = this.getOutsideTarget(p, naturalColor)
    const zone = p._temperatureLastZoneColor ?? outside
    this.writeColor(particle, this.mixColors(outside, zone, blend))

    if (blend <= 0.001) {
      p._temperatureBlend = 0
      p._temperatureTransitioningOut = false
      p._temperatureLastZoneColor = null
      this.syncColorSkip(particle, p, false)
      return
    }

    this.syncColorSkip(particle, p, false)
  }

  private getOutsideTarget(
    p: TemperatureParticleState,
    naturalColor: StoredTemperatureColor,
  ): StoredTemperatureColor {
    if (p._temperatureTransitioningOut === true) {
      return this.getRestoreOutsideColor(p, naturalColor) ?? naturalColor
    }
    return p._temperatureOutsideColor ?? naturalColor
  }

  private getRestoreOutsideColor(
    p: TemperatureParticleState,
    naturalColor: StoredTemperatureColor,
  ): StoredTemperatureColor | null {
    const outside = p._temperatureOutsideColor
    if (!outside) return null
    if (!this.matchesAnyZoneColorValue(outside, 12)) return outside
    // Outside reference was corrupted (e.g. saved while zone-tinted after a wrap).
    if (!this.matchesAnyZoneColorValue(naturalColor, 12)) return naturalColor
    return null
  }

  /**
   * True when the particle is outside all zones but still carries zone tint
   * (state desync, toroidal wrap, or mid-blend).
   */
  private shouldInstantRestore(
    particle: Particle,
    naturalColor: StoredTemperatureColor,
  ): boolean {
    if (this.matchesAnyZoneColorValue(naturalColor, 12)) return true

    const p = particle as TemperatureParticleState
    const outside = p._temperatureOutsideColor
    const zone = p._temperatureLastZoneColor
    if (!outside || !zone) return false
    if (this.colorsNear(naturalColor, outside)) return false
    if (this.colorsNear(naturalColor, zone, 12)) return true

    const distToZone = this.colorDistSq(naturalColor, zone)
    const distToOutside = this.colorDistSq(naturalColor, outside)
    return distToZone < distToOutside * 0.35 && distToZone <= 3600
  }

  private hasResidualZoneTint(
    particle: Particle,
    p: TemperatureParticleState,
    wasInZone: boolean,
    justWrapped: boolean,
  ): boolean {
    if (justWrapped) {
      if (wasInZone || (p._temperatureBlend ?? 0) > 0.001) return true
      return this.matchesAnyZoneColorValue(this.copyColor(particle), 12)
    }
    if (p._temperatureTransitioningOut === true) return true
    if (this.gradualColorTransition && (p._temperatureBlend ?? 0) > 0.001) return true
    if (this.matchesAnyZoneColorValue(this.copyColor(particle), 12)) return true

    const outside = p._temperatureOutsideColor
    const zone = p._temperatureLastZoneColor
    if (!outside || !zone) {
      return wasInZone && this.matchesAnyZoneColorValue(this.copyColor(particle), 12)
    }

    const current = this.copyColor(particle)
    if (this.colorsNear(current, outside)) return false
    if (this.colorsNear(current, zone, 12)) return true

    const distToZone = this.colorDistSq(current, zone)
    const distToOutside = this.colorDistSq(current, outside)
    return distToZone < distToOutside * 0.35 && distToZone <= 3600
  }

  private syncColorSkip(
    particle: Particle,
    p: TemperatureParticleState,
    inZone: boolean,
  ) {
    if (!this.gradualColorTransition) {
      particle.skipColorBehaviour = inZone
      return
    }

    const blend = p._temperatureBlend ?? 0
    particle.skipColorBehaviour =
      inZone || p._temperatureTransitioningOut === true || blend > 0.001
  }

  private clearGradualColorState(particle: Particle, p: TemperatureParticleState) {
    p._temperatureBlend = 0
    if (!this.hasResidualZoneTint(particle, p, false, false)) {
      p._temperatureLastZoneColor = null
    }
  }

  private findActiveZoneIndex(particle: Particle): number {
    for (let i = 0; i < this.zones.length; i++) {
      if (this.isInZone(particle, this.zones[i])) {
        return i
      }
    }
    return -1
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

  private colorsNear(a: StoredTemperatureColor, b: StoredTemperatureColor, tolerance = 2): boolean {
    return (
      Math.abs(a.r - b.r) <= tolerance &&
      Math.abs(a.g - b.g) <= tolerance &&
      Math.abs(a.b - b.b) <= tolerance &&
      Math.abs(a.alpha - b.alpha) <= 0.02
    )
  }

  private colorDistSq(a: StoredTemperatureColor, b: StoredTemperatureColor): number {
    const dr = a.r - b.r
    const dg = a.g - b.g
    const db = a.b - b.b
    const da = (a.alpha - b.alpha) * 255
    return dr * dr + dg * dg + db * db + da * da
  }

  private matchesAnyZoneColor(particle: Particle, tolerance = 2): boolean {
    return this.matchesAnyZoneColorValue(this.copyColor(particle), tolerance)
  }

  private matchesAnyZoneColorValue(color: StoredTemperatureColor, tolerance = 2): boolean {
    for (const zone of this.zones) {
      const zoneColor = this.zoneColor(zone)
      if (this.colorsNear(color, zoneColor, tolerance)) {
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
