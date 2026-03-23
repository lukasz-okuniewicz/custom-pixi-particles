import { createNoise2D } from 'simplex-noise'
import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'
import type Model from '../Model'
import type TurbulencePool from '../util/turbulencePool'

type Pt = { x: number; y: number }

/**
 * Drift along a cubic Bezier tube with lateral noise; arc-length parameter stored per particle.
 */
export default class BezierFlowTubeBehaviour extends Behaviour {
  enabled = true
  /** After PositionBehaviour integration so curve position wins (same idea as Jacobian curl). */
  priority = -58

  /** Four control points P0..P3 */
  p0: Pt = { x: -200, y: 0 }
  p1: Pt = { x: -80, y: 120 }
  p2: Pt = { x: 80, y: -80 }
  p3: Pt = { x: 200, y: 0 }

  speed = 80
  noiseAmp = 25
  loop = false
  alignRotation = false

  private _noise2D: (x: number, y: number) => number

  constructor() {
    super()
    this._noise2D = createNoise2D()
  }

  init(particle: Particle, _model: Model, _turbulencePool: TurbulencePool) {
    const p = particle as any
    p.bezierT = (particle.uid * 0.137) % 1
  }

  private bezier(t: number): { x: number; y: number; tx: number; ty: number } {
    const u = 1 - t
    const u2 = u * u
    const u3 = u2 * u
    const t2 = t * t
    const t3 = t2 * t
    const x =
      u3 * this.p0.x + 3 * u2 * t * this.p1.x + 3 * u * t2 * this.p2.x + t3 * this.p3.x
    const y =
      u3 * this.p0.y + 3 * u2 * t * this.p1.y + 3 * u * t2 * this.p2.y + t3 * this.p3.y
    const tx =
      3 * u2 * (this.p1.x - this.p0.x) +
      6 * u * t * (this.p2.x - this.p1.x) +
      3 * t2 * (this.p3.x - this.p2.x)
    const ty =
      3 * u2 * (this.p1.y - this.p0.y) +
      6 * u * t * (this.p2.y - this.p1.y) +
      3 * t2 * (this.p3.y - this.p2.y)
    return { x, y, tx, ty }
  }

  apply(particle: Particle, deltaTime: number, _model: Model) {
    if (!this.enabled || particle.skipPositionBehaviour) return

    const p = particle as any
    let t = p.bezierT != null ? p.bezierT : 0
    const lenApprox = Math.hypot(this.p3.x - this.p0.x, this.p3.y - this.p0.y) + 1
    const dt = (this.speed * deltaTime) / lenApprox
    t += dt
    if (t > 1) {
      t = this.loop ? t % 1 : 1
    }
    p.bezierT = t

    const { x, y, tx, ty } = this.bezier(t)
    const tlen = Math.hypot(tx, ty) || 1e-6
    const nx = -ty / tlen
    const ny = tx / tlen
    const n = this._noise2D(particle.uid * 0.1, t * 4)
    const ox = nx * n * this.noiseAmp
    const oy = ny * n * this.noiseAmp

    particle.movement.x = x + ox
    particle.movement.y = y + oy
    particle.x = particle.movement.x
    particle.y = particle.movement.y

    if (this.alignRotation) {
      particle.rotation = Math.atan2(ty, tx)
    }
  }

  getName() {
    return BehaviourNames.BEZIER_FLOW_TUBE_BEHAVIOUR
  }

  getProps(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      priority: this.priority,
      p0: { ...this.p0 },
      p1: { ...this.p1 },
      p2: { ...this.p2 },
      p3: { ...this.p3 },
      speed: this.speed,
      noiseAmp: this.noiseAmp,
      loop: this.loop,
      alignRotation: this.alignRotation,
      name: this.getName(),
    }
  }
}
