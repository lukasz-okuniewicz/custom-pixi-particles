export default class Model {
  reactiveSignals: {
    beat: number
    energy: number
    loudness: number
    onset: number
    flux: number
    lowBand: number
    midBand: number
    highBand: number
    pulsePhase: number
    beatPhase: number
    phase1x: number
    phase2x: number
    phase4x: number
    source: 'none' | 'soundReactive' | 'pulse' | 'beatPhaseLock' | 'mixed'
    /** Optional debug info emitted by behaviours for UI/inspector overlays. */
    debug?: any
    raw: {
      soundReactive: { energy: number; lowBand: number; midBand: number; highBand: number; beat: number }
      pulse: { energy: number; pulsePhase: number }
      beatPhaseLock: { beat: number; beatPhase: number }
    }
  } = {
    beat: 0,
    energy: 0,
    loudness: 0,
    onset: 0,
    flux: 0,
    lowBand: 0,
    midBand: 0,
    highBand: 0,
    pulsePhase: 0,
    beatPhase: 0,
    phase1x: 0,
    phase2x: 0,
    phase4x: 0,
    source: 'none',
    raw: {
      soundReactive: { energy: 0, lowBand: 0, midBand: 0, highBand: 0, beat: 0 },
      pulse: { energy: 0, pulsePhase: 0 },
      beatPhaseLock: { beat: 0, beatPhase: 0 },
    },
  }
  /**
   * Runtime emitter reference used by advanced behaviours that spawn child particles.
   */
  emitter: any = null

  /**
   * Refreshed each frame by Renderer/TestRenderer when ToroidalWrapBehaviour uses canvas bounds.
   * Particle space origin at emitter center; half-width = width/2 (matches Pixi render buffer).
   */
  toroidalCanvasBounds: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  } | null = null

  /**
   * Last pointer position in particle space (same coordinates as SpawnBehaviour custom points).
   * Updated by Renderer.updatePosition when the host passes cursor/follow-mouse updates.
   */
  pointerWorld: { x: number; y: number } | null = null

  /** Sets {@link toroidalCanvasBounds} from render buffer size (centered rect). */
  setToroidalCanvasBoundsFromSize(width: number, height: number) {
    const hw = width / 2
    const hh = height / 2
    this.toroidalCanvasBounds = { minX: -hw, maxX: hw, minY: -hh, maxY: hh }
  }

  clearToroidalCanvasBounds() {
    this.toroidalCanvasBounds = null
  }

  resetReactiveSignals() {
    this.reactiveSignals.beat = 0
    this.reactiveSignals.energy = 0
    this.reactiveSignals.loudness = 0
    this.reactiveSignals.onset = 0
    this.reactiveSignals.flux = 0
    this.reactiveSignals.lowBand = 0
    this.reactiveSignals.midBand = 0
    this.reactiveSignals.highBand = 0
    this.reactiveSignals.pulsePhase = 0
    this.reactiveSignals.beatPhase = 0
    this.reactiveSignals.phase1x = 0
    this.reactiveSignals.phase2x = 0
    this.reactiveSignals.phase4x = 0
    this.reactiveSignals.source = 'none'
    if (this.reactiveSignals.debug) this.reactiveSignals.debug = null
    this.reactiveSignals.raw.soundReactive.energy = 0
    this.reactiveSignals.raw.soundReactive.lowBand = 0
    this.reactiveSignals.raw.soundReactive.midBand = 0
    this.reactiveSignals.raw.soundReactive.highBand = 0
    this.reactiveSignals.raw.soundReactive.beat = 0
    this.reactiveSignals.raw.pulse.energy = 0
    this.reactiveSignals.raw.pulse.pulsePhase = 0
    this.reactiveSignals.raw.beatPhaseLock.beat = 0
    this.reactiveSignals.raw.beatPhaseLock.beatPhase = 0
  }
}
