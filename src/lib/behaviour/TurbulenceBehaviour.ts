import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'
import { Point } from '../util'
import TurbulencePool from '../util/turbulencePool'
import Model from '../Model'
import type List from '../util/List'
import { spatialCellKey } from '../util/spatialCellKey'

function resolveEmitterTurbulencePool(model?: Model): TurbulencePool | undefined {
  const emitter = model && (model as { emitter?: { turbulencePool?: TurbulencePool } }).emitter
  return emitter?.turbulencePool
}

const MAX_POOLED_TURBULENCE_CELLS = 2048

export default class TurbulenceBehaviour extends Behaviour {
  priority = 1000
  position = new Point()
  positionVariance = new Point()
  velocity = new Point()
  velocityVariance = new Point()
  acceleration = new Point()
  accelerationVariance = new Point()
  sizeStart = new Point(1, 1)
  sizeEnd = new Point(1, 1)
  startVariance = 0
  endVariance = 0
  emitPerSecond = 0
  duration = 0
  maxLifeTime = 0
  turbulencePool: TurbulencePool
  private enabled: boolean = false
  private showVortices: boolean = false
  private effect: number = 0
  private turbulence: boolean = false
  private vortexOrgSize: number = 128
  private turbGrid = new Map<number, Particle[]>()
  private turbCellPool: Particle[][] = []
  private turbScratchVortices: Particle[] = []
  private turbGridCellSize = 64
  private turbGridSearchR = 2
  private turbGridValid = false

  init = (particle: Particle, model: Model, turbulencePool: TurbulencePool) => {
    // Always keep the pool reference: enabled can be toggled at runtime after particles
    // were created while disabled, and apply() runs before any newly emitted particle
    // has re-run init.
    this.turbulencePool = turbulencePool ?? resolveEmitterTurbulencePool(model)
    if (!this.enabled) return
    particle.showVortices = this.showVortices
    particle.turbulence = this.turbulence
  }

  update = () => {
    this.turbGridValid = false
    if (!this.enabled) return

    const pool: List | undefined = this.turbulencePool?.list
    if (!pool) return

    const vortices = this.turbScratchVortices
    vortices.length = 0
    let maxSx = 1
    pool.forEach((v: Particle) => {
      vortices.push(v)
      maxSx = Math.max(maxSx, v.size.x || 1, 1e-3)
    })
    if (vortices.length === 0) {
      this.recycleTurbGrid()
      return
    }

    const c = Math.max(1, this.vortexOrgSize * maxSx)
    const influenceDist = Math.min(2400, 14 * Math.sqrt(c))
    const cellSize = Math.max(16, Math.floor(influenceDist / 5))
    this.turbGridCellSize = cellSize
    this.turbGridSearchR = Math.min(8, Math.ceil(influenceDist / cellSize) + 1)

    this.recycleTurbGrid()
    for (let i = 0; i < vortices.length; i++) {
      const v = vortices[i]
      const ox = v.x
      const oy = v.y
      const cx = Math.floor(ox / cellSize)
      const cy = Math.floor(oy / cellSize)
      const key = spatialCellKey(cx, cy)
      let cell = this.turbGrid.get(key)
      if (!cell) {
        cell = this.borrowTurbCell()
        this.turbGrid.set(key, cell)
      }
      cell.push(v)
    }
    this.turbGridValid = true
  }

  private recycleTurbGrid() {
    this.turbGrid.forEach((cell) => {
      cell.length = 0
      if (this.turbCellPool.length < MAX_POOLED_TURBULENCE_CELLS) {
        this.turbCellPool.push(cell)
      }
    })
    this.turbGrid.clear()
  }

  private borrowTurbCell(): Particle[] {
    return this.turbCellPool.pop() ?? []
  }

  private forEachNearbyVortex(px: number, py: number, fn: (vortex: Particle) => void) {
    const cellSize = this.turbGridCellSize
    const pcx = Math.floor(px / cellSize)
    const pcy = Math.floor(py / cellSize)
    const R = this.turbGridSearchR
    for (let dx = -R; dx <= R; dx++) {
      for (let dy = -R; dy <= R; dy++) {
        const cell = this.turbGrid.get(spatialCellKey(pcx + dx, pcy + dy))
        if (!cell) continue
        for (let j = 0; j < cell.length; j++) {
          fn(cell[j])
        }
      }
    }
  }

  private applyVortex(particle: Particle, vortex: Particle) {
    let vx = 0
    let vy = 0
    let factor = 0

    const dx = particle.x - vortex.x
    const dy = particle.y - vortex.y

    if (this.effect === 0 || this.effect === 1) {
      if (!this.effect) {
        vx = -dy + vortex.velocity.x
        vy = dx + vortex.velocity.y
      } else {
        vx = dy + vortex.velocity.x
        vy = -dx + vortex.velocity.y
      }

      factor = 1 / (1 + (dx * dx + dy * dy) / (this.vortexOrgSize * Math.max(vortex.size.x || 0, 1e-3)))
    } else if (this.effect === 2) {
      vx = dx + vortex.velocity.x
      vy = dy + vortex.velocity.y

      factor = 1 / (1 + (dx * dx + dy * dy) / (this.vortexOrgSize * Math.max(vortex.size.x || 0, 1e-3)))
    } else if (this.effect === 3) {
      vx = dx - vortex.velocity.x
      vy = dy - vortex.velocity.y

      factor = 1 / (1 + (dx * dx + dy * dy) / (this.vortexOrgSize * Math.max(vortex.size.x || 0, 1e-3)))
    } else if (this.effect === 4) {
      vx = -dx + vortex.velocity.x
      vy = -dy + vortex.velocity.y

      factor = 1 / (1 + (dx * dx + dy * dy) / (this.vortexOrgSize * Math.max(vortex.size.x || 0, 1e-3)))
    } else if (this.effect === 5) {
      vx = -dx - vortex.velocity.x
      vy = -dy - vortex.velocity.y

      factor = 1 / (1 + (dx * dx + dy * dy) / (this.vortexOrgSize * Math.max(vortex.size.x || 0, 1e-3)))
    }

    particle.velocity.x += (vx - particle.velocity.x) * factor
    particle.velocity.y += (vy - particle.velocity.y) * factor
  }

  apply = (particle: Particle, _deltaTime?: number, model?: Model) => {
    if (!this.enabled) return
    if (particle.turbulence) return
    let pool: List | undefined = this.turbulencePool?.list
    if (!pool) {
      const resolved = resolveEmitterTurbulencePool(model)
      if (resolved) {
        this.turbulencePool = resolved
        pool = resolved.list
      }
    }
    if (!pool) return

    if (this.turbGridValid && this.turbGrid.size > 0) {
      this.forEachNearbyVortex(particle.x, particle.y, (vortex: Particle) => {
        this.applyVortex(particle, vortex)
      })
    } else {
      pool.forEach((vortex: Particle) => {
        this.applyVortex(particle, vortex)
      })
    }
  }

  getName() {
    return BehaviourNames.TURBULENCE_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      position: {
        x: this.position.x,
        y: this.position.y,
      },
      positionVariance: {
        x: this.positionVariance.x,
        y: this.positionVariance.y,
      },
      velocity: {
        x: this.velocity.x,
        y: this.velocity.y,
      },
      velocityVariance: {
        x: this.velocityVariance.x,
        y: this.velocityVariance.y,
      },
      acceleration: {
        x: this.acceleration.x,
        y: this.acceleration.y,
      },
      accelerationVariance: {
        x: this.accelerationVariance.x,
        y: this.accelerationVariance.y,
      },
      sizeStart: {
        x: this.sizeStart.x,
        y: this.sizeStart.y,
      },
      sizeEnd: {
        x: this.sizeEnd.x,
        y: this.sizeEnd.y,
      },
      startVariance: this.startVariance,
      endVariance: this.endVariance,
      emitPerSecond: this.emitPerSecond,
      duration: this.duration,
      maxLifeTime: this.maxLifeTime,
      effect: this.effect,
      name: this.getName(),
    }
  }
}
