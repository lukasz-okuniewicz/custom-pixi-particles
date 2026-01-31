import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'
import type Model from '../Model'
import type TurbulencePool from '../util/turbulencePool'

/**
 * AizawaAttractorBehaviour — Chaos dynamics: particles follow the Aizawa strange attractor.
 *
 * Deterministic 3D ODE; small differences in initial conditions trace out a bounded
 * "pulsing sphere" with hollow core. Emergent breathing volume.
 *
 * Mathematical logic (portable to C#/C++/HLSL):
 *   dP.x = (z - b)*x - d*y
 *   dP.y = d*x + (z - b)*y
 *   dP.z = c + a*z - z³/3 - (x² + y²)*(1 + e*z) + f*z*x³
 *   pos += dP * dt * speed
 *
 * Visual: color by distance from origin; scale by |velocity| (core = high energy, shell = cooling).
 */
export default class AizawaAttractorBehaviour extends Behaviour {
  enabled = true
  priority = 80

  a = 0.95
  b = 0.7
  c = 0.6
  d = 3.5
  e = 0.25
  f = 0.1
  speed = 0.15
  /** Scale 3D position to 2D display (multiply x,y by this). */
  scaleXY = 1

  /** Write distance from origin [0,1] for color (core = furnace, shell = embers). */
  writeDistanceForColor = true
  /** Write |velocity| [0,1] for scale (high energy = larger). */
  writeSpeedForScale = true
  /** Normalize distance by this for [0,1] (typical attractor radius). */
  distanceNormalize = 2
  /** Normalize speed by this for [0,1]. */
  speedNormalize = 5

  init(particle: Particle, _model: Model, _turbulencePool: TurbulencePool) {
    const p = particle as any
    const mx = particle.movement?.x ?? particle.x ?? 0
    const my = particle.movement?.y ?? particle.y ?? 0
    p.aizawaX = mx * 0.1
    p.aizawaY = my * 0.1
    p.aizawaZ = (particle.uid % 100) * 0.02 - 1
  }

  apply(particle: Particle, deltaTime: number, _model: Model) {
    if (!this.enabled || particle.skipPositionBehaviour) return

    const p = particle as any
    let x = p.aizawaX != null ? p.aizawaX : 0.1
    let y = p.aizawaY != null ? p.aizawaY : 0.1
    let z = p.aizawaZ != null ? p.aizawaZ : 0

    const a = this.a
    const b = this.b
    const c = this.c
    const d = this.d
    const e = this.e
    const f = this.f
    const dt = deltaTime * this.speed

    const dPx = (z - b) * x - d * y
    const dPy = d * x + (z - b) * y
    const dPz =
      c +
      a * z -
      (z * z * z) / 3 -
      (x * x + y * y) * (1 + e * z) +
      f * z * x * x * x

    x += dPx * dt
    y += dPy * dt
    z += dPz * dt

    p.aizawaX = x
    p.aizawaY = y
    p.aizawaZ = z

    particle.movement.x = x * this.scaleXY
    particle.movement.y = y * this.scaleXY
    particle.x = particle.movement.x
    particle.y = particle.movement.y

    const distFromOrigin = Math.sqrt(x * x + y * y + z * z)
    const velMag = Math.sqrt(dPx * dPx + dPy * dPy + dPz * dPz)

    if (this.writeDistanceForColor) {
      p.aizawaDistance = Math.min(1, distFromOrigin / Math.max(1e-6, this.distanceNormalize))
    }
    if (this.writeSpeedForScale) {
      p.aizawaSpeed = Math.min(1, velMag / Math.max(1e-6, this.speedNormalize))
    }
  }

  getName(): string {
    return BehaviourNames.AIZAWA_ATTRACTOR_BEHAVIOUR
  }

  getProps(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      priority: this.priority,
      a: this.a,
      b: this.b,
      c: this.c,
      d: this.d,
      e: this.e,
      f: this.f,
      speed: this.speed,
      scaleXY: this.scaleXY,
      writeDistanceForColor: this.writeDistanceForColor,
      writeSpeedForScale: this.writeSpeedForScale,
      distanceNormalize: this.distanceNormalize,
      speedNormalize: this.speedNormalize,
      name: this.getName(),
    }
  }
}
