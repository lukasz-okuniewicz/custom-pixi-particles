import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'
import type Model from '../Model'
import {
  getToroidalEdgeExtents,
  resolveToroidalBounds,
  wrapToroidalAxis,
} from '../util/toroidalWrapExtents'
import {
  shouldStartToroidalFadeOnAxis,
  toroidalFadeDelta,
  type ToroidalWrapFadePhase,
} from '../util/toroidalWrapFade'

/**
 * Toroidal screen/world wrap: particles that fully leave an axis-aligned rectangle
 * re-enter on the opposite side while still fully outside the view (no visible jump).
 * Renderers hide sprites that do not overlap the viewport so teleports are never seen.
 *
 * Optional {@link wrapFadeEnabled}: fade alpha to 0 before teleport, then back to 1 after.
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

  /** Fade alpha out before wrap and back in after teleport at the same rate. */
  wrapFadeEnabled = false
  /** Seconds for a full 0↔1 alpha transition (out and in use the same duration). */
  wrapFadeDuration = 0.25

  private _insideX = new Map<number, boolean>()
  private _insideY = new Map<number, boolean>()
  private _handledVisibilityResumeGeneration = -1
  private _fadePhase = new Map<number, ToroidalWrapFadePhase>()
  private _fadeMult = new Map<number, number>()

  init = (particle: Particle, _model: Model, _turbulencePool: unknown) => {
    this.clearParticleState(particle.uid)
  }

  onParticleRemoved = (particle: Particle) => {
    this.clearParticleState(particle.uid)
  }

  getWrapFadeMultiplier(particle: Particle): number {
    if (!this.wrapFadeEnabled) return 1
    return this._fadeMult.get(particle.uid) ?? 1
  }

  isWrapFadeActive(particle: Particle): boolean {
    if (!this.wrapFadeEnabled) return false
    return (this._fadePhase.get(particle.uid) ?? 'idle') !== 'idle'
  }

  private clearParticleState(uid: number) {
    this._insideX.delete(uid)
    this._insideY.delete(uid)
    this._fadePhase.delete(uid)
    this._fadeMult.delete(uid)
  }

  private clearFadeState() {
    this._fadePhase.clear()
    this._fadeMult.clear()
  }

  private startWrapFadeIn(uid: number) {
    this._fadePhase.set(uid, 'in')
    this._fadeMult.set(uid, 0)
  }

  apply = (particle: Particle, deltaTime: number, model: Model) => {
    if (!this.enabled) return

    const resumeGeneration = model.visibilityResumeGeneration ?? 0
    if (resumeGeneration > this._handledVisibilityResumeGeneration) {
      this._handledVisibilityResumeGeneration = resumeGeneration
      this._insideX.clear()
      this._insideY.clear()
      this.clearFadeState()
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

    const uid = particle.uid
    let phase = this._fadePhase.get(uid) ?? 'idle'
    let fadeMult = this._fadeMult.get(uid) ?? 1
    let didWrap = false

    if (this.wrapFadeEnabled) {
      const fadeStep = toroidalFadeDelta(deltaTime, this.wrapFadeDuration)

      if (phase === 'idle') {
        const startX =
          this.wrapX &&
          shouldStartToroidalFadeOnAxis(
            visualX,
            particle.velocity.x,
            bounds.minX,
            bounds.maxX,
            extents.left,
            extents.right,
            this._insideX.get(uid),
            this.wrapFadeDuration,
          )
        const startY =
          this.wrapY &&
          shouldStartToroidalFadeOnAxis(
            visualY,
            particle.velocity.y,
            bounds.minY,
            bounds.maxY,
            extents.top,
            extents.bottom,
            this._insideY.get(uid),
            this.wrapFadeDuration,
          )
        if (startX || startY) {
          phase = 'out'
          fadeMult = 1
          this._fadePhase.set(uid, 'out')
          this._fadeMult.set(uid, 1)
        }
      }

      if (phase === 'out') {
        fadeMult = Math.max(0, fadeMult - fadeStep)
        this._fadeMult.set(uid, fadeMult)
      } else if (phase === 'in') {
        fadeMult = Math.min(1, fadeMult + fadeStep)
        this._fadeMult.set(uid, fadeMult)
        if (fadeMult >= 1) {
          phase = 'idle'
          fadeMult = 1
          this._fadePhase.set(uid, 'idle')
          this._fadeMult.set(uid, 1)
        }
      }
    }

    const deferWrap = this.wrapFadeEnabled && phase === 'out' && fadeMult > 0

    if (this.wrapX) {
      const wrapped = wrapToroidalAxis(
        visualX,
        mx,
        bounds.minX,
        bounds.maxX,
        extents.left,
        extents.right,
        this._insideX.get(uid),
      )

      if (wrapped.didWrap && deferWrap) {
        // Wait until fade completes.
      } else {
        if (wrapped.didWrap) {
          didWrap = true
          if (this.wrapFadeEnabled && phase === 'out') {
            phase = 'in'
            fadeMult = 0
            this.startWrapFadeIn(uid)
          }
        }
        visualX = wrapped.position
        mx = wrapped.movement
        this._insideX.set(uid, wrapped.inside)
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
        this._insideY.get(uid),
      )

      if (wrapped.didWrap && deferWrap) {
        // Wait until fade completes.
      } else {
        if (wrapped.didWrap) {
          didWrap = true
          if (this.wrapFadeEnabled && phase === 'out') {
            phase = 'in'
            fadeMult = 0
            this.startWrapFadeIn(uid)
          }
        }
        visualY = wrapped.position
        my = wrapped.movement
        this._insideY.set(uid, wrapped.inside)
      }
    }

    if (didWrap) {
      ;(particle as { _toroidalJustWrapped?: boolean })._toroidalJustWrapped = true
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
      wrapFadeEnabled: this.wrapFadeEnabled,
      wrapFadeDuration: this.wrapFadeDuration,
      name: this.getName(),
    }
  }
}
