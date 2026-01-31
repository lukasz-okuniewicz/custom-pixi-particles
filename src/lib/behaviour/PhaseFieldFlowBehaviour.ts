import { Point } from '../util'
import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'
import type Model from '../Model'
import type TurbulencePool from '../util/turbulencePool'

/**
 * PhaseFieldFlowBehaviour — Particles advected by a time-varying 2D phase field (flow along contours).
 *
 * Uses a scalar phase φ(x, y, t); velocity = curl of (0, 0, φ) in 2D → v = (∂φ/∂y, -∂φ/∂x).
 * With φ = A*sin(kx*x + ωx*t) * sin(ky*y + ωy*t) you get smooth, deterministic flow cells that evolve.
 *
 * Mathematical logic (portable to C#/C++/Compute):
 * - phase(x,y,t) = sum of waves: A_i * sin(kx_i*x + ky_i*y + ω_i*t + θ_i)
 * - vx = ∂φ/∂y, vy = -∂φ/∂x (analytic derivatives; no sampling).
 *
 * Visual interaction:
 * - colorBySpeed: tint by velocity magnitude (e.g. fast = bright); particle.phaseFlowSpeed in [0,1].
 * - scaleByPhase: scale by local phase for pulsing; particle.phaseFlowPhase in [0,1].
 */
export default class PhaseFieldFlowBehaviour extends Behaviour {
  enabled = true
  priority = 210

  strength = 80
  scaleX = 0.02
  scaleY = 0.02
  timeScale = 1
  /** Optional second wave for more complex flow. */
  strength2 = 40
  scaleX2 = 0.015
  scaleY2 = 0.025
  timeScale2 = 1.3

  writeSpeedForColor = true
  writePhaseForVisual = true

  private _time = 0

  update = (deltaTime: number) => {
    this._time += deltaTime * this.timeScale
  }

  init(_particle: Particle, _model: Model, _turbulencePool: TurbulencePool) {}

  apply(particle: Particle, deltaTime: number, _model: Model) {
    if (!this.enabled || particle.skipPositionBehaviour) return

    const x = particle.movement.x
    const y = particle.movement.y
    const t = this._time

    const kx = this.scaleX
    const ky = this.scaleY
    const ax = kx * x + t
    const ay = ky * y + t * 0.7
    const s1x = Math.sin(ax)
    const c1x = Math.cos(ax)
    const s1y = Math.sin(ay)
    const c1y = Math.cos(ay)

    const phase1 = s1x * s1y
    const dphase1_dx = c1x * s1y * kx
    const dphase1_dy = s1x * c1y * ky

    let vx = this.strength * dphase1_dy
    let vy = -this.strength * dphase1_dx

    if (this.strength2 !== 0) {
      const t2 = t * this.timeScale2
      const kx2 = this.scaleX2
      const ky2 = this.scaleY2
      const ax2 = kx2 * x + t2
      const ay2 = ky2 * y + t2 * 0.5
      const dphase2_dx = Math.cos(ax2) * Math.sin(ay2) * kx2
      const dphase2_dy = Math.sin(ax2) * Math.cos(ay2) * ky2
      vx += this.strength2 * dphase2_dy
      vy -= this.strength2 * dphase2_dx
    }

    particle.velocity.x += vx * deltaTime
    particle.velocity.y += vy * deltaTime

    const speed = Math.sqrt(vx * vx + vy * vy)
    if (this.writeSpeedForColor) {
      const maxSpeed = Math.abs(this.strength) * (Math.abs(ky) + Math.abs(kx)) + Math.abs(this.strength2) * 0.5
      ;(particle as any).phaseFlowSpeed = Math.min(1, speed / Math.max(1e-6, maxSpeed))
    }
    if (this.writePhaseForVisual) {
      const phaseNorm = (phase1 * 0.5 + 0.5)
      ;(particle as any).phaseFlowPhase = Math.max(0, Math.min(1, phaseNorm))
    }
  }

  getName(): string {
    return BehaviourNames.PHASE_FIELD_FLOW_BEHAVIOUR
  }

  getProps(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      priority: this.priority,
      strength: this.strength,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      timeScale: this.timeScale,
      strength2: this.strength2,
      scaleX2: this.scaleX2,
      scaleY2: this.scaleY2,
      timeScale2: this.timeScale2,
      writeSpeedForColor: this.writeSpeedForColor,
      writePhaseForVisual: this.writePhaseForVisual,
      name: this.getName(),
    }
  }
}
