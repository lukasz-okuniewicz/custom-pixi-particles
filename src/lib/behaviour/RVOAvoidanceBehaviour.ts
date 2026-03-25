import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'
import type Model from '../Model'
import type TurbulencePool from '../util/turbulencePool'
import { spatialCellKey } from '../util/spatialCellKey'

const MAX_POOLED_RVO_CELLS = 2048

/**
 * Lightweight reciprocal avoidance: corrective velocity from nearby particles (2D).
 *
 * Performance: spatial grid rebuilds once per frame in `update()`; neighbor checks are O(k) per particle.
 */
export default class RVOAvoidanceBehaviour extends Behaviour {
  enabled = true
  priority = 255

  neighborRadius = 45
  timeHorizon = 0.4
  maxAccel = 800
  weight = 1
  minSeparation = 18

  particleListGetter: (() => { forEach: (cb: (p: Particle) => void) => void }) | null = null

  private rvoGrid = new Map<number, Particle[]>()
  private rvoCellPool: Particle[][] = []
  private rvoScratchParticles: Particle[] = []
  private rvoGridCellSize = 1
  private rvoGridSearchR = 1

  init(_particle: Particle, _model: Model, _turbulencePool: TurbulencePool) {}

  update() {
    const list = this.particleListGetter?.()
    if (!list || !this.enabled) return

    const cellSize = Math.max(1, this.neighborRadius)
    this.rvoGridCellSize = cellSize
    this.rvoGridSearchR = Math.min(4, Math.ceil(this.neighborRadius / cellSize) + 1)

    this.recycleRvoGrid()
    const particles = this.rvoScratchParticles
    particles.length = 0
    list.forEach((p: Particle) => particles.push(p))

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      const ox = p.movement.x
      const oy = p.movement.y
      const cx = Math.floor(ox / cellSize)
      const cy = Math.floor(oy / cellSize)
      const key = spatialCellKey(cx, cy)
      let cell = this.rvoGrid.get(key)
      if (!cell) {
        cell = this.borrowRvoCell()
        this.rvoGrid.set(key, cell)
      }
      cell.push(p)
    }
  }

  private recycleRvoGrid() {
    this.rvoGrid.forEach((cell) => {
      cell.length = 0
      if (this.rvoCellPool.length < MAX_POOLED_RVO_CELLS) {
        this.rvoCellPool.push(cell)
      }
    })
    this.rvoGrid.clear()
  }

  private borrowRvoCell(): Particle[] {
    return this.rvoCellPool.pop() ?? []
  }

  private forEachNeighbor(particle: Particle, fn: (other: Particle) => void) {
    const px = particle.movement.x
    const py = particle.movement.y
    const cellSize = this.rvoGridCellSize
    const pcx = Math.floor(px / cellSize)
    const pcy = Math.floor(py / cellSize)
    const R = this.rvoGridSearchR
    for (let dx = -R; dx <= R; dx++) {
      for (let dy = -R; dy <= R; dy++) {
        const cell = this.rvoGrid.get(spatialCellKey(pcx + dx, pcy + dy))
        if (!cell) continue
        for (let j = 0; j < cell.length; j++) {
          const other = cell[j]
          if (other !== particle) fn(other)
        }
      }
    }
  }

  apply(particle: Particle, deltaTime: number, _model: Model) {
    if (!this.enabled || particle.skipPositionBehaviour) return

    if (!this.particleListGetter?.()) return

    const px = particle.movement.x
    const py = particle.movement.y
    const vx = particle.velocity.x
    const vy = particle.velocity.y

    let ax = 0
    let ay = 0
    const r = this.neighborRadius
    const rSq = r * r

    this.forEachNeighbor(particle, (other: Particle) => {
      const ox = other.movement.x
      const oy = other.movement.y
      const dx = px - ox
      const dy = py - oy
      const dSq = dx * dx + dy * dy
      if (dSq > rSq || dSq < 1e-6) return
      const d = Math.sqrt(dSq)
      const combined = this.minSeparation
      const pen = Math.max(0, combined - d)
      if (pen <= 0) return
      const nx = dx / d
      const ny = dy / d

      const ovx = other.velocity.x
      const ovy = other.velocity.y
      const rvx = vx - ovx
      const rvy = vy - ovy
      const closing = rvx * nx + rvy * ny
      const thr = combined / Math.max(0.05, this.timeHorizon)
      if (closing < thr) {
        const t = (1 - d / combined) * this.weight
        ax += nx * pen * t
        ay += ny * pen * t
      } else {
        const t = (pen / combined) * 0.5 * this.weight
        ax += nx * t
        ay += ny * t
      }
    })

    const mag = Math.hypot(ax, ay)
    const cap = this.maxAccel * deltaTime
    if (mag > cap && mag > 1e-6) {
      const s = cap / mag
      ax *= s
      ay *= s
    }
    particle.velocity.x += ax
    particle.velocity.y += ay
  }

  getName() {
    return BehaviourNames.RVO_AVOIDANCE_BEHAVIOUR
  }

  getProps(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      priority: this.priority,
      neighborRadius: this.neighborRadius,
      timeHorizon: this.timeHorizon,
      maxAccel: this.maxAccel,
      weight: this.weight,
      minSeparation: this.minSeparation,
      name: this.getName(),
    }
  }
}
