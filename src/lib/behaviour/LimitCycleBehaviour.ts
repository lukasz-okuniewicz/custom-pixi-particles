import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'
import type Model from '../Model'
import type TurbulencePool from '../util/turbulencePool'

/**
 * LimitCycleBehaviour — Each particle follows an internal Hopf-type limit cycle.
 *
 * State (θ, r): dθ/dt = ω, dr/dt = μ*(R0 - r) so r tends to R0. Velocity gets a
 * tangential component (r*cos θ, r*sin θ), producing a stable circular motion per particle.
 * Many particles together create swirling, breathing patterns without any single vortex center.
 *
 * Mathematical logic (portable to C#/C++/Compute):
 * - θ_{n+1} = θ_n + ω*dt (wrap to [0, 2π]).
 * - r_{n+1} = r_n + μ*(R0 - r_n)*dt (clamp r to [0, R_max]).
 * - velocity += strength * (r*cos θ, r*sin θ) * dt.
 *
 * Visual interaction:
 * - colorByPhase: use particle.limitCyclePhase in [0,1] for hue (position on cycle).
 * - scaleByRadius: use particle.limitCycleRadius (r/R0) for size (breathing).
 *
 * Performance: O(1) per particle; ideal for Compute Shader (no neighbor reads).
 */
export default class LimitCycleBehaviour extends Behaviour {
  enabled = true
  priority = 220

  /** Angular frequency (rad/s). */
  angularFrequency = 4
  /** Target radius of the limit cycle. */
  targetRadius = 30
  /** Relaxation rate of r toward targetRadius. */
  relaxationRate = 2
  /** Strength of tangential velocity added. */
  strength = 100
  /** Spread initial phase by uid so not all aligned. */
  phaseSpread = true
  /** Initial r as fraction of targetRadius (0–1). */
  initialRadiusFraction = 0.3
  /** Write phase [0,1] for color. */
  writePhaseForColor = true
  /** Write normalized radius for scale/color. */
  writeRadiusForVisual = true
  /** Scale particle size by r/R0 (breathing). */
  scaleByRadius = false
  radiusScaleMin = 0.8
  radiusScaleMax = 1.2

  init(particle: Particle, _model: Model, _turbulencePool: TurbulencePool) {
    const p = particle as any
    p.limitCycleTheta = this.phaseSpread
      ? (particle.uid * 0.618033988749895) % (2 * Math.PI)
      : 0
    p.limitCycleR = this.targetRadius * this.initialRadiusFraction
  }

  apply(particle: Particle, deltaTime: number, _model: Model) {
    if (!this.enabled || particle.skipPositionBehaviour) return

    const p = particle as any
    let theta = p.limitCycleTheta != null ? p.limitCycleTheta : 0
    let r = p.limitCycleR != null ? p.limitCycleR : this.targetRadius * this.initialRadiusFraction

    theta += this.angularFrequency * deltaTime
    theta = ((theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)

    const dr = this.relaxationRate * (this.targetRadius - r) * deltaTime
    r = Math.max(0, r + dr)

    p.limitCycleTheta = theta
    p.limitCycleR = r

    const vx = this.strength * r * Math.cos(theta) * deltaTime
    const vy = this.strength * r * Math.sin(theta) * deltaTime
    particle.velocity.x += vx
    particle.velocity.y += vy

    if (this.writePhaseForColor) {
      p.limitCyclePhase = theta / (2 * Math.PI)
    }

    if (this.writeRadiusForVisual) {
      p.limitCycleRadius = Math.min(1, r / Math.max(1e-6, this.targetRadius))
    }

    if (this.scaleByRadius) {
      const t = p.limitCycleRadius != null ? p.limitCycleRadius : 1
      const scale = this.radiusScaleMin + (this.radiusScaleMax - this.radiusScaleMin) * t
      const baseW = particle.sizeStart.x + (particle.sizeEnd.x - particle.sizeStart.x) * particle.lifeProgress
      const baseH = particle.sizeStart.y + (particle.sizeEnd.y - particle.sizeStart.y) * particle.lifeProgress
      particle.size.x = baseW * scale
      particle.size.y = baseH * scale
    }
  }

  getName(): string {
    return BehaviourNames.LIMIT_CYCLE_BEHAVIOUR
  }

  getProps(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      priority: this.priority,
      angularFrequency: this.angularFrequency,
      targetRadius: this.targetRadius,
      relaxationRate: this.relaxationRate,
      strength: this.strength,
      phaseSpread: this.phaseSpread,
      initialRadiusFraction: this.initialRadiusFraction,
      writePhaseForColor: this.writePhaseForColor,
      writeRadiusForVisual: this.writeRadiusForVisual,
      scaleByRadius: this.scaleByRadius,
      radiusScaleMin: this.radiusScaleMin,
      radiusScaleMax: this.radiusScaleMax,
      name: this.getName(),
    }
  }
}
