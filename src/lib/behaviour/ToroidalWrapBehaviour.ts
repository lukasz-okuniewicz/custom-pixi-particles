import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'
import type Model from '../Model'
import {
  getToroidalEdgeExtents,
  resolveToroidalBounds,
  wrapToroidalAxis,
} from '../util/toroidalWrapExtents'

/**
 * Toroidal screen/world wrap: particles that fully leave an axis-aligned rectangle
 * re-enter on the opposite side while still fully outside the view (no visible jump).
 * Renderers hide sprites that do not overlap the viewport so teleports are never seen.
 */
export default class ToroidalWrapBehaviour extends Behaviour {
  enabled = true
  priority = 45

  wrapX = true
  wrapY = true
  useCanvasBounds = false

  minX = -400
  maxX = 400
  minY = -300
  maxY = 300
  inset = 0

  private _insideX = new Map<number, boolean>()
  private _insideY = new Map<number, boolean>()
  private _handledVisibilityResumeGeneration = -1

  init = (particle: Particle, _model: Model, _turbulencePool: unknown) => {
    this._insideX.delete(particle.uid)
    this._insideY.delete(particle.uid)
  }

  onParticleRemoved = (particle: Particle) => {
    this._insideX.delete(particle.uid)
    this._insideY.delete(particle.uid)
  }

  apply = (particle: Particle, _deltaTime: number, model: Model) => {
    if (!this.enabled) return

    const resumeGeneration = model.visibilityResumeGeneration ?? 0
    if (resumeGeneration > this._handledVisibilityResumeGeneration) {
      this._handledVisibilityResumeGeneration = resumeGeneration
      this._insideX.clear()
      this._insideY.clear()
    }

    const bounds = resolveToroidalBounds(this, model.toroidalCanvasBounds)
    if (!bounds) return

    const extents = getToroidalEdgeExtents(particle)
    const renderOffsetX = particle.x - particle.movement.x
    const renderOffsetY = particle.y - particle.movement.y
    let visualX = particle.movement.x + renderOffsetX
    let visualY = particle.movement.y + renderOffsetY
    let mx = particle.movement.x
    let my = particle.movement.y

    if (this.wrapX) {
      const wrapped = wrapToroidalAxis(
        visualX,
        mx,
        bounds.minX,
        bounds.maxX,
        extents.left,
        extents.right,
        this._insideX.get(particle.uid),
      )
      visualX = wrapped.position
      mx = wrapped.movement
      this._insideX.set(particle.uid, wrapped.inside)
      if (wrapped.didWrap) {
        ;(particle as { _toroidalJustWrapped?: boolean })._toroidalJustWrapped = true
      }
    }

    if (this.wrapY) {
      const wrapped = wrapToroidalAxis(
        visualY,
        my,
        bounds.minY,
        bounds.maxY,
        extents.top,
        extents.bottom,
        this._insideY.get(particle.uid),
      )
      visualY = wrapped.position
      my = wrapped.movement
      this._insideY.set(particle.uid, wrapped.inside)
      if (wrapped.didWrap) {
        ;(particle as { _toroidalJustWrapped?: boolean })._toroidalJustWrapped = true
      }
    }

    particle.movement.x = mx
    particle.movement.y = my
    particle.x = visualX
    particle.y = visualY
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
