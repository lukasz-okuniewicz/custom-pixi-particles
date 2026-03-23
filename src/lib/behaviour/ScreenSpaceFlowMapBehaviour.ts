import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'
import type Model from '../Model'
import type TurbulencePool from '../util/turbulencePool'

/**
 * Sample velocity from a CPU grid [vx,vy] pairs in world bounds (GPU flow-map friendly data).
 * flowData: flat array [vx00, vy00, vx10, vy10, ...] row-major width x height.
 */
export default class ScreenSpaceFlowMapBehaviour extends Behaviour {
  enabled = true
  priority = 302

  gridWidth = 8
  gridHeight = 8
  /** world AABB */
  worldMinX = -400
  worldMinY = -300
  worldMaxX = 400
  worldMaxY = 300
  flowData: number[] = []
  strength = 1
  bilinear = true

  init(_particle: Particle, _model: Model, _turbulencePool: TurbulencePool) {}

  private sample(px: number, py: number): { vx: number; vy: number } {
    const gw = Math.max(1, this.gridWidth | 0)
    const gh = Math.max(1, this.gridHeight | 0)
    const len = gw * gh * 2
    if (this.flowData.length < len) {
      return { vx: 0, vy: 0 }
    }
    const nx = (px - this.worldMinX) / Math.max(1e-6, this.worldMaxX - this.worldMinX)
    const ny = (py - this.worldMinY) / Math.max(1e-6, this.worldMaxY - this.worldMinY)
    const fx = nx * (gw - 1)
    const fy = ny * (gh - 1)
    if (!this.bilinear) {
      const ix = Math.min(gw - 1, Math.max(0, Math.round(fx)))
      const iy = Math.min(gh - 1, Math.max(0, Math.round(fy)))
      const idx = (iy * gw + ix) * 2
      return { vx: this.flowData[idx], vy: this.flowData[idx + 1] }
    }
    const x0 = Math.floor(fx)
    const y0 = Math.floor(fy)
    const x1 = Math.min(gw - 1, x0 + 1)
    const y1 = Math.min(gh - 1, y0 + 1)
    const tx = fx - x0
    const ty = fy - y0
    const i00 = (y0 * gw + x0) * 2
    const i10 = (y0 * gw + x1) * 2
    const i01 = (y1 * gw + x0) * 2
    const i11 = (y1 * gw + x1) * 2
    const vx00 = this.flowData[i00]
    const vy00 = this.flowData[i00 + 1]
    const vx10 = this.flowData[i10]
    const vy10 = this.flowData[i10 + 1]
    const vx01 = this.flowData[i01]
    const vy01 = this.flowData[i01 + 1]
    const vx11 = this.flowData[i11]
    const vy11 = this.flowData[i11 + 1]
    const vx = vx00 * (1 - tx) * (1 - ty) + vx10 * tx * (1 - ty) + vx01 * (1 - tx) * ty + vx11 * tx * ty
    const vy = vy00 * (1 - tx) * (1 - ty) + vy10 * tx * (1 - ty) + vy01 * (1 - tx) * ty + vy11 * tx * ty
    return { vx, vy }
  }

  apply(particle: Particle, deltaTime: number, _model: Model) {
    if (!this.enabled || particle.skipPositionBehaviour) return

    const { vx, vy } = this.sample(particle.movement.x, particle.movement.y)
    particle.velocity.x += vx * this.strength * deltaTime
    particle.velocity.y += vy * this.strength * deltaTime
  }

  getName() {
    return BehaviourNames.SCREEN_SPACE_FLOW_MAP_BEHAVIOUR
  }

  getProps(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      priority: this.priority,
      gridWidth: this.gridWidth,
      gridHeight: this.gridHeight,
      worldMinX: this.worldMinX,
      worldMinY: this.worldMinY,
      worldMaxX: this.worldMaxX,
      worldMaxY: this.worldMaxY,
      flowData: [...this.flowData],
      strength: this.strength,
      bilinear: this.bilinear,
      name: this.getName(),
    }
  }
}
