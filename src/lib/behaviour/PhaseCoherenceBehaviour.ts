import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'
import type Model from '../Model'
import type TurbulencePool from '../util/turbulencePool'
import { spatialCellKey } from '../util/spatialCellKey'

const MAX_POOLED_PHASE_CELLS = 2048

/**
 * PhaseCoherenceBehaviour — Kuramoto-style phase coupling for emergent synchronization.
 *
 * Each particle has an internal phase θ; they try to align phase with nearby particles.
 * Many particles together produce synchronized waves, flashing bands, or gradual lock-in.
 *
 * Mathematical logic (portable to C#/C++/Compute):
 * - Phase dynamics: dθ/dt = ω + K * (1/N) * Σ sin(θ_j - θ_i) over neighbors j.
 * - Equivalently: steer θ toward the mean angle of neighbors (via sin(θ_avg - θ)).
 * - Order parameter r = |(1/N) Σ e^{iθ}| in [0,1]; r→1 means full sync.
 *
 * Visual interaction:
 * - colorByPhase: use particle.phaseCoherencePhase in [0,1] for hue or brightness.
 * - colorByOrder: use particle.phaseCoherenceOrder (r) for intensity (in-sync = bright).
 * - scaleByOrder: scale size by order (sync = larger).
 *
 * Performance: spatial grid rebuilds once per frame in `update()`; neighbor checks are O(k) per particle.
 * Set particleListGetter = () => emitter.list (wired by parser when available).
 */
export default class PhaseCoherenceBehaviour extends Behaviour {
  enabled = true
  priority = 248

  /** Natural frequency (rad/s). */
  naturalFrequency = 2
  /** Coupling strength (Kuramoto K). */
  couplingStrength = 3
  /** Neighbor radius for phase coupling. */
  radius = 80
  /** Optional: add a small velocity component in phase direction for drift. */
  driftStrength = 0
  /** Write phase in [0,1] for color. */
  writePhaseForColor = true
  /** Write order parameter r in [0,1] for color/scale. */
  writeOrderForVisual = true
  /** Scale particle size by order parameter. */
  scaleByOrder = false
  orderScaleMin = 0.7
  orderScaleMax = 1.3

  particleListGetter: (() => { forEach: (cb: (p: Particle) => void) => void }) | null = null

  private phaseGrid = new Map<number, Particle[]>()
  private phaseCellPool: Particle[][] = []
  private phaseScratchParticles: Particle[] = []
  private phaseGridCellSize = 1
  private phaseGridSearchR = 1

  init(particle: Particle, _model: Model, _turbulencePool: TurbulencePool) {
    // Spread initial phase so they are not all in sync at start
    const p = particle as any
    p.phaseCoherencePhaseRad = (particle.uid * 0.618033988749895) % (2 * Math.PI)
  }

  update() {
    const list = this.particleListGetter?.()
    if (!list || !this.enabled) return

    const cellSize = Math.max(1, this.radius)
    this.phaseGridCellSize = cellSize
    this.phaseGridSearchR = Math.min(4, Math.ceil(this.radius / cellSize) + 1)

    this.recyclePhaseGrid()
    const particles = this.phaseScratchParticles
    particles.length = 0
    list.forEach((p: Particle) => particles.push(p))

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      const ox = (p as any).movement?.x ?? p.x
      const oy = (p as any).movement?.y ?? p.y
      const cx = Math.floor(ox / cellSize)
      const cy = Math.floor(oy / cellSize)
      const key = spatialCellKey(cx, cy)
      let cell = this.phaseGrid.get(key)
      if (!cell) {
        cell = this.borrowPhaseCell()
        this.phaseGrid.set(key, cell)
      }
      cell.push(p)
    }
  }

  private recyclePhaseGrid() {
    this.phaseGrid.forEach((cell) => {
      cell.length = 0
      if (this.phaseCellPool.length < MAX_POOLED_PHASE_CELLS) {
        this.phaseCellPool.push(cell)
      }
    })
    this.phaseGrid.clear()
  }

  private borrowPhaseCell(): Particle[] {
    return this.phaseCellPool.pop() ?? []
  }

  private forEachNeighbor(particle: Particle, fn: (other: Particle) => void) {
    const px = particle.movement.x
    const py = particle.movement.y
    const cellSize = this.phaseGridCellSize
    const pcx = Math.floor(px / cellSize)
    const pcy = Math.floor(py / cellSize)
    const R = this.phaseGridSearchR
    for (let dx = -R; dx <= R; dx++) {
      for (let dy = -R; dy <= R; dy++) {
        const cell = this.phaseGrid.get(spatialCellKey(pcx + dx, pcy + dy))
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

    const list = this.particleListGetter?.()
    const p = particle as any
    let theta = p.phaseCoherencePhaseRad != null ? p.phaseCoherencePhaseRad : (particle.uid * 0.618) % (2 * Math.PI)

    let sumSin = 0
    let sumCos = 0
    let neighborCount = 0

    if (list) {
      const px = particle.movement.x
      const py = particle.movement.y
      const r2 = this.radius * this.radius

      this.forEachNeighbor(particle, (other: Particle) => {
        const ox = (other as any).movement?.x ?? other.x
        const oy = (other as any).movement?.y ?? other.y
        const dx = px - ox
        const dy = py - oy
        const distSq = dx * dx + dy * dy
        if (distSq > r2 || distSq === 0) return

        const otherTheta = (other as any).phaseCoherencePhaseRad
        if (otherTheta == null) return
        sumSin += Math.sin(otherTheta)
        sumCos += Math.cos(otherTheta)
        neighborCount += 1
      })
    }

    if (neighborCount > 0) {
      const meanSin = sumSin / neighborCount
      const meanCos = sumCos / neighborCount
      const thetaAvg = Math.atan2(meanSin, meanCos)
      const dTheta = this.couplingStrength * Math.sin(thetaAvg - theta) * deltaTime
      theta += dTheta
    }

    theta += this.naturalFrequency * deltaTime
    theta = ((theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
    p.phaseCoherencePhaseRad = theta

    if (this.driftStrength !== 0) {
      particle.velocity.x += this.driftStrength * Math.cos(theta) * deltaTime
      particle.velocity.y += this.driftStrength * Math.sin(theta) * deltaTime
    }

    if (this.writePhaseForColor) {
      p.phaseCoherencePhase = theta / (2 * Math.PI)
    }

    if (this.writeOrderForVisual || this.scaleByOrder) {
      let orderSin = Math.sin(theta)
      let orderCos = Math.cos(theta)
      if (list && neighborCount > 0) {
        orderSin = (orderSin + sumSin) / (neighborCount + 1)
        orderCos = (orderCos + sumCos) / (neighborCount + 1)
      }
      const r = Math.sqrt(orderSin * orderSin + orderCos * orderCos)
      p.phaseCoherenceOrder = Math.min(1, r)
      if (this.scaleByOrder) {
        const t = p.phaseCoherenceOrder
        const scale = this.orderScaleMin + (this.orderScaleMax - this.orderScaleMin) * t
        const baseW = particle.sizeStart.x + (particle.sizeEnd.x - particle.sizeStart.x) * particle.lifeProgress
        const baseH = particle.sizeStart.y + (particle.sizeEnd.y - particle.sizeStart.y) * particle.lifeProgress
        particle.size.x = baseW * scale
        particle.size.y = baseH * scale
      }
    }
  }

  getName(): string {
    return BehaviourNames.PHASE_COHERENCE_BEHAVIOUR
  }

  getProps(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      priority: this.priority,
      naturalFrequency: this.naturalFrequency,
      couplingStrength: this.couplingStrength,
      radius: this.radius,
      driftStrength: this.driftStrength,
      writePhaseForColor: this.writePhaseForColor,
      writeOrderForVisual: this.writeOrderForVisual,
      scaleByOrder: this.scaleByOrder,
      orderScaleMin: this.orderScaleMin,
      orderScaleMax: this.orderScaleMax,
      name: this.getName(),
    }
  }
}
