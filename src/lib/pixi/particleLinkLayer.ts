// tslint:disable:prefer-for-of
import type { BLEND_MODES, Graphics } from 'pixi.js'
import type Particle from '../Particle'
import type List from '../util/List'
import { spatialCellKey } from '../util/spatialCellKey'

/**
 * Settings for drawing proximity links between particles (Particle Love–style mesh).
 */
export interface IParticleLinkSettings {
  enabled: boolean
  /** Max distance (px) for a link */
  maxDistance: number
  /** Max outgoing links per particle (to closest neighbors above this particle's uid) */
  maxLinksPerParticle: number
  lineWidth: number
  /** Base line alpha (multiplied by distance fade when enabled) */
  lineAlpha: number
  /** Stroke color when useParticleTint is false */
  lineColor: number
  /** Average lineColor with particle tint at both ends */
  useParticleTint: boolean
  /** Fade alpha by distance (1 at 0, 0 at maxDistance) */
  fadeByDistance: boolean
  /** 1 = every frame; 2 = half rate (lower CPU) */
  updateEveryNFrames: number
  /** Blend mode for the link Graphics (Pixi enum number or JSON string e.g. `"screen"`) */
  blendMode?: BLEND_MODES | string
}

export const PARTICLE_LINK_DEFAULTS: IParticleLinkSettings = {
  enabled: true,
  maxDistance: 88,
  maxLinksPerParticle: 4,
  lineWidth: 1,
  lineAlpha: 0.38,
  lineColor: 0x88ccff,
  useParticleTint: false,
  fadeByDistance: true,
  updateEveryNFrames: 2,
}

export function mergeParticleLinkSettings(
  partial?: Partial<IParticleLinkSettings> | null,
): IParticleLinkSettings {
  if (!partial) return { ...PARTICLE_LINK_DEFAULTS }
  return {
    ...PARTICLE_LINK_DEFAULTS,
    ...partial,
    enabled: partial.enabled !== false,
  }
}

function blendRgb(a: number, b: number): number {
  const ar = (a >> 16) & 0xff
  const ag = (a >> 8) & 0xff
  const ab = a & 0xff
  const br = (b >> 16) & 0xff
  const bg = (b >> 8) & 0xff
  const bb = b & 0xff
  const r = (ar + br) >> 1
  const g = (ag + bg) >> 1
  const bl = (ab + bb) >> 1
  return (r << 16) | (g << 8) | bl
}

type LinkCand = { q: Particle; d2: number }

const linkDrawScratch = {
  particles: [] as Particle[],
  grid: new Map<number, Particle[]>(),
  cellPool: [] as Particle[][],
  candidates: [] as LinkCand[],
}

const MAX_POOLED_CELLS = 2048

function borrowCell(): Particle[] {
  return linkDrawScratch.cellPool.pop() ?? []
}

function recycleGrid(grid: Map<number, Particle[]>) {
  grid.forEach((cell) => {
    cell.length = 0
    if (linkDrawScratch.cellPool.length < MAX_POOLED_CELLS) {
      linkDrawScratch.cellPool.push(cell)
    }
  })
  grid.clear()
}

/**
 * Draws line segments between nearby particles using a uniform grid for O(n·k) neighbor checks.
 */
export function drawParticleLinks(
  graphics: Graphics,
  list: List,
  settings: IParticleLinkSettings,
): void {
  graphics.clear()

  if (!settings.enabled || list.length < 2) return

  const maxD = settings.maxDistance
  const maxD2 = maxD * maxD
  const cellSize = Math.max(1, maxD)
  const K = settings.maxLinksPerParticle

  const particles = linkDrawScratch.particles
  particles.length = 0
  list.forEach((p: Particle) => particles.push(p))

  const grid = linkDrawScratch.grid
  recycleGrid(grid)

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i]
    const x = p.x
    const y = p.y
    const cx = Math.floor(x / cellSize)
    const cy = Math.floor(y / cellSize)
    const key = spatialCellKey(cx, cy)
    let cell = grid.get(key)
    if (!cell) {
      cell = borrowCell()
      grid.set(key, cell)
    }
    cell.push(p)
  }

  const candidates = linkDrawScratch.candidates

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i]
    const px = p.x
    const py = p.y
    const pcx = Math.floor(px / cellSize)
    const pcy = Math.floor(py / cellSize)

    candidates.length = 0

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const cell = grid.get(spatialCellKey(pcx + dx, pcy + dy))
        if (!cell) continue
        for (let j = 0; j < cell.length; j++) {
          const q = cell[j]
          if (q.uid <= p.uid) continue
          const qx = q.x
          const qy = q.y
          const ddx = qx - px
          const ddy = qy - py
          const d2 = ddx * ddx + ddy * ddy
          if (d2 > 0 && d2 <= maxD2) {
            candidates.push({ q, d2 })
          }
        }
      }
    }

    candidates.sort((a, b) => a.d2 - b.d2)
    const n = Math.min(K, candidates.length)
    for (let c = 0; c < n; c++) {
      const { q, d2 } = candidates[c]
      const qx = q.x
      const qy = q.y
      let alpha = settings.lineAlpha
      if (settings.fadeByDistance) {
        const d = Math.sqrt(d2)
        alpha *= 1 - d / maxD
      }
      let color = settings.lineColor
      if (settings.useParticleTint) {
        color = blendRgb(p.color.hex, q.color.hex)
      }

      const a = Math.max(0, Math.min(1, alpha))
      graphics.lineStyle(settings.lineWidth, color, a)
      graphics.moveTo(px, py)
      graphics.lineTo(qx, qy)
    }
  }
}
