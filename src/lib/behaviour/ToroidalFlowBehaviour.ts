import { Point } from '../util'
import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'
import type Model from '../Model'
import type TurbulencePool from '../util/turbulencePool'

/**
 * ToroidalFlowBehaviour — Particles spiral on the surface of an invisible torus (doughnut).
 *
 * Two rotations: major (around center) and minor (around the tube). Simulates a "magnetic bottle."
 *
 * Mathematical logic (2D projection): parametric torus
 *   theta = major angle, phi = minor angle
 *   x = (majorR + minorR*cos(phi))*cos(theta), y = (majorR + minorR*cos(phi))*sin(theta)
 *   Velocity = d/dt from theta += majorSpeed*dt, phi += minorSpeed*dt.
 *
 * Visual: opacity/distance by distance to torus surface (particles "flicker" off when they drift).
 */
export default class ToroidalFlowBehaviour extends Behaviour {
  enabled = true
  priority = 80

  /** Center of the torus in 2D. */
  center = new Point(0, 0)
  /** Major radius (distance from center to tube center). */
  majorRadius = 120
  /** Minor radius (tube radius). */
  minorRadius = 40
  /** Major angular speed (around center). */
  majorSpeed = 1
  /** Minor angular speed (around tube). */
  minorSpeed = 2.5
  /** Overall scale of velocity. */
  strength = 1

  /** Write distance to torus surface [0,1] for opacity (0 = on surface, 1 = far). */
  writeSurfaceDistForVisual = true
  /** Distance beyond which particle is "off surface" (for smoothstep). */
  surfaceDistFalloff = 30

  init(particle: Particle, _model: Model, _turbulencePool: TurbulencePool) {
    const p = particle as any
    p.toroidalTheta = (particle.uid * 0.618) % (2 * Math.PI)
    p.toroidalPhi = (particle.uid * 0.31) % (2 * Math.PI)
  }

  apply(particle: Particle, deltaTime: number, _model: Model) {
    if (!this.enabled || particle.skipPositionBehaviour) return

    const p = particle as any
    let theta = p.toroidalTheta != null ? p.toroidalTheta : 0
    let phi = p.toroidalPhi != null ? p.toroidalPhi : 0

    theta += this.majorSpeed * deltaTime
    phi += this.minorSpeed * deltaTime
    theta = ((theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
    phi = ((phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)

    p.toroidalTheta = theta
    p.toroidalPhi = phi

    const R = this.majorRadius
    const r = this.minorRadius
    const cx = this.center.x
    const cy = this.center.y

    const x = cx + (R + r * Math.cos(phi)) * Math.cos(theta)
    const y = cy + (R + r * Math.cos(phi)) * Math.sin(theta)

    particle.movement.x = x
    particle.movement.y = y
    particle.x = x
    particle.y = y

    const dx = (R + r * Math.cos(phi)) * (-Math.sin(theta)) * this.majorSpeed +
      r * (-Math.sin(phi)) * Math.cos(theta) * this.minorSpeed
    const dy = (R + r * Math.cos(phi)) * Math.cos(theta) * this.majorSpeed +
      r * (-Math.sin(phi)) * Math.sin(theta) * this.minorSpeed

    particle.velocity.x = 0
    particle.velocity.y = 0
    ;(particle as any).toroidalVelX = dx * this.strength
    ;(particle as any).toroidalVelY = dy * this.strength

    const distFromCenter = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
    const distToTubeCenter = Math.abs(distFromCenter - R)
    const surfaceDist = Math.abs(distToTubeCenter - r)

    if (this.writeSurfaceDistForVisual) {
      const t = Math.min(1, surfaceDist / Math.max(1, this.surfaceDistFalloff))
      ;(particle as any).toroidalSurfaceDist = t
    }
  }

  getName(): string {
    return BehaviourNames.TOROIDAL_FLOW_BEHAVIOUR
  }

  getProps(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      priority: this.priority,
      center: { x: this.center.x, y: this.center.y },
      majorRadius: this.majorRadius,
      minorRadius: this.minorRadius,
      majorSpeed: this.majorSpeed,
      minorSpeed: this.minorSpeed,
      strength: this.strength,
      writeSurfaceDistForVisual: this.writeSurfaceDistForVisual,
      surfaceDistFalloff: this.surfaceDistFalloff,
      name: this.getName(),
    }
  }
}
