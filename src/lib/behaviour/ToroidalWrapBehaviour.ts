import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'
import type Model from '../Model'
import type TurbulencePool from '../util/turbulencePool'

/**
 * Toroidal screen/world wrap: particles that leave an axis-aligned rectangle
 * re-enter on the opposite side. Runs after {@link PositionBehaviour} (lower priority).
 * Syncs {@link Particle.movement} with wrapped {@link Particle.x}/{@link Particle.y}
 * (same pattern as {@link BounceBehaviour}). Do not combine with bounce on the same axis.
 */
export default class ToroidalWrapBehaviour extends Behaviour {
  enabled = true
  priority = 45

  wrapX = true
  wrapY = true

  /**
   * When true, bounds come from {@link Model.toroidalCanvasBounds} (set each frame from
   * `canvasSizeProvider` / renderer size). Manual min/max are ignored until turned off.
   */
  useCanvasBounds = false

  minX = -400
  maxX = 400
  minY = -300
  maxY = 300

  /** Shrinks the effective wrap rect inward (helps large sprites). */
  inset = 0

  init = (_particle: Particle, _model: Model, _turbulencePool: TurbulencePool) => {
    //
  }

  apply = (particle: Particle, _deltaTime: number, model: Model) => {
    if (!this.enabled) return

    const fromCanvas = this.useCanvasBounds && model.toroidalCanvasBounds
    const base = fromCanvas ? model.toroidalCanvasBounds! : { minX: this.minX, maxX: this.maxX, minY: this.minY, maxY: this.maxY }

    const minX = base.minX + this.inset
    const maxX = base.maxX - this.inset
    const minY = base.minY + this.inset
    const maxY = base.maxY - this.inset

    let x = particle.x
    let y = particle.y
    let mx = particle.movement.x
    let my = particle.movement.y

    if (this.wrapX) {
      const w = maxX - minX
      if (w > 0) {
        while (x < minX) {
          x += w
          mx += w
        }
        while (x > maxX) {
          x -= w
          mx -= w
        }
      }
    }

    if (this.wrapY) {
      const h = maxY - minY
      if (h > 0) {
        while (y < minY) {
          y += h
          my += h
        }
        while (y > maxY) {
          y -= h
          my -= h
        }
      }
    }

    particle.x = x
    particle.y = y
    particle.movement.x = mx
    particle.movement.y = my
  }

  getName() {
    return BehaviourNames.TOROIDAL_WRAP_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      wrapX: this.wrapX,
      wrapY: this.wrapY,
      useCanvasBounds: this.useCanvasBounds,
      minX: this.minX,
      maxX: this.maxX,
      minY: this.minY,
      maxY: this.maxY,
      inset: this.inset,
      name: this.getName(),
    }
  }
}
