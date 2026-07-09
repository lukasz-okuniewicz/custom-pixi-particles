import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'
import type Model from '../Model'
import type TurbulencePool from '../util/turbulencePool'
import { getToroidalEdgeExtents, wrapToroidalAxis } from '../util/toroidalWrapExtents'

/**
 * Toroidal screen/world wrap: particles that fully leave an axis-aligned rectangle
 * re-enter on the opposite side while still fully outside the view (no visible jump).
 * Uses sprite bounds when available; falls back to particle size. Runs after
 * {@link PositionBehaviour} (lower priority). Syncs {@link Particle.movement} with
 * wrapped {@link Particle.x}/{@link Particle.y} (same pattern as {@link BounceBehaviour}).
 * Do not combine with bounce on the same axis.
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

    const extents = getToroidalEdgeExtents(particle)
    let x = particle.x
    let y = particle.y
    let mx = particle.movement.x
    let my = particle.movement.y

    if (this.wrapX && maxX > minX) {
      const wrapped = wrapToroidalAxis(
        x,
        mx,
        minX,
        maxX,
        extents.left,
        extents.right,
        particle.velocity.x,
      )
      x = wrapped.position
      mx = wrapped.movement
    }

    if (this.wrapY && maxY > minY) {
      const wrapped = wrapToroidalAxis(
        y,
        my,
        minY,
        maxY,
        extents.top,
        extents.bottom,
        particle.velocity.y,
      )
      y = wrapped.position
      my = wrapped.movement
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
