import { Point } from '../util'
import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'
import type Model from '../Model'
import type TurbulencePool from '../util/turbulencePool'

/**
 * BoidsFlockingBehaviour — Emergent flocking via separation, alignment, cohesion.
 *
 * Uses classic Boids rules from neighboring particles only (no single attractor).
 * Many particles together form flocks, streams, and avoidance patterns.
 *
 * Mathematical logic (portable to C#/C++/Compute):
 * - Separation: steer away from neighbors within separationRadius (inverse-distance weight).
 * - Alignment: steer toward average velocity of neighbors within alignmentRadius.
 * - Cohesion: steer toward average position of neighbors within cohesionRadius.
 *
 * Visual interaction:
 * - scaleByDensity: scale particle size by local neighbor count (dense = larger).
 * - colorBySpeed: tint by speed (e.g. fast = brighter or hue shift); apply in your color pipeline from velocity magnitude.
 *
 * Performance: O(N) per particle without spatial hash; use a spatial hash or grid for O(k) neighbors in C++/Unity.
 * Optional: set particleListGetter = () => emitter.list so this behaviour can iterate neighbors.
 */
export default class BoidsFlockingBehaviour extends Behaviour {
  enabled = true
  priority = 250

  separationRadius = 40
  separationStrength = 1.2
  alignmentRadius = 60
  alignmentStrength = 0.8
  cohesionRadius = 80
  cohesionStrength = 0.5
  maxSpeed = 400
  maxSteerForce = 600

  /** Optional: scale size by local flock density (neighbor count). */
  scaleByDensity = false
  densityScaleMin = 0.8
  densityScaleMax = 1.5
  densityRadius = 50

  /** Optional: store speed on particle for color-by-speed in another behaviour (e.g. particle.flockSpeed). */
  writeSpeedForColor = true

  /** Set by user: () => emitter.list (or any forEach-able list of particles) for neighbor lookups. */
  particleListGetter: (() => { forEach: (cb: (p: Particle) => void) => void }) | null = null

  init(_particle: Particle, _model: Model, _turbulencePool: TurbulencePool) {}

  apply(particle: Particle, deltaTime: number, model: Model) {
    if (!this.enabled || particle.skipPositionBehaviour) return

    const list = this.particleListGetter?.()
    if (!list) return

    const px = particle.movement.x
    const py = particle.movement.y
    const vx = particle.velocity.x
    const vy = particle.velocity.y

    let sepX = 0,
      sepY = 0,
      sepN = 0
    let alignX = 0,
      alignY = 0,
      alignN = 0
    let cohX = 0,
      cohY = 0,
      cohN = 0

    list.forEach((other: Particle) => {
      if (other === particle) return
      const ox = other.movement.x
      const oy = other.movement.y
      const dx = px - ox
      const dy = py - oy
      const distSq = dx * dx + dy * dy
      const dist = Math.sqrt(distSq) || 1e-6

      if (dist < this.separationRadius && dist > 0) {
        const w = 1 - dist / this.separationRadius
        sepX += (dx / dist) * w
        sepY += (dy / dist) * w
        sepN += 1
      }
      if (dist < this.alignmentRadius && dist > 0) {
        alignX += other.velocity.x
        alignY += other.velocity.y
        alignN += 1
      }
      if (dist < this.cohesionRadius && dist > 0) {
        cohX += ox
        cohY += oy
        cohN += 1
      }
    })

    let steerX = 0,
      steerY = 0

    if (sepN > 0) {
      const len = Math.sqrt(sepX * sepX + sepY * sepY) || 1
      steerX += (sepX / len) * this.separationStrength * this.maxSteerForce * deltaTime
      steerY += (sepY / len) * this.separationStrength * this.maxSteerForce * deltaTime
    }
    if (alignN > 0) {
      alignX /= alignN
      alignY /= alignN
      const len = Math.sqrt(alignX * alignX + alignY * alignY) || 1
      const targetSpeed = this.maxSpeed
      const ax = (alignX / len) * targetSpeed - vx
      const ay = (alignY / len) * targetSpeed - vy
      const mag = Math.min(this.maxSteerForce * deltaTime, Math.sqrt(ax * ax + ay * ay))
      if (mag > 1e-6) {
        const s = (this.alignmentStrength * mag) / (Math.sqrt(ax * ax + ay * ay) || 1e-6)
        steerX += ax * s
        steerY += ay * s
      }
    }
    if (cohN > 0) {
      cohX = cohX / cohN - px
      cohY = cohY / cohN - py
      const len = Math.sqrt(cohX * cohX + cohY * cohY) || 1
      const desiredSpeed = this.maxSpeed
      const cx = (cohX / len) * desiredSpeed - vx
      const cy = (cohY / len) * desiredSpeed - vy
      const mag = Math.min(this.maxSteerForce * deltaTime, Math.sqrt(cx * cx + cy * cy))
      if (mag > 1e-6) {
        const s = (this.cohesionStrength * mag) / (Math.sqrt(cx * cx + cy * cy) || 1e-6)
        steerX += cx * s
        steerY += cy * s
      }
    }

    particle.velocity.x += steerX
    particle.velocity.y += steerY

    const speed = Math.sqrt(particle.velocity.x ** 2 + particle.velocity.y ** 2)
    if (speed > this.maxSpeed) {
      const f = this.maxSpeed / speed
      particle.velocity.x *= f
      particle.velocity.y *= f
    }

    if (this.writeSpeedForColor) {
      ;(particle as any).flockSpeed = Math.min(1, speed / this.maxSpeed)
    }

    if (this.scaleByDensity) {
      let densityN = 0
      list.forEach((other: Particle) => {
        if (other === particle) return
        const dx = particle.movement.x - other.movement.x
        const dy = particle.movement.y - other.movement.y
        if (dx * dx + dy * dy < this.densityRadius * this.densityRadius) densityN += 1
      })
      const t = Math.min(1, densityN / 8)
      const scale = this.densityScaleMin + (this.densityScaleMax - this.densityScaleMin) * t
      particle.size.x = (particle.sizeStart.x + (particle.sizeEnd.x - particle.sizeStart.x) * particle.lifeProgress) * scale
      particle.size.y = (particle.sizeStart.y + (particle.sizeEnd.y - particle.sizeStart.y) * particle.lifeProgress) * scale
    }
  }

  getName(): string {
    return BehaviourNames.BOIDS_FLOCKING_BEHAVIOUR
  }

  getProps(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      priority: this.priority,
      separationRadius: this.separationRadius,
      separationStrength: this.separationStrength,
      alignmentRadius: this.alignmentRadius,
      alignmentStrength: this.alignmentStrength,
      cohesionRadius: this.cohesionRadius,
      cohesionStrength: this.cohesionStrength,
      maxSpeed: this.maxSpeed,
      maxSteerForce: this.maxSteerForce,
      scaleByDensity: this.scaleByDensity,
      densityScaleMin: this.densityScaleMin,
      densityScaleMax: this.densityScaleMax,
      densityRadius: this.densityRadius,
      writeSpeedForColor: this.writeSpeedForColor,
      name: this.getName(),
    }
  }
}
