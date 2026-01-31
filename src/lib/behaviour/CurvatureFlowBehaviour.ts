import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'
import type Model from '../Model'
import type TurbulencePool from '../util/turbulencePool'

/**
 * CurvatureFlowBehaviour — Particles advect along the gradient of local density.
 *
 * Density is computed from neighbors via a smooth kernel; velocity is proportional to ∇(density).
 * Flow toward higher density produces surface-tension-like blobs and tendrils; many particles
 * form smooth, coherent boundaries and emergent shapes.
 *
 * Mathematical logic (portable to C#/C++/Compute):
 * - Density ρ_i = Σ_j kernel(||p_i - p_j||). Kernel: e.g. poly (1 - d²/R²)² or Gaussian.
 * - Gradient ∇ρ = Σ_j kernel'(d) * (p_j - p_i) / d (direction from i to j).
 * - For poly kernel (1 - d²/R²)²: derivative = -2*(1 - d²/R²)*2d/R² = -4d(1 - d²/R²)/R².
 * - velocity += strength * ∇ρ * dt (flow toward higher density).
 *
 * Visual interaction:
 * - colorByDensity: use particle.curvatureFlowDensity in [0,1] (e.g. dense = brighter).
 * - scaleByDensity: scale by density (dense regions = larger particles).
 *
 * Performance: Uses an internal spatial grid built once per frame (update()); apply() only
 * iterates over the 3×3 cell neighborhood, giving O(N·k) with k ≈ particles per cell.
 */
export default class CurvatureFlowBehaviour extends Behaviour {
  enabled = true
  priority = 245

  /** Influence radius for density kernel. */
  radius = 70
  /** Strength of gradient flow (positive = toward higher density). */
  strength = 120
  /** Kernel type: 'poly' (smooth) or 'linear' (1 - d/R). */
  kernelType: 'poly' | 'linear' = 'poly'
  /** Max speed clamp to avoid explosion. */
  maxSpeed = 500
  /** Write normalized density for color. */
  writeDensityForColor = true
  /** Scale size by local density. */
  scaleByDensity = false
  densityScaleMin = 0.6
  densityScaleMax = 1.4
  /** Normalize density by this expected max neighbors for [0,1] output. */
  densityNormalizeCount = 12

  particleListGetter: (() => { forEach: (cb: (p: Particle) => void) => void }) | null = null

  /** Spatial grid: cell key -> particles in that cell. Built once per frame in update(). */
  private _spatialGrid: Map<string, Particle[]> = new Map()
  private _cellSize = 1

  init(_particle: Particle, _model: Model, _turbulencePool: TurbulencePool) {}

  /**
   * Build spatial grid from particle list so apply() can query only nearby cells.
   * Called once per frame before any apply().
   */
  update(deltaTime: number): void {
    const list = this.particleListGetter?.()
    if (!list) return

    this._cellSize = Math.max(1, this.radius)
    this._spatialGrid.clear()

    list.forEach((p: Particle) => {
      const x = (p as any).movement?.x ?? p.x
      const y = (p as any).movement?.y ?? p.y
      const cx = Math.floor(x / this._cellSize)
      const cy = Math.floor(y / this._cellSize)
      const key = `${cx},${cy}`
      let cell = this._spatialGrid.get(key)
      if (!cell) {
        cell = []
        this._spatialGrid.set(key, cell)
      }
      cell.push(p)
    })
  }

  /** Get candidates from 3×3 cells around (cx, cy). */
  private _getCandidates(px: number, py: number): Particle[] {
    const cx = Math.floor(px / this._cellSize)
    const cy = Math.floor(py / this._cellSize)
    const out: Particle[] = []
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cx + dx},${cy + dy}`
        const cell = this._spatialGrid.get(key)
        if (cell) for (let i = 0; i < cell.length; i++) out.push(cell[i])
      }
    }
    return out
  }

  apply(particle: Particle, deltaTime: number, _model: Model) {
    if (!this.enabled || particle.skipPositionBehaviour) return

    const px = particle.movement.x
    const py = particle.movement.y
    const R = this.radius
    const R2 = R * R

    const candidates =
      this._spatialGrid.size > 0
        ? this._getCandidates(px, py)
        : (() => {
            const list = this.particleListGetter?.()
            if (!list) return []
            const a: Particle[] = []
            list.forEach((p: Particle) => a.push(p))
            return a
          })()

    let density = 0
    let gradX = 0
    let gradY = 0

    for (let i = 0; i < candidates.length; i++) {
      const other = candidates[i]
      if (other === particle) continue
      const ox = (other as any).movement?.x ?? other.x
      const oy = (other as any).movement?.y ?? other.y
      const dx = ox - px
      const dy = oy - py
      const distSq = dx * dx + dy * dy
      if (distSq >= R2) continue

      const dist = Math.sqrt(distSq) || 1e-6
      const t = dist / R
      const t2 = distSq / R2

      if (this.kernelType === 'poly') {
        const u = 1 - t2
        const kernel = u * u
        density += kernel
        const dKernel = -4 * (1 - t2) * (dist / R2)
        const nx = dx / dist
        const ny = dy / dist
        gradX += dKernel * nx
        gradY += dKernel * ny
      } else {
        const kernel = 1 - t
        density += kernel
        const dKernel = -1 / R
        const nx = dx / dist
        const ny = dy / dist
        gradX += dKernel * nx
        gradY += dKernel * ny
      }
    }

    const gradLen = Math.sqrt(gradX * gradX + gradY * gradY) || 1e-6
    const scale = (this.strength * deltaTime) / gradLen
    // Gradient points from high density toward particle; subtract to flow toward higher density
    particle.velocity.x -= gradX * scale
    particle.velocity.y -= gradY * scale

    const speed = Math.sqrt(particle.velocity.x ** 2 + particle.velocity.y ** 2)
    if (speed > this.maxSpeed) {
      const f = this.maxSpeed / speed
      particle.velocity.x *= f
      particle.velocity.y *= f
    }

    const p = particle as any
    if (this.writeDensityForColor) {
      p.curvatureFlowDensity = Math.min(1, density / Math.max(1, this.densityNormalizeCount))
    }

    if (this.scaleByDensity) {
      const t = Math.min(1, density / Math.max(1, this.densityNormalizeCount))
      const scaleS = this.densityScaleMin + (this.densityScaleMax - this.densityScaleMin) * t
      const baseW = particle.sizeStart.x + (particle.sizeEnd.x - particle.sizeStart.x) * particle.lifeProgress
      const baseH = particle.sizeStart.y + (particle.sizeEnd.y - particle.sizeStart.y) * particle.lifeProgress
      particle.size.x = baseW * scaleS
      particle.size.y = baseH * scaleS
    }
  }

  getName(): string {
    return BehaviourNames.CURVATURE_FLOW_BEHAVIOUR
  }

  getProps(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      priority: this.priority,
      radius: this.radius,
      strength: this.strength,
      kernelType: this.kernelType,
      maxSpeed: this.maxSpeed,
      writeDensityForColor: this.writeDensityForColor,
      scaleByDensity: this.scaleByDensity,
      densityScaleMin: this.densityScaleMin,
      densityScaleMax: this.densityScaleMax,
      densityNormalizeCount: this.densityNormalizeCount,
      name: this.getName(),
    }
  }
}
