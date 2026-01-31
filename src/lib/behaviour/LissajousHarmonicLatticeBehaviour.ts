import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'
import type Model from '../Model'
import type TurbulencePool from '../util/turbulencePool'

const DEG60 = (60 * Math.PI) / 180
const DEG120 = (120 * Math.PI) / 180

/**
 * LissajousHarmonicLatticeBehaviour — Cymatic patterns: each particle is anchored
 * to a point in a 3D grid and follows a complex harmonic oscillation. When many
 * move together, they form "Cymatic" interference patterns (like vibrating sand
 * on a metal plate).
 *
 * Unique logic: Each axis (x, y, z) oscillates at a different frequency ratio
 * (a:b:c). Phase shift (δ) is derived from the particle's anchor position, so
 * the swarm forms shifting geometric knots.
 *
 * Visual: Map Alpha to "restoration force" (distance from anchor). At the
 * furthest point of the swing, the particle glows brightest.
 * Map Scale to local "density" — at nodes (anchor) particles shrink to sharp
 * high-frequency points.
 */
export default class LissajousHarmonicLatticeBehaviour extends Behaviour {
  enabled = true
  /** Run after Color/Size so restoration/density-driven alpha/scale stick */
  priority = -50

  /** Frequency ratio for X axis */
  freqX = 1
  /** Frequency ratio for Y axis */
  freqY = 2
  /** Frequency ratio for Z axis */
  freqZ = 3
  /** Oscillation amplitude (world units) */
  amplitude = 30
  /** Global time scale */
  speed = 1
  /** Phase scale from anchor (spatial phase shift) */
  phaseScale = 0.1
  /** Scale 3D position to 2D display (multiply x, y by this) */
  scaleXY = 1

  /** Write distance from anchor [0,1] for alpha (far = bright). */
  writeRestorationForAlpha = true
  /** Write local "density" [0,1] for scale (at anchor = small). */
  writeDensityForScale = true
  /** Normalize restoration by this to get [0,1] (typical max offset). */
  restorationNormalize = 1
  /** When writing alpha directly: alpha = restoration * this. */
  alphaScale = 1
  /** When writing scale directly: scale = (1 - density) * this. */
  scaleFromDensity = 1

  private _globalTime = 0

  update(deltaTime: number) {
    this._globalTime += deltaTime * this.speed
  }

  init(particle: Particle, _model: Model, _turbulencePool: TurbulencePool) {
    const p = particle as any
    p.lissajousAnchorX = particle.movement?.x ?? particle.x ?? 0
    p.lissajousAnchorY = particle.movement?.y ?? particle.y ?? 0
    p.lissajousAnchorZ = particle.z ?? 0
  }

  apply(particle: Particle, deltaTime: number, _model: Model) {
    if (!this.enabled || particle.skipPositionBehaviour) return

    const p = particle as any
    const anchorX = p.lissajousAnchorX != null ? p.lissajousAnchorX : 0
    const anchorY = p.lissajousAnchorY != null ? p.lissajousAnchorY : 0
    const anchorZ = p.lissajousAnchorZ != null ? p.lissajousAnchorZ : 0

    const t = this._globalTime

    const phaseShift = (anchorX + anchorY + anchorZ) * this.phaseScale
    const offsetX = Math.sin(this.freqX * t + phaseShift)
    const offsetY = Math.sin(this.freqY * t + phaseShift + DEG60)
    const offsetZ = Math.sin(this.freqZ * t + phaseShift + DEG120)

    const ox = offsetX * this.amplitude
    const oy = offsetY * this.amplitude
    const oz = offsetZ * this.amplitude

    particle.movement.x = anchorX + ox * this.scaleXY
    particle.movement.y = anchorY + oy * this.scaleXY
    particle.x = particle.movement.x
    particle.y = particle.movement.y
    particle.z = anchorZ + oz

    const distFromAnchor = Math.sqrt(ox * ox + oy * oy + oz * oz)
    const maxOffset = this.amplitude * Math.sqrt(3)
    const restoration = Math.min(1, distFromAnchor / Math.max(1e-6, this.restorationNormalize * maxOffset))
    const density = 1 - restoration

    if (this.writeRestorationForAlpha) {
      p.lissajousRestoration = restoration
      particle.color.alpha = Math.min(1, restoration * this.alphaScale)
    }
    if (this.writeDensityForScale) {
      p.lissajousDensity = density
      const s = (1 - density) * this.scaleFromDensity
      particle.size.x = Math.max(0.01, s)
      particle.size.y = Math.max(0.01, s)
    }
  }

  getName(): string {
    return BehaviourNames.LISSAJOUS_HARMONIC_LATTICE_BEHAVIOUR
  }

  getProps(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      priority: this.priority,
      freqX: this.freqX,
      freqY: this.freqY,
      freqZ: this.freqZ,
      amplitude: this.amplitude,
      speed: this.speed,
      phaseScale: this.phaseScale,
      scaleXY: this.scaleXY,
      writeRestorationForAlpha: this.writeRestorationForAlpha,
      writeDensityForScale: this.writeDensityForScale,
      restorationNormalize: this.restorationNormalize,
      alphaScale: this.alphaScale,
      scaleFromDensity: this.scaleFromDensity,
      name: this.getName(),
    }
  }
}
