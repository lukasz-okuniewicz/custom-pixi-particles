import { Point } from '../util'
import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'
import type Model from '../Model'
import type TurbulencePool from '../util/turbulencePool'

/**
 * ProximityTriggeredPhaseBehaviour — Bistable swarming: Dormant (orbit) vs Kinetic (scatter).
 *
 * State weight = 1 - smoothstep(0, triggerDist, dist) so 0 = dormant, 1 = kinetic.
 * Dormant: gentle orbit. Kinetic: escape from trigger + jitter.
 *
 * Visual: lerp color from cool blue (dormant) to white/orange (kinetic) via stateWeight.
 */
export default class ProximityTriggeredPhaseBehaviour extends Behaviour {
  enabled = true
  priority = 218

  /** Trigger position (e.g. player). */
  triggerPos = new Point(0, 0)
  /** Radius within which state goes to Kinetic. */
  triggerRadius = 150
  /** Orbit strength (dormant). */
  orbitStrength = 0.5
  /** Orbit phase speed. */
  orbitPhaseSpeed = 1
  /** Escape/repulsion strength (kinetic). */
  escapeStrength = 15
  /** Jitter amount (kinetic). */
  jitterStrength = 5
  /** Smoothstep edge for state (0 = sharp, 1 = full radius). */
  stateSmoothEdge = 1

  /** Write state weight [0,1] for color (0 = dormant, 1 = kinetic). */
  writeStateForColor = true

  private particlePhase: Map<number, number> = new Map()

  init(particle: Particle, _model: Model, _turbulencePool: TurbulencePool) {
    this.particlePhase.set(particle.uid, (particle.uid * 0.618) % (2 * Math.PI))
  }

  onParticleRemoved = (particle: Particle) => {
    this.particlePhase.delete(particle.uid)
  }

  static smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0 || 1e-6)))
    return t * t * (3 - 2 * t)
  }

  static frac(x: number): number {
    return x - Math.floor(x)
  }

  apply(particle: Particle, deltaTime: number, _model: Model) {
    if (!this.enabled || particle.skipPositionBehaviour) return

    const px = particle.movement.x
    const py = particle.movement.y
    const tx = this.triggerPos.x
    const ty = this.triggerPos.y
    const dx = px - tx
    const dy = py - ty
    const dist = Math.sqrt(dx * dx + dy * dy) || 1e-6

    const edge = this.triggerRadius * Math.max(0.01, this.stateSmoothEdge)
    const stateWeight = 1 - ProximityTriggeredPhaseBehaviour.smoothstep(0, edge, dist)

    if (this.writeStateForColor) {
      ;(particle as any).proximityTriggeredState = stateWeight
    }

    const phase = this.particlePhase.get(particle.uid) ?? 0
    const newPhase = phase + this.orbitPhaseSpeed * deltaTime
    this.particlePhase.set(particle.uid, newPhase)

    const orbitVelX = -py * this.orbitStrength
    const orbitVelY = px * this.orbitStrength
    const orbitVelZ = Math.sin(particle.z ?? 0) * this.orbitStrength

    const nx = dx / dist
    const ny = dy / dist
    const jitterX =
      (ProximityTriggeredPhaseBehaviour.frac((px + 1) * 123.4) - 0.5) * 2
    const jitterY =
      (ProximityTriggeredPhaseBehaviour.frac((py + 2) * 123.4) - 0.5) * 2
    const kineticVelX = nx * this.escapeStrength + jitterX * this.jitterStrength
    const kineticVelY = ny * this.escapeStrength + jitterY * this.jitterStrength

    const velX =
      (1 - stateWeight) * orbitVelX + stateWeight * kineticVelX
    const velY =
      (1 - stateWeight) * orbitVelY + stateWeight * kineticVelY

    particle.velocity.x += velX * deltaTime
    particle.velocity.y += velY * deltaTime
  }

  getName(): string {
    return BehaviourNames.PROXIMITY_TRIGGERED_PHASE_BEHAVIOUR
  }

  getProps(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      priority: this.priority,
      triggerPos: { x: this.triggerPos.x, y: this.triggerPos.y },
      triggerRadius: this.triggerRadius,
      orbitStrength: this.orbitStrength,
      orbitPhaseSpeed: this.orbitPhaseSpeed,
      escapeStrength: this.escapeStrength,
      jitterStrength: this.jitterStrength,
      stateSmoothEdge: this.stateSmoothEdge,
      writeStateForColor: this.writeStateForColor,
      name: this.getName(),
    }
  }
}
