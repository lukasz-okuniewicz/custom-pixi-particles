import { createNoise3D } from 'simplex-noise'
import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'
import type Model from '../Model'
import type TurbulencePool from '../util/turbulencePool'

const DELTA = 0.01

/**
 * JacobianCurlFieldBehaviour — Incompressible flow via curl noise. The curl of
 * a vector potential gives a divergence-free velocity field, so particles flow
 * around obstacles and each other like water without clumping.
 *
 * Unique logic: We sample a 3D potential (Simplex noise) and take finite-
 * difference gradients, then form velocity = (dN/dy, -dN/dx, 0.5*(dN/dy + dN/dx))
 * so flow follows contours of the noise.
 *
 * Visual: Curl magnitude (how sharp the turn) drives Hue. Straight-moving
 * particles are cool (blue); particles in tight eddies turn hot (orange/red).
 */
export default class JacobianCurlFieldBehaviour extends Behaviour {
  enabled = true
  /** Run after Color/Size so curl-driven hue sticks */
  priority = -55

  noiseScale = 0.01
  speed = 50
  /** Scale 3D position to 2D display */
  scaleXY = 1
  /** Normalize curl magnitude by this to get [0,1] for hue */
  curlMagnitudeNormalize = 2
  /** Write curl magnitude [0,1] to particle.curlMagnitude for hue */
  writeCurlMagnitudeForHue = true
  /** When true, set particle.color from hue (blue = straight, red = eddy) */
  applyHueToColor = true
  /** Hue at low curl (straight) in degrees (240 = blue) */
  hueStraight = 240
  /** Hue at high curl (eddy) in degrees (0 = red) */
  hueEddy = 0

  private _noise3D: (x: number, y: number, z: number) => number
  private _time = 0

  constructor() {
    super()
    this._noise3D = createNoise3D()
  }

  update(deltaTime: number) {
    this._time += deltaTime
  }

  init(particle: Particle, _model: Model, _turbulencePool: TurbulencePool) {
    const p = particle as any
    p.curlPosX = particle.movement?.x ?? particle.x ?? 0
    p.curlPosY = particle.movement?.y ?? particle.y ?? 0
    p.curlPosZ = particle.z ?? 0
  }

  private sampleNoise(x: number, y: number, z: number): number {
    const s = this.noiseScale
    return this._noise3D(x * s, y * s, z * s)
  }

  private getCurlVelocity(px: number, py: number, pz: number): { x: number; y: number; z: number } {
    const d = DELTA
    const n1 = this.sampleNoise(px, py + d, pz)
    const n2 = this.sampleNoise(px, py - d, pz)
    const n3 = this.sampleNoise(px + d, py, pz)
    const n4 = this.sampleNoise(px - d, py, pz)
    const n5 = this.sampleNoise(px, py, pz + d)
    const n6 = this.sampleNoise(px, py, pz - d)

    const dNdy = (n1 - n2) / (2 * d)
    const dNdx = (n3 - n4) / (2 * d)
    const dNdz = (n5 - n6) / (2 * d)

    // Curl-like velocity: (dN/dy, -dN/dx, 0.5*(dN/dy + dN/dx)) for swirling in plane
    return {
      x: dNdy,
      y: -dNdx,
      z: 0.5 * (dNdy + dNdx),
    }
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    h = h / 360
    let r: number, g: number, b: number
    if (s === 0) {
      r = g = b = l
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1 / 6) return p + (q - p) * 6 * t
        if (t < 1 / 2) return q
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
        return p
      }
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h + 1 / 3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1 / 3)
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) }
  }

  apply(particle: Particle, deltaTime: number, _model: Model) {
    if (!this.enabled || particle.skipPositionBehaviour) return

    const p = particle as any
    let px = p.curlPosX != null ? p.curlPosX : 0
    let py = p.curlPosY != null ? p.curlPosY : 0
    let pz = p.curlPosZ != null ? p.curlPosZ : 0

    const t = this._time
    const vel = this.getCurlVelocity(px, py, pz + t * 0.1)

    const dt = deltaTime * this.speed
    px += vel.x * dt
    py += vel.y * dt
    pz += vel.z * dt

    p.curlPosX = px
    p.curlPosY = py
    p.curlPosZ = pz

    particle.movement.x = px * this.scaleXY
    particle.movement.y = py * this.scaleXY
    particle.x = particle.movement.x
    particle.y = particle.movement.y
    particle.z = pz

    const mag = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z)
    const curlMagnitude = Math.min(1, mag / Math.max(1e-6, this.curlMagnitudeNormalize))

    if (this.writeCurlMagnitudeForHue) {
      p.curlMagnitude = curlMagnitude
    }
    if (this.applyHueToColor) {
      const hue = this.hueStraight + (this.hueEddy - this.hueStraight) * curlMagnitude
      const { r, g, b } = this.hslToRgb(hue, 0.9, 0.6)
      particle.color.r = r
      particle.color.g = g
      particle.color.b = b
      particle.color.alpha = 1
    }
  }

  getName(): string {
    return BehaviourNames.JACOBIAN_CURL_FIELD_BEHAVIOUR
  }

  getProps(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      priority: this.priority,
      noiseScale: this.noiseScale,
      speed: this.speed,
      scaleXY: this.scaleXY,
      curlMagnitudeNormalize: this.curlMagnitudeNormalize,
      writeCurlMagnitudeForHue: this.writeCurlMagnitudeForHue,
      applyHueToColor: this.applyHueToColor,
      hueStraight: this.hueStraight,
      hueEddy: this.hueEddy,
      name: this.getName(),
    }
  }
}
