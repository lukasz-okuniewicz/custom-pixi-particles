import { Point } from '../util'
import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'
import type Model from '../Model'
import type TurbulencePool from '../util/turbulencePool'

/**
 * ProximityStateBehaviour — State-based transition: particles change behavior by distance to a target.
 *
 * Far state (distance > threshold): wander — smooth curl/orbit motion (no random burst).
 * Near state (distance <= threshold): seek — move toward target with optional slowdown.
 *
 * Mathematical logic (portable to C#/C++/Compute):
 * - State = (dist <= nearRadius) ? 'seek' : 'wander'
 * - Wander: steer perpendicular to current velocity, with phase = f(lifeTime) for deterministic curl.
 * - Seek: desired = normalize(target - pos) * maxSpeed; steer = desired - velocity (clamped).
 *
 * Visual interaction:
 * - colorByState: tint by state (e.g. wander = cool, seek = warm); particle.proximityState 0 = far, 1 = near.
 * - scaleByDistance: scale by distance to target (closer = larger or smaller); particle.proximityDistNorm in [0,1].
 */
export default class ProximityStateBehaviour extends Behaviour {
  enabled = true
  priority = 220

  target = new Point(0, 0)
  nearRadius = 120
  wanderStrength = 180
  wanderPhaseSpeed = 2
  seekStrength = 1.0
  seekMaxSpeed = 300
  arrivalRadius = 30

  /** Write state for color pipeline: 0 = far/wander, 1 = near/seek. */
  writeStateForColor = true
  /** Write normalized distance (0 = at target, 1 = at or beyond nearRadius) for scale/alpha. */
  writeDistanceForVisual = true

  private particlePhase: Map<number, number> = new Map()

  init(particle: Particle, _model: Model, _turbulencePool: TurbulencePool) {
    this.particlePhase.set(particle.uid, Math.random() * Math.PI * 2)
  }

  onParticleRemoved = (particle: Particle) => {
    this.particlePhase.delete(particle.uid)
  }

  apply(particle: Particle, deltaTime: number, _model: Model) {
    if (!this.enabled || particle.skipPositionBehaviour) return

    const px = particle.movement.x
    const py = particle.movement.y
    const vx = particle.velocity.x
    const vy = particle.velocity.y

    const dx = this.target.x - px
    const dy = this.target.y - py
    const distSq = dx * dx + dy * dy
    const dist = Math.sqrt(distSq) || 1e-6

    const isNear = dist <= this.nearRadius

    if (this.writeStateForColor) {
      ;(particle as any).proximityState = isNear ? 1 : 0
    }
    if (this.writeDistanceForVisual) {
      ;(particle as any).proximityDistNorm = Math.min(1, dist / Math.max(1, this.nearRadius))
    }

    if (isNear) {
      const desiredSpeed = dist <= this.arrivalRadius
        ? (dist / Math.max(1, this.arrivalRadius)) * this.seekMaxSpeed
        : this.seekMaxSpeed
      const nx = dx / dist
      const ny = dy / dist
      const desiredX = nx * desiredSpeed
      const desiredY = ny * desiredSpeed
      let steerX = (desiredX - vx) * this.seekStrength * deltaTime * 4
      let steerY = (desiredY - vy) * this.seekStrength * deltaTime * 4
      const mag = Math.sqrt(steerX * steerX + steerY * steerY)
      const maxSteer = this.seekMaxSpeed * deltaTime * 2
      if (mag > maxSteer && mag > 1e-6) {
        steerX = (steerX / mag) * maxSteer
        steerY = (steerY / mag) * maxSteer
      }
      particle.velocity.x += steerX
      particle.velocity.y += steerY
    } else {
      const phase = this.particlePhase.get(particle.uid) ?? 0
      const newPhase = phase + this.wanderPhaseSpeed * deltaTime
      this.particlePhase.set(particle.uid, newPhase)

      const speed = Math.sqrt(vx * vx + vy * vy) || 1
      const perpX = -vy / speed
      const perpY = vx / speed
      const curl = Math.sin(newPhase) * this.wanderStrength * deltaTime
      particle.velocity.x += perpX * curl
      particle.velocity.y += perpY * curl
    }
  }

  getName(): string {
    return BehaviourNames.PROXIMITY_STATE_BEHAVIOUR
  }

  getProps(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      priority: this.priority,
      target: { x: this.target.x, y: this.target.y },
      nearRadius: this.nearRadius,
      wanderStrength: this.wanderStrength,
      wanderPhaseSpeed: this.wanderPhaseSpeed,
      seekStrength: this.seekStrength,
      seekMaxSpeed: this.seekMaxSpeed,
      arrivalRadius: this.arrivalRadius,
      writeStateForColor: this.writeStateForColor,
      writeDistanceForVisual: this.writeDistanceForVisual,
      name: this.getName(),
    }
  }
}
