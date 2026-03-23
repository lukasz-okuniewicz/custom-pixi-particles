import type { Graphics } from 'pixi.js'
import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'
import type Model from '../Model'
import type PositionBehaviour from './PositionBehaviour'
import { Point, Random } from '../util'
import {
  assignByPolarAngleTargetIndices,
  assignGreedyNearestTargetIndices,
  assignHungarianTargetIndices,
  assignPathOrderTargetIndices,
  blendMorphedPresets,
  buildPresetShape,
  extractSvgPathDFromMarkup,
  flattenSvgPathToPoints,
  matchPointsToCount,
  matchSamplesToCount,
  normalizePointsToBounds,
  rasterizeTextToPoints,
  replicatePointsByWeights,
  resampleToCount,
  sampleMorphKeyframes,
  seededUnit,
  shuffledIndices,
  type MorphKeyframe,
  type PointRgb,
  type PresetShapeParams,
  type PresetShapeType,
} from '../util/formPatternSampling'

export type FormPatternMode =
  | 'bakedPoints'
  | 'presetShape'
  | 'runtimeText'
  | 'svgPath'
  | 'imageBitmap'
  | 'bakedFrames'
export type FormPatternProgressMode = 'distance' | 'lifetime'
export type FormPatternAssignmentMode =
  | 'stable'
  | 'random'
  | 'angle'
  | 'greedy'
  | 'optimal'
  | 'pathOrder'
export type FormPatternPathVarietySeedMode = 'particleUid' | 'deterministic'
export type FormPatternVisualModulation = 'none' | 'alpha' | 'scale' | 'both'
export type FormPatternBakedPolylineMode = 'cloud' | 'polyline'
export type FormPatternImageFitMode = 'none' | 'contain' | 'cover' | 'stretch'
export type FormPatternImageSamplingMode = 'fill' | 'edges' | 'hybrid'
export type FormPatternImageColorMode = 'raw' | 'quantized' | 'paletteMapped' | 'lumaOnly'
export type FormPatternImageEdgeDetector = 'alphaContour' | 'lumaSobel'
export type FormPatternImageColorSpace = 'rgb' | 'hsv'
export type FormPatternImageMaskMode = 'alpha' | 'luma' | 'hueRange'
export type FormPatternImageDebugOverlayMode = 'off' | 'samples' | 'edges' | 'alphaMask'
export type FormPatternPathKind =
  | 'linear'
  | 'sinusoidal'
  | 'noise'
  | 'arc'
  | 'spiral'
  | 'cubic'
  | 'springSeek'
export type FormPatternSinePhaseMode = 'shared' | 'perParticle'
/** Stagger delay ordering along the emitter particle list (sorted by uid) */
export type FormPatternStaggerOrder = 'random' | 'index' | 'angle'

/**
 * Drives each particle toward a unique point on a pattern (shape, baked points, or rasterized text).
 * Mutually exclusive with MoveToPointBehaviour for predictable end positions.
 */
export default class FormPatternBehaviour extends Behaviour {
  enabled = true
  active = false
  priority = -10

  patternMode: FormPatternMode = 'presetShape'
  /** Baked point cloud or polyline in local space (before center/scale/rotation) */
  points: { x: number; y: number }[] = []
  presetShape: PresetShapeType = 'circle'
  presetParams: PresetShapeParams = {}
  runtimeText = ''
  fontFamily = 'sans-serif'
  fontSize = 64
  fontWeight = '400'
  /** Upper bound for text rasterization / resampling */
  pointBudget = 512

  /** SVG path `d` when patternMode is svgPath */
  svgPath = 'M0,-80 L80,80 L-80,80 Z'
  svgPathSegmentsPerCurve = 14

  /** Stroke vs fill when sampling runtimeText */
  textRasterMode: 'fill' | 'stroke' = 'fill'
  textStrokeWidth = 2

  /** bakedPoints: point cloud (match) vs ordered polyline (arc-length resample) */
  bakedPolylineMode: FormPatternBakedPolylineMode = 'cloud'

  center = new Point(0, 0)
  scale = 1
  /** Degrees; converted internally */
  rotation = 0

  speed = 200
  /** 0–1: random speed multiplier spread around 1 */
  speedVariance = 0
  /** Scale speed so all particles use similar time (uses max chord in batch) */
  speedScaleByDistance = false
  progressMode: FormPatternProgressMode = 'distance'

  staggerMin = 0
  staggerMax = 0

  killOnArrival = false
  resetMaxLifeTime = false
  /** Hold at target before kill / release (ms) */
  lingerMs = 0
  arrivalThreshold = 1

  /** Random offset in local pattern space before transform */
  targetJitter = 0
  assignmentMode: FormPatternAssignmentMode = 'stable'
  assignmentSeed = 0
  /** When true, each activation gets a new random assignment (with random mode) */
  shuffleOnEachActivate = false

  pathType: FormPatternPathKind = 'linear'
  sinusoidalAmplitude = 20
  sinusoidalFrequency = 5
  /** shared = global path time; perParticle = uid-based phase offset */
  sinusoidalPhaseMode: FormPatternSinePhaseMode = 'shared'
  noiseAmplitude = 20
  noiseFrequency = 4
  /** Arc bulge: 0 = straight, ± bends perpendicular to chord (factor of chord length) */
  arcBulge = 0
  /** Perpendicular wobble turns along the chord */
  spiralTurns = 0

  pathEasing = 'linear'

  /** Draw target points in the Renderer (debug) */
  showTargetsPreview = false
  /** Draw chords from each particle start to target (debug) */
  showPathPreview = false

  /** When true, center/scale/rotation apply every frame (inverse at assign stores local targets). */
  liveFormationTransform = false

  /** 0–1: blend toward primary preset shape and morphPresetShape */
  morphBlend = 0
  morphPresetShape: PresetShapeType = 'circle'
  morphPresetParams: PresetShapeParams = {}

  /** Data URL or same-origin image URL; async decode — uses cached points when ready */
  imageDataUrl = ''
  /** Optional image frame sequence (data URLs or same-origin URLs); overrides imageDataUrl when non-empty. */
  imageDataUrls: string[] = []
  /** Frame rate for imageDataUrls playback. */
  imageFrameRate = 12
  /** Loop playback for imageDataUrls. */
  imageFrameLoop = true
  /** Ping-pong playback for imageDataUrls (ignores loop=false when multiple frames). */
  imageFramePingPong = false
  imageAlphaThreshold = 128
  /** How image bounds are fit into sampling space before point extraction. */
  imageFitMode: FormPatternImageFitMode = 'contain'
  /** Pixel extraction strategy for imageBitmap. */
  imageSamplingMode: FormPatternImageSamplingMode = 'fill'
  /** When patternMode is imageBitmap, set particle RGB from sampled image pixels at targets */
  imageMatchParticleColors = false
  /**
   * When imageMatchParticleColors is on, snapshot color/colorStart/colorEnd before tint and
   * restore them when Active turns off (or behaviour is disabled).
   */
  imageRestoreOriginalColorOnDeactivate = false
  /**
   * When imageMatchParticleColors: blend from current RGB to image sample over this many ms (0 = instant).
   */
  imageColorBlendDurationMs = 0
  /** raw image RGB, quantized levels, palette mapping, or luminance grayscale */
  imageColorMode: FormPatternImageColorMode = 'raw'
  imageColorSpace: FormPatternImageColorSpace = 'rgb'
  /** Quantization levels per channel when imageColorMode is quantized (2..32 recommended). */
  imageColorQuantizeLevels = 8
  /** 0..1 random color jitter applied after color mapping. */
  imageColorJitter = 0
  /** Comma/newline-separated CSS hex colors for paletteMapped, e.g. "#ff00aa, #00ffd0". */
  imageColorPalette = ''
  /** Relative sampling density multiplier. */
  imageSamplingDensity = 1
  /** Enforce minimum spacing between accepted image samples (0 disables). */
  imageMinPointSpacingPx = 0
  /** Edge extraction thickness in pixels. */
  imageEdgeThickness = 1
  imageEdgeDetector: FormPatternImageEdgeDetector = 'alphaContour'
  imageMaskMode: FormPatternImageMaskMode = 'alpha'
  imageInvertMask = false
  imageMaskLumaThreshold = 0
  imageMaskHueMin = 0
  imageMaskHueMax = 360
  /** Keep sample ordering coherent across image sequence frames. */
  imageTemporalCoherence = true
  /** Blend between current and next image frame targets (0..1). */
  imageFrameBlend = 0
  /** If true, quickly shows coarse samples while refining cache. */
  imageProgressiveRefine = true
  /** Downscale huge images before sampling for predictable perf. */
  imageAutoDownscaleMax = 1024
  imageDebugOverlayMode: FormPatternImageDebugOverlayMode = 'off'

  /** Multi-line / layout for runtimeText */
  textAlign: CanvasTextAlign = 'center'
  textLineHeight = 0

  staggerOrder: FormPatternStaggerOrder = 'random'

  /** 0–1 scales random deviation of arc/spiral/sine/noise per particle */
  pathVariety = 0

  /** Extra cubic Bézier handles (perpendicular to chord, factors of chord length) */
  cubicPerpBulge = 0.25
  /** 1 = symmetric; -1 flips S-curve */
  cubicAsymmetry = 1

  /** springSeek: critical damping ~1 works well */
  springStiffness = 180
  springDamping = 24

  /** 0 = full form motion; 1 = drift with PositionBehaviour velocity this frame */
  physicsBlend = 0

  /** Added to target position each frame (world space), for external/game hooks */
  externalOffsetX = 0
  externalOffsetY = 0

  /**
   * When true, {@link emitterWorldPositionGetter} is added to external offsets each frame
   * (e.g. set {@link Emitter.worldPosition} from your Pixi container).
   */
  followEmitterWorldPosition = false

  /** Shifts normalized progress when progressMode is lifetime */
  lifetimeProgressOffset = 0

  /** Optional raw SVG markup; when set, path `d` is resolved from {@link svgPathElementId} or first path */
  svgSourceMarkup = ''
  /** Pick `<path id="...">` inside {@link svgSourceMarkup} */
  svgPathElementId = ''
  /** Normalize extracted path bbox to ~100px radius (after flatten) */
  svgFitNormalize = false

  /** Named point clouds for quick switching (keys are preset names) */
  bakedPresets: Record<string, { points: { x: number; y: number }[] }> = {}
  /** When non-empty, uses `bakedPresets[bakedPresetName].points` for bakedPoints mode */
  bakedPresetName = ''

  /** Multi-frame baked formations (sprite strip / pre-baked animation) */
  bakedFrames: { x: number; y: number }[][] = []
  /** Current frame index when patternMode is bakedFrames */
  bakedFrameIndex = 0

  /** Per-point weights for bakedPoints (same length as points); higher = more particles */
  pointWeights: number[] = []

  /** Hungarian assignment is O(n³); above this count, greedy is used instead */
  optimalMaxParticles = 256

  morphKeyframes: MorphKeyframe[] = []
  morphTimelinePlay = false
  /** Duration of one morph timeline loop (ms) */
  morphTimelineDurationMs = 5000
  morphTimelineLoop = true
  morphTimelineSpeed = 1
  private morphTimelineElapsedSec = 0

  pathVarietySeedMode: FormPatternPathVarietySeedMode = 'particleUid'

  visualModulation: FormPatternVisualModulation = 'none'
  /** Easing for alpha/scale only (spatial motion still uses pathEasing) */
  visualProgressEasing = 'linear'
  visualAlphaFrom = 0
  visualAlphaTo = 1
  visualScaleFromMul = 0.5
  visualScaleToMul = 1.5

  arrivalOvershootPx = 0
  arrivalOvershootSettleMs = 200

  imageSampleByAlphaWeight = false

  /** 0 = off; scales speed by (1 + audioReactSpeed * level) */
  audioReactSpeed = 0
  /** Adds to morphBlend when audioLevelGetter is set (drives shape; may trigger rebuild) */
  audioReactMorph = 0

  debugLogAssignmentMs = false

  /** Wired by EmitterParser when followEmitterWorldPosition is true */
  emitterWorldPositionGetter: (() => { x: number; y: number } | null) | null = null

  /** Optional 0–1 level (e.g. from AnalyserNode); not serialized */
  audioLevelGetter: (() => number) | null = null

  private _resolvedOffsetX = 0
  private _resolvedOffsetY = 0

  /** Wired by EmitterParser to emitter.list (same pattern as BoidsFlockingBehaviour). */
  particleListGetter: (() => { forEach: (cb: (p: Particle) => void) => void }) | null = null
  /** Wired by EmitterParser so we can re-seed velocity like PositionBehaviour.init when pattern ends. */
  positionBehaviourGetter: (() => PositionBehaviour | null) | null = null

  private _wasActiveLastFrame = false
  private _lastConfigSig = ''
  private _lastParticleCount = -1
  private _cachedRaster: { x: number; y: number }[] = []
  private _lastRasterSig = ''
  private _cachedImagePoints: { x: number; y: number }[] = []
  /** Parallel to _cachedImagePoints when imageMatchParticleColors decoded */
  private _cachedImageRgb: { r: number; g: number; b: number }[] = []
  private _lastImageSig = ''
  private _imageDecodeToken = 0
  private _imageFrameElapsedSec = 0
  private _activeImageSource = ''
  private _activeImageNextSource = ''
  private _activeImageBlendT = 0
  private _activeImageFrameIndex = 0
  private _imageDecodeStatus: 'idle' | 'loading' | 'decoded' | 'error' = 'idle'
  private _imageElementCache = new Map<string, HTMLImageElement>()
  private _imageDataCache = new Map<string, ImageData>()
  private _imageSampleCache = new Map<string, PointRgb[]>()
  private _imageSampleCacheOrder: string[] = []
  private _coarseImageSig = ''
  private _debugImageSamplesWorld: { x: number; y: number; edge: boolean; alpha: number }[] = []
  private _wasParticleActive = new Map<number, boolean>()
  private _activationGeneration = 0
  private _maxChordInBatch = 1
  /** Last world-space targets for preview overlay */
  private _previewTargetsWorld: Point[] = []
  /** Local-space targets (for live transform preview) */
  private _previewLocals: Point[] = []
  /** Start positions for path preview (world) */
  private _previewStartsWorld: Point[] = []

  /** Runtime: added to morphBlend when audioReactMorph + audioLevelGetter */
  private _morphBlendAudio = 0

  init = () => {
    //
  }

  update = (deltaTime: number) => {
    if (!this.enabled || !this.particleListGetter) return

    const active = this.active
    const rising = active && !this._wasActiveLastFrame
    this._wasActiveLastFrame = active

    if (!active) {
      this.morphTimelineElapsedSec = 0
      this._morphBlendAudio = 0
      this._imageFrameElapsedSec = 0
      return
    }
    this._updateActiveImageSource(deltaTime)

    if (this.morphTimelinePlay && this.morphKeyframes.length >= 2) {
      this.morphTimelineElapsedSec += deltaTime * this.morphTimelineSpeed
      const durSec = Math.max(1e-3, this.morphTimelineDurationMs * 0.001)
      let u = this.morphTimelineElapsedSec / durSec
      if (this.morphTimelineLoop) {
        u %= 1
      } else {
        u = Math.min(1, u)
      }
      this.morphBlend = sampleMorphKeyframes(this.morphKeyframes, u)
    }

    if (this.audioLevelGetter && this.audioReactMorph !== 0) {
      const lv = Math.max(0, Math.min(1, this.audioLevelGetter()))
      this._morphBlendAudio = this.audioReactMorph * lv
    } else {
      this._morphBlendAudio = 0
    }

    if (rising && this.shuffleOnEachActivate) {
      this._activationGeneration++
    }

    const particles = this._collectParticlesSorted()
    const n = particles.length
    const sigPattern = this._patternSignature()
    const sigFull = `${sigPattern}|${this._transformSignature()}`
    const sig = this.liveFormationTransform ? sigPattern : sigFull
    const needRebuild = rising || n !== this._lastParticleCount || sig !== this._lastConfigSig

    if (needRebuild && n > 0) {
      const dbg = this.debugLogAssignmentMs && typeof performance !== 'undefined'
      const t0 = dbg ? performance.now() : 0
      const { targets, targetRgb } = this._buildTargetsForCountWithColors(n)
      const { assigned, targetIndex } = this._applyAssignmentWithIndices(particles, targets)
      if (dbg) {
        const ms = performance.now() - t0
        // eslint-disable-next-line no-console
        console.info(`[FormPattern] assignment n=${n} mode=${this.assignmentMode} ${ms.toFixed(2)}ms`)
      }
      let maxChord = 1
      for (let i = 0; i < n; i++) {
        const p = particles[i]
        const dx = assigned[i].x - p.x
        const dy = assigned[i].y - p.y
        maxChord = Math.max(maxChord, Math.sqrt(dx * dx + dy * dy))
      }
      this._maxChordInBatch = maxChord
      for (let i = 0; i < n; i++) {
        const rgb =
          targetRgb && targetIndex[i] !== undefined ? targetRgb[targetIndex[i]] : undefined
        this._assignParticle(particles[i], assigned[i].x, assigned[i].y, i, particles, rgb)
      }
      this._previewTargetsWorld = assigned.map((p) => new Point(p.x, p.y))
      this._previewStartsWorld = particles.map((p) => new Point(p.x, p.y))
      if (this.liveFormationTransform) {
        this._previewLocals = assigned.map((p) => this._worldToLocal(p.x, p.y))
      } else {
        this._previewLocals = []
      }
      this._lastConfigSig = sig
      this._lastParticleCount = n
    } else if (this.active && this.liveFormationTransform && this._previewLocals.length > 0) {
      this._previewTargetsWorld = this._previewLocals.map((l) => this._localToWorld(l.x, l.y))
    }
  }

  apply = (particle: Particle, deltaTime: number, model: Model) => {
    if (!this.enabled) {
      this._restoreParticleColorsIfNeeded(particle)
      this._clearImageColorBlend(particle)
      this._clearParticleTracking(particle)
      return
    }

    const isActive = this.active
    const wasActive = this._wasParticleActive.get(particle.uid) ?? false

    if (!isActive) {
      if (wasActive) {
        this._restoreParticleColorsIfNeeded(particle)
        if (particle.formPatternVisualActive) {
          particle.color.alpha = particle.formPatternVisBaseAlpha
          particle.size.x = particle.formPatternVisBaseSizeX
          particle.size.y = particle.formPatternVisBaseSizeY
          particle.formPatternVisualActive = false
        }
        particle.formPatternAccumulatedLinearDistance = 0
        particle.formPatternTotalDistance = 0
        particle.formPatternPathTime = 0
        particle.formPatternAssigned = false
        particle.formPatternStaggerRemaining = 0
        particle.formPatternSpeedMul = 1
        particle.formPatternSinPhase = 0
        particle.formPatternLingerRemaining = 0
        particle.formPatternLocalX = 0
        particle.formPatternLocalY = 0
        particle.formPatternPathMul = 1
        particle.formPatternSpringVx = 0
        particle.formPatternSpringVy = 0
        particle.formPatternOvershootT = -1
        this._clearImageColorBlend(particle)
        this._reseedPhysicsAfterFormPattern(particle, model)
      }
      this._wasParticleActive.set(particle.uid, false)
      return
    }

    if (!wasActive) {
      this._wasParticleActive.set(particle.uid, true)
    }

    if (!particle.formPatternAssigned) {
      this._ensureParticleAssigned(particle)
    }
    if (!particle.formPatternAssigned) {
      return
    }

    this._updateImageColorBlend(particle, deltaTime)

    this._resolvedOffsetX = this.externalOffsetX
    this._resolvedOffsetY = this.externalOffsetY
    if (this.followEmitterWorldPosition && this.emitterWorldPositionGetter) {
      const wp = this.emitterWorldPositionGetter()
      if (wp) {
        this._resolvedOffsetX += wp.x
        this._resolvedOffsetY += wp.y
      }
    }

    const savedVx = particle.velocity.x
    const savedVy = particle.velocity.y

    if (this.liveFormationTransform) {
      const w = this._localToWorld(particle.formPatternLocalX, particle.formPatternLocalY)
      particle.formPatternTargetX = w.x
      particle.formPatternTargetY = w.y
      const dx = particle.formPatternTargetX - particle.formPatternInitialX
      const dy = particle.formPatternTargetY - particle.formPatternInitialY
      particle.formPatternTotalDistance = Math.max(Math.sqrt(dx * dx + dy * dy), 1e-6)
    }

    particle.velocity.set(0, 0)
    particle.acceleration.set(0, 0)

    if (particle.formPatternLingerRemaining > 0) {
      particle.formPatternLingerRemaining -= deltaTime
      particle.x = particle.formPatternTargetX + this._resolvedOffsetX
      particle.y = particle.formPatternTargetY + this._resolvedOffsetY
      particle.movement.x = particle.x
      particle.movement.y = particle.y
      this._applyVisualModulation(particle, 1)
      if (particle.formPatternLingerRemaining <= 0) {
        particle.formPatternLingerRemaining = 0
        this._finishArrival(particle)
      }
      return
    }

    if (particle.formPatternStaggerRemaining > 0) {
      particle.formPatternStaggerRemaining -= deltaTime
      particle.x = particle.formPatternInitialX
      particle.y = particle.formPatternInitialY
      particle.movement.x = particle.x
      particle.movement.y = particle.y
      this._applyVisualModulation(particle, 0)
      return
    }

    if (particle.formPatternOvershootT >= 0 && this.arrivalOvershootPx > 0) {
      const settle = Math.max(1e-3, this.arrivalOvershootSettleMs * 0.001)
      particle.formPatternOvershootT += deltaTime / settle
      const t = Math.min(1, particle.formPatternOvershootT)
      const ux = particle.formPatternChordUx
      const uy = particle.formPatternChordUy
      const amp = this.arrivalOvershootPx * Math.sin(Math.PI * t)
      particle.x = particle.formPatternTargetX + ux * amp + this._resolvedOffsetX
      particle.y = particle.formPatternTargetY + uy * amp + this._resolvedOffsetY
      particle.movement.x = particle.x
      particle.movement.y = particle.y
      this._applyVisualModulation(particle, 1)
      if (t >= 1) {
        particle.formPatternOvershootT = -1
        particle.x = particle.formPatternTargetX + this._resolvedOffsetX
        particle.y = particle.formPatternTargetY + this._resolvedOffsetY
        this._onReachTarget(particle)
      }
      return
    }

    if (this.pathType === 'springSeek') {
      const tx = particle.formPatternTargetX
      const ty = particle.formPatternTargetY
      const ex = tx - particle.x
      const ey = ty - particle.y
      const dist = Math.sqrt(ex * ex + ey * ey)
      if (dist < this.arrivalThreshold) {
        this._snapArrival(particle)
        return
      }
      const k = this.springStiffness
      const d = this.springDamping
      const ax = k * ex - d * particle.formPatternSpringVx
      const ay = k * ey - d * particle.formPatternSpringVy
      particle.formPatternSpringVx += ax * deltaTime
      particle.formPatternSpringVy += ay * deltaTime
      let nx = particle.x + particle.formPatternSpringVx * deltaTime
      let ny = particle.y + particle.formPatternSpringVy * deltaTime
      const b = Math.max(0, Math.min(1, this.physicsBlend))
      if (b > 0) {
        nx = nx * (1 - b) + (particle.x + savedVx * deltaTime) * b
        ny = ny * (1 - b) + (particle.y + savedVy * deltaTime) * b
      }
      particle.x = nx + this._resolvedOffsetX
      particle.y = ny + this._resolvedOffsetY
      particle.movement.x = particle.x
      particle.movement.y = particle.y
      particle.formPatternPathTime += deltaTime
      const prog = 1 - Math.min(1, dist / Math.max(1e-6, particle.formPatternTotalDistance))
      this._applyVisualModulation(particle, prog)
      return
    }

    if (particle.formPatternTotalDistance < this.arrivalThreshold) {
      this._snapArrival(particle)
      return
    }

    const audioLv = Math.max(0, Math.min(1, this.audioLevelGetter?.() ?? 0))
    const baseSpeed = this.speed * particle.formPatternSpeedMul * (1 + this.audioReactSpeed * audioLv)
    const distScale = this.speedScaleByDistance
      ? this._maxChordInBatch / Math.max(1e-6, particle.formPatternTotalDistance)
      : 1
    const moveAmount = baseSpeed * distScale * deltaTime

    let normalizedProgress: number
    if (this.progressMode === 'lifetime' && particle.maxLifeTime > 0) {
      normalizedProgress = Math.min(
        1,
        Math.max(0, particle.lifeProgress + this.lifetimeProgressOffset),
      )
    } else {
      particle.formPatternAccumulatedLinearDistance += moveAmount
      normalizedProgress =
        particle.formPatternTotalDistance > 0
          ? particle.formPatternAccumulatedLinearDistance / particle.formPatternTotalDistance
          : 1
      normalizedProgress = Math.min(1, normalizedProgress)
    }

    const easedProgress = this._applyEasing(normalizedProgress, this.pathEasing)

    const pos = this._positionOnPath(particle, easedProgress, normalizedProgress, deltaTime)
    let outX = pos.x
    let outY = pos.y
    const pb = Math.max(0, Math.min(1, this.physicsBlend))
    if (pb > 0) {
      outX = outX * (1 - pb) + (particle.x + savedVx * deltaTime) * pb
      outY = outY * (1 - pb) + (particle.y + savedVy * deltaTime) * pb
    }
    particle.x = outX + this._resolvedOffsetX
    particle.y = outY + this._resolvedOffsetY
    particle.formPatternPathTime += deltaTime

    if (normalizedProgress >= 1) {
      particle.x = particle.formPatternTargetX + this._resolvedOffsetX
      particle.y = particle.formPatternTargetY + this._resolvedOffsetY
      particle.formPatternAccumulatedLinearDistance = 0
      particle.formPatternTotalDistance = 0
      particle.formPatternPathTime = 0
      if (this.arrivalOvershootPx > 0) {
        particle.formPatternOvershootT = 0
        this._applyVisualModulation(particle, 1)
        particle.movement.x = particle.x
        particle.movement.y = particle.y
        return
      }
      this._onReachTarget(particle)
    }

    this._applyVisualModulation(particle, normalizedProgress)

    particle.movement.x = particle.x
    particle.movement.y = particle.y
  }

  private _applyVisualModulation(particle: Particle, linearProgress: number) {
    if (this.visualModulation === 'none' || !particle.formPatternVisualActive) return
    const ve = this._applyEasing(Math.max(0, Math.min(1, linearProgress)), this.visualProgressEasing)
    if (this.visualModulation === 'alpha' || this.visualModulation === 'both') {
      const f = this.visualAlphaFrom + (this.visualAlphaTo - this.visualAlphaFrom) * ve
      particle.color.alpha = particle.formPatternVisBaseAlpha * f
    }
    if (this.visualModulation === 'scale' || this.visualModulation === 'both') {
      const sm =
        this.visualScaleFromMul + (this.visualScaleToMul - this.visualScaleFromMul) * ve
      particle.size.x = particle.formPatternVisBaseSizeX * sm
      particle.size.y = particle.formPatternVisBaseSizeY * sm
    }
  }

  draw(graphics: Graphics, _deltaTime: number): void {
    if (!this.enabled || !this.active) {
      graphics.clear()
      return
    }
    const pts = this._previewTargetsWorld
    const showDots = this.showTargetsPreview
    const showPaths = this.showPathPreview
    const showImageDebug = this.patternMode === 'imageBitmap' && this.imageDebugOverlayMode !== 'off'
    if ((!showDots && !showPaths && !showImageDebug) || !pts || pts.length === 0) {
      graphics.clear()
      return
    }
    graphics.clear()
    if (showPaths && this._previewStartsWorld.length === pts.length) {
      for (let i = 0; i < pts.length; i++) {
        const a = this._previewStartsWorld[i]
        const b = pts[i]
        graphics.lineStyle(1, 0x4488ff, 0.45)
        graphics.moveTo(a.x, a.y)
        graphics.lineTo(b.x, b.y)
      }
    }
    if (showDots) {
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]
        graphics.beginFill(0x44ffcc, 0.75)
        graphics.drawCircle(p.x, p.y, 2.5)
        graphics.endFill()
      }
    }
    if (showImageDebug) {
      for (let i = 0; i < this._debugImageSamplesWorld.length; i++) {
        const s = this._debugImageSamplesWorld[i]
        let color = 0xffd166
        let alpha = 0.6
        if (this.imageDebugOverlayMode === 'edges') {
          color = s.edge ? 0xff6677 : 0x666666
          alpha = s.edge ? 0.8 : 0.25
        } else if (this.imageDebugOverlayMode === 'alphaMask') {
          const v = Math.max(0, Math.min(255, Math.round(s.alpha * 255)))
          color = v * 65536 + v * 256 + v
          alpha = 0.75
        }
        graphics.beginFill(color, alpha)
        graphics.drawCircle(s.x, s.y, 1.5)
        graphics.endFill()
      }
    }
  }

  onParticleRemoved = (particle: Particle) => {
    this._wasParticleActive.delete(particle.uid)
  }

  private _clearParticleTracking(particle: Particle) {
    if (this._wasParticleActive.has(particle.uid)) {
      this._wasParticleActive.delete(particle.uid)
    }
  }

  /**
   * FormPattern zeros velocity/acceleration every frame while active. On deactivate, re-sample
   * from PositionBehaviour (same as init) so particles move normally again.
   */
  private _reseedPhysicsAfterFormPattern(particle: Particle, _model: Model) {
    particle.movement.x = particle.x
    particle.movement.y = particle.y

    const pos = this.positionBehaviourGetter?.()
    if (pos && pos.enabled && !particle.skipPositionBehaviour && !pos.fromAtoB) {
      particle.velocity.x = pos.calculate(pos.velocity.x, pos.velocityVariance.x)
      particle.velocity.y = pos.calculate(pos.velocity.y, pos.velocityVariance.y)
      particle.acceleration.x = pos.calculate(pos.acceleration.x, pos.accelerationVariance.x)
      particle.acceleration.y = pos.calculate(pos.acceleration.y, pos.accelerationVariance.y)
      if (pos.sinX) {
        particle.sinXVal.x = pos.calculate(pos.sinXVal.x, pos.sinXValVariance.x)
        particle.sinXVal.y = pos.calculate(pos.sinXVal.y, pos.sinXValVariance.y)
      }
      if (pos.sinY) {
        particle.sinYVal.x = pos.calculate(pos.sinYVal.x, pos.sinYValVariance.x)
        particle.sinYVal.y = pos.calculate(pos.sinYVal.y, pos.sinYValVariance.y)
      }
      return
    }

    const speed = Random.uniform(30, 120)
    const angle = Random.uniform(0, Math.PI * 2)
    particle.velocity.x = Math.cos(angle) * speed
    particle.velocity.y = Math.sin(angle) * speed
    particle.acceleration.set(0, 0)
  }

  private _collectParticlesSorted(): Particle[] {
    const arr: Particle[] = []
    this.particleListGetter?.().forEach((p: Particle) => arr.push(p))
    arr.sort((a, b) => a.uid - b.uid)
    return arr
  }

  private _patternSignature(): string {
    const morph = Math.max(0, Math.min(1, this.morphBlend + this._morphBlendAudio))
    return JSON.stringify({
      patternMode: this.patternMode,
      points: this.points,
      pointWeights: this.pointWeights,
      presetShape: this.presetShape,
      presetParams: this.presetParams,
      morphBlend: morph,
      morphPresetShape: this.morphPresetShape,
      morphPresetParams: this.morphPresetParams,
      runtimeText: this.runtimeText,
      fontFamily: this.fontFamily,
      fontSize: this.fontSize,
      fontWeight: this.fontWeight,
      pointBudget: this.pointBudget,
      svgPath: this.svgPath,
      svgSourceMarkup: this.svgSourceMarkup,
      svgPathElementId: this.svgPathElementId,
      svgFitNormalize: this.svgFitNormalize,
      svgPathSegmentsPerCurve: this.svgPathSegmentsPerCurve,
      textRasterMode: this.textRasterMode,
      textStrokeWidth: this.textStrokeWidth,
      textAlign: this.textAlign,
      textLineHeight: this.textLineHeight,
      bakedPolylineMode: this.bakedPolylineMode,
      bakedPresetName: this.bakedPresetName,
      bakedPresets: this.bakedPresets,
      bakedFrames: this.bakedFrames,
      bakedFrameIndex: this.bakedFrameIndex,
      imageDataUrl: this.imageDataUrl,
      imageDataUrls: this.imageDataUrls,
      imageFrameRate: this.imageFrameRate,
      imageFrameLoop: this.imageFrameLoop,
      imageFramePingPong: this.imageFramePingPong,
      imageAlphaThreshold: this.imageAlphaThreshold,
      imageFitMode: this.imageFitMode,
      imageSamplingMode: this.imageSamplingMode,
      imageMatchParticleColors: this.imageMatchParticleColors,
      imageRestoreOriginalColorOnDeactivate: this.imageRestoreOriginalColorOnDeactivate,
      imageColorBlendDurationMs: this.imageColorBlendDurationMs,
      imageColorMode: this.imageColorMode,
      imageColorSpace: this.imageColorSpace,
      imageColorQuantizeLevels: this.imageColorQuantizeLevels,
      imageColorJitter: this.imageColorJitter,
      imageColorPalette: this.imageColorPalette,
      imageSamplingDensity: this.imageSamplingDensity,
      imageMinPointSpacingPx: this.imageMinPointSpacingPx,
      imageEdgeThickness: this.imageEdgeThickness,
      imageEdgeDetector: this.imageEdgeDetector,
      imageMaskMode: this.imageMaskMode,
      imageInvertMask: this.imageInvertMask,
      imageMaskLumaThreshold: this.imageMaskLumaThreshold,
      imageMaskHueMin: this.imageMaskHueMin,
      imageMaskHueMax: this.imageMaskHueMax,
      imageTemporalCoherence: this.imageTemporalCoherence,
      imageFrameBlend: this.imageFrameBlend,
      imageProgressiveRefine: this.imageProgressiveRefine,
      imageAutoDownscaleMax: this.imageAutoDownscaleMax,
      imageDebugOverlayMode: this.imageDebugOverlayMode,
      imageDecodeStatus: this._imageDecodeStatus,
      imageSampleByAlphaWeight: this.imageSampleByAlphaWeight,
      assignmentMode: this.assignmentMode,
      assignmentSeed: this.assignmentSeed,
      targetJitter: this.targetJitter,
      staggerOrder: this.staggerOrder,
    })
  }

  private _transformSignature(): string {
    return JSON.stringify({
      cx: this.center.x,
      cy: this.center.y,
      scale: this.scale,
      rotation: this.rotation,
    })
  }

  private _localToWorld(lx: number, ly: number): Point {
    const rad = (this.rotation * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const cx = this.center.x
    const cy = this.center.y
    const sc = this.scale
    const sx = lx * sc
    const sy = ly * sc
    const rx = sx * cos - sy * sin
    const ry = sx * sin + sy * cos
    return new Point(rx + cx, ry + cy)
  }

  private _worldToLocal(wx: number, wy: number): Point {
    const dx = wx - this.center.x
    const dy = wy - this.center.y
    const rad = (-this.rotation * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const sc = this.scale || 1
    const rx = dx * cos - dy * sin
    const ry = dx * sin + dy * cos
    return new Point(rx / sc, ry / sc)
  }

  private _buildTargetsForCount(n: number): Point[] {
    const budget = Math.max(8, Math.floor(this.pointBudget))
    let raw = this._buildRawPointsLocal()
    if (raw.length === 0) {
      raw = buildPresetShape('circle', budget, { radius: 80 })
    }
    const transformed = this._transformPoints(raw)
    let out: Point[]
    const useArcLength =
      this.patternMode === 'presetShape' ||
      this.patternMode === 'svgPath' ||
      (this.patternMode === 'bakedPoints' && this.bakedPolylineMode === 'polyline') ||
      (this.patternMode === 'bakedFrames' && this.bakedPolylineMode === 'polyline')
    if (useArcLength) {
      out = resampleToCount(transformed, n)
    } else {
      out = matchPointsToCount(transformed, n)
    }
    if (out.length < n) {
      const pad = resampleToCount(buildPresetShape('circle', budget, { radius: 80 }), n)
      for (let i = out.length; i < n; i++) {
        out.push(new Point(pad[i].x, pad[i].y))
      }
    }
    return out
  }

  private _buildTargetsForCountWithColors(n: number): {
    targets: Point[]
    targetRgb: { r: number; g: number; b: number }[] | null
  } {
    const budget = Math.max(8, Math.floor(this.pointBudget))
    if (
      this.patternMode === 'imageBitmap' &&
      this.imageMatchParticleColors &&
      this._cachedImagePoints.length > 0 &&
      this._cachedImageRgb.length === this._cachedImagePoints.length
    ) {
      const raw: PointRgb[] = this._cachedImagePoints.map((p, i) => ({
        x: p.x,
        y: p.y,
        r: this._cachedImageRgb[i].r,
        g: this._cachedImageRgb[i].g,
        b: this._cachedImageRgb[i].b,
      }))
      const transformed = this._transformPointsWithRgb(raw)
      const matched = matchSamplesToCount(transformed, n)
      if (matched.length < n) {
        const pad = resampleToCount(buildPresetShape('circle', budget, { radius: 80 }), n)
        for (let i = matched.length; i < n; i++) {
          matched.push({
            x: pad[i].x,
            y: pad[i].y,
            r: 200,
            g: 200,
            b: 200,
          })
        }
      }
      return {
        targets: matched.map((p) => new Point(p.x, p.y)),
        targetRgb: matched.map((p) => ({ r: p.r, g: p.g, b: p.b })),
      }
    }
    return { targets: this._buildTargetsForCount(n), targetRgb: null }
  }

  private _transformPointsWithRgb(samples: PointRgb[]): PointRgb[] {
    const rad = (this.rotation * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const cx = this.center.x
    const cy = this.center.y
    const sc = this.scale
    return samples.map((p) => {
      const sx = p.x * sc
      const sy = p.y * sc
      const rx = sx * cos - sy * sin
      const ry = sx * sin + sy * cos
      return { x: rx + cx, y: ry + cy, r: p.r, g: p.g, b: p.b }
    })
  }

  private _buildRawPointsLocal(): Point[] {
    const budget = Math.max(8, Math.floor(this.pointBudget))
    if (this.patternMode === 'bakedFrames') {
      const frames = this.bakedFrames || []
      if (frames.length === 0) {
        return buildPresetShape('circle', budget, { radius: 80 })
      }
      const idx = ((this.bakedFrameIndex % frames.length) + frames.length) % frames.length
      const frame = frames[idx] || []
      const mapped = frame.map((p) => new Point(p.x, p.y))
      if (mapped.length === 0) {
        return buildPresetShape('circle', budget, { radius: 80 })
      }
      return mapped
    }
    if (this.patternMode === 'svgPath') {
      let d = this.svgPath
      if (this.svgSourceMarkup?.trim()) {
        const extracted = extractSvgPathDFromMarkup(this.svgSourceMarkup, this.svgPathElementId || undefined)
        if (extracted?.trim()) d = extracted
      }
      let raw = flattenSvgPathToPoints(d, this.svgPathSegmentsPerCurve)
      if (raw.length === 0) {
        return buildPresetShape('circle', budget, { radius: 80 })
      }
      if (this.svgFitNormalize) {
        raw = normalizePointsToBounds(raw, 100)
      }
      return raw
    }
    if (this.patternMode === 'bakedPoints') {
      let src = this.points || []
      if (this.bakedPresetName?.trim() && this.bakedPresets?.[this.bakedPresetName]?.points?.length) {
        src = this.bakedPresets[this.bakedPresetName].points
      }
      let mapped = src.map((p) => new Point(p.x, p.y))
      if (
        this.pointWeights.length > 0 &&
        this.pointWeights.length === mapped.length &&
        mapped.length > 0
      ) {
        mapped = replicatePointsByWeights(mapped, this.pointWeights)
      }
      if (mapped.length === 0) {
        return buildPresetShape('circle', budget, { radius: 80 })
      }
      return mapped
    }
    if (this.patternMode === 'runtimeText') {
      const sig = `${this.runtimeText}|${this.fontFamily}|${this.fontSize}|${this.fontWeight}|${this.textRasterMode}|${this.textStrokeWidth}|${this.textAlign}|${this.textLineHeight}`
      if (sig !== this._lastRasterSig || this._cachedRaster.length === 0) {
        const pts = rasterizeTextToPoints({
          text: this.runtimeText,
          fontFamily: this.fontFamily,
          fontSize: this.fontSize,
          fontWeight: this.fontWeight,
          maxSamplePixels: Math.min(16000, budget * 4),
          rasterMode: this.textRasterMode,
          strokeWidth: this.textStrokeWidth,
          textAlign: this.textAlign,
          lineHeight: this.textLineHeight > 0 ? this.textLineHeight : undefined,
        })
        this._cachedRaster = pts.map((p) => ({ x: p.x, y: p.y }))
        this._lastRasterSig = sig
      }
      if (this._cachedRaster.length === 0) {
        return buildPresetShape('circle', budget, { radius: 80 })
      }
      return this._cachedRaster.map((p) => new Point(p.x, p.y))
    }
    if (this.patternMode === 'imageBitmap') {
      this._tryDecodeImageToCache(budget)
      if (this._cachedImagePoints.length > 0) {
        return this._cachedImagePoints.map((p) => new Point(p.x, p.y))
      }
      return buildPresetShape('circle', budget, { radius: 80 })
    }
    if (this.patternMode === 'presetShape') {
      const mb = Math.max(0, Math.min(1, this.morphBlend + this._morphBlendAudio))
      if (mb > 1e-6) {
        if (mb >= 1 - 1e-6) {
          return buildPresetShape(this.morphPresetShape, budget, this.morphPresetParams)
        }
        return blendMorphedPresets(
          this.presetShape,
          this.presetParams,
          this.morphPresetShape,
          this.morphPresetParams,
          budget,
          mb,
        )
      }
    }
    return buildPresetShape(this.presetShape, budget, this.presetParams)
  }

  private _tryDecodeImageToCache(budget: number): void {
    const source = this._resolvedImageSource()
    const sig = `${source}|${this.imageAlphaThreshold}|${budget}|${this.imageMatchParticleColors}|${this.imageSampleByAlphaWeight}|${this.imageFitMode}|${this.imageSamplingMode}|${this.imageColorMode}|${this.imageColorSpace}|${this.imageColorQuantizeLevels}|${this.imageColorJitter}|${this.imageColorPalette}|${this.imageSamplingDensity}|${this.imageMinPointSpacingPx}|${this.imageEdgeThickness}|${this.imageEdgeDetector}|${this.imageMaskMode}|${this.imageInvertMask}|${this.imageMaskLumaThreshold}|${this.imageMaskHueMin}|${this.imageMaskHueMax}|${this.imageTemporalCoherence}|${this.imageFrameBlend}|${this.imageAutoDownscaleMax}`
    if (this._lastImageSig === sig && this._cachedImagePoints.length > 0) return
    if (!source.trim()) {
      this._cachedImagePoints = []
      this._cachedImageRgb = []
      this._debugImageSamplesWorld = []
      this._lastImageSig = sig
      this._imageDecodeStatus = 'idle'
      return
    }
    if (typeof document === 'undefined') {
      this._cachedImagePoints = []
      this._cachedImageRgb = []
      this._lastImageSig = sig
      this._imageDecodeStatus = 'error'
      return
    }
    const cachedId = this._imageDataCache.get(source)
    if (cachedId) {
      this._fillImageCacheFromImageData(cachedId, budget, sig)
      this._blendWithNextFrameIfNeeded(budget)
      this._imageDecodeStatus = 'decoded'
      return
    }
    const cachedImg = this._imageElementCache.get(source)
    if (cachedImg?.complete && cachedImg.naturalWidth > 0) {
      this._fillImageCacheFromElement(cachedImg, budget, sig, source)
      this._blendWithNextFrameIfNeeded(budget)
      this._imageDecodeStatus = 'decoded'
      return
    }
    const img = cachedImg ?? new Image()
    if (!cachedImg) {
      img.crossOrigin = 'anonymous'
      this._imageElementCache.set(source, img)
    }
    const token = ++this._imageDecodeToken
    this._imageDecodeStatus = 'loading'
    const finish = () => {
      if (token !== this._imageDecodeToken) return
      this._fillImageCacheFromElement(img, budget, sig, source)
      this._blendWithNextFrameIfNeeded(budget)
      this._imageDecodeStatus = 'decoded'
    }
    img.onload = finish
    img.onerror = () => {
      if (token !== this._imageDecodeToken) return
      this._cachedImagePoints = []
      this._cachedImageRgb = []
      this._lastImageSig = sig
      this._imageDecodeStatus = 'error'
    }
    img.src = source
    if (img.complete && img.naturalWidth > 0) {
      finish()
    }
  }

  private _fillImageCacheFromElement(
    img: HTMLImageElement,
    budget: number,
    sig: string,
    source: string,
  ): void {
    const w = img.naturalWidth
    const h = img.naturalHeight
    if (w <= 0 || h <= 0) {
      this._cachedImagePoints = []
      this._cachedImageRgb = []
      this._debugImageSamplesWorld = []
      this._lastImageSig = sig
      this._lastConfigSig = ''
      return
    }
    const id = this._drawImageToImageData(img)
    if (!id) {
      this._cachedImagePoints = []
      this._cachedImageRgb = []
      this._debugImageSamplesWorld = []
      return
    }
    const maxPx = Math.min(16000, budget * 4)
    this._fillImageCacheFromImageData(id, maxPx, sig)
    this._imageDataCache.set(source, id)
  }

  private _fillImageCacheFromImageData(id: ImageData, maxPx: number, sig: string): void {
    const sampled = this._getCachedOrSampledImagePoints(id, maxPx, sig)
    const coherent =
      this.imageTemporalCoherence && this._cachedImagePoints.length > 0
        ? this._reorderForTemporalCoherence(
            this._cachedImagePoints.map((p, i) => ({
              x: p.x,
              y: p.y,
              r: this._cachedImageRgb[i]?.r ?? 255,
              g: this._cachedImageRgb[i]?.g ?? 255,
              b: this._cachedImageRgb[i]?.b ?? 255,
            })),
            sampled,
          )
        : sampled
    this._cachedImagePoints = coherent.map((p) => ({ x: p.x, y: p.y }))
    this._cachedImageRgb = coherent.map((p) => ({ r: p.r, g: p.g, b: p.b }))
    if (!this.imageMatchParticleColors) {
      this._cachedImageRgb = []
    }
    this._updateDebugOverlayFromSamples(coherent)
    this._lastImageSig = sig
    this._lastConfigSig = ''
  }

  private _drawImageToImageData(img: HTMLImageElement): ImageData | null {
    const w = img.naturalWidth
    const h = img.naturalHeight
    if (w <= 0 || h <= 0) return null
    const fit = this.imageFitMode
    const maxDim = Math.max(8, Math.floor(this.imageAutoDownscaleMax || 1024))
    const srcScale = Math.min(1, maxDim / Math.max(w, h))
    const srcW = Math.max(1, Math.round(w * srcScale))
    const srcH = Math.max(1, Math.round(h * srcScale))
    const target = fit === 'none' ? { w: srcW, h: srcH } : { w: Math.max(srcW, srcH), h: Math.max(srcW, srcH) }
    const canvas = document.createElement('canvas')
    canvas.width = target.w
    canvas.height = target.h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.clearRect(0, 0, target.w, target.h)
    if (fit === 'none') {
      ctx.drawImage(img, 0, 0, srcW, srcH)
    } else if (fit === 'stretch') {
      ctx.drawImage(img, 0, 0, target.w, target.h)
    } else {
      const sx = target.w / srcW
      const sy = target.h / srcH
      const s = fit === 'cover' ? Math.max(sx, sy) : Math.min(sx, sy)
      const dw = srcW * s
      const dh = srcH * s
      const dx = (target.w - dw) * 0.5
      const dy = (target.h - dh) * 0.5
      ctx.drawImage(img, dx, dy, dw, dh)
    }
    return ctx.getImageData(0, 0, target.w, target.h)
  }

  private _sampleImageDataPoints(imageData: ImageData, maxCount: number): PointRgb[] {
    const { width: w, height: h, data } = imageData
    if (w <= 0 || h <= 0) return []
    const alphaThreshold = Math.max(0, Math.min(255, this.imageAlphaThreshold))
    let minX = w
    let minY = h
    let maxX = 0
    let maxY = 0
    const isOpaque = (x: number, y: number) =>
      data[(y * w + x) * 4 + 3] > alphaThreshold && this._passesImageMask(data, w, x, y)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (isOpaque(x, y)) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
    if (maxX < minX || maxY < minY) return []
    const cx = (minX + maxX) * 0.5
    const cy = (minY + maxY) * 0.5
    const bboxArea = (maxX - minX + 1) * (maxY - minY + 1)
    const density = Math.max(0.1, Math.min(4, this.imageSamplingDensity || 1))
    const maxRaw = Math.max(maxCount * 4 * density, 4000)
    const step = Math.max(1, Math.ceil(Math.sqrt(bboxArea / maxRaw)))
    const weighted = this.imageSampleByAlphaWeight
    const minSpacing = Math.max(0, this.imageMinPointSpacingPx || 0)
    const minSpacingSq = minSpacing * minSpacing
    const collected: PointRgb[] = []
    const weights: number[] = []
    for (let y = minY; y <= maxY; y += step) {
      for (let x = minX; x <= maxX; x += step) {
        const xi = Math.floor(x)
        const yi = Math.floor(y)
        if (!isOpaque(xi, yi)) continue
        const idx = (yi * w + xi) * 4
        const a = data[idx + 3]
        const isEdge = this._isImageEdgePixel(imageData, xi, yi, alphaThreshold)
        if (this.imageSamplingMode === 'edges' && !isEdge) continue
        if (this.imageSamplingMode === 'fill' && isEdge && this._edgeRejectForFill(xi, yi)) continue
        if (minSpacingSq > 0 && this._isTooCloseToAny(collected, xi - cx, yi - cy, minSpacingSq)) continue
        const mapped = this._mapImageColor(data[idx], data[idx + 1], data[idx + 2], xi, yi)
        collected.push({
          x: xi - cx,
          y: yi - cy,
          r: mapped.r,
          g: mapped.g,
          b: mapped.b,
        })
        if (weighted) {
          const edgeBoost = this.imageSamplingMode === 'hybrid' && isEdge ? 1.5 : 1
          weights.push((a / 255) * edgeBoost)
        }
      }
    }
    if (collected.length === 0) return []
    if (collected.length <= maxCount) return collected
    if (!weighted) return matchSamplesToCount(collected, maxCount)
    return this._weightedSubsamplePointRgb(collected, weights, maxCount)
  }

  private _isImageEdgePixel(imageData: ImageData, x: number, y: number, alphaThreshold: number): boolean {
    const { width: w, height: h, data } = imageData
    const isOpaque = (ix: number, iy: number) => {
      if (ix < 0 || iy < 0 || ix >= w || iy >= h) return false
      return data[(iy * w + ix) * 4 + 3] > alphaThreshold
    }
    if (!isOpaque(x, y)) return false
    const t = Math.max(1, Math.floor(this.imageEdgeThickness || 1))
    if (this.imageEdgeDetector === 'lumaSobel') {
      const gx = this._sobelLuma(imageData, x + 1, y) - this._sobelLuma(imageData, x - 1, y)
      const gy = this._sobelLuma(imageData, x, y + 1) - this._sobelLuma(imageData, x, y - 1)
      return Math.sqrt(gx * gx + gy * gy) > 0.08
    }
    for (let d = 1; d <= t; d++) {
      if (!isOpaque(x - d, y) || !isOpaque(x + d, y) || !isOpaque(x, y - d) || !isOpaque(x, y + d)) {
        return true
      }
    }
    return false
  }

  private _edgeRejectForFill(x: number, y: number): boolean {
    if (this.imageSamplingMode !== 'fill') return false
    // Keep mostly interior in fill mode while still allowing some edge points for silhouette readability.
    const seed = x * 73856093 + y * 19349663
    const unit = seededUnit(seed + this.assignmentSeed * 13)
    return unit < 1 / 7
  }

  private _weightedSubsamplePointRgb(samples: PointRgb[], weights: number[], count: number): PointRgb[] {
    if (count <= 0 || samples.length === 0) return []
    if (samples.length <= count) return samples.map((s) => ({ ...s }))
    let total = 0
    for (const w of weights) total += Math.max(0, w)
    if (total < 1e-12) return matchSamplesToCount(samples, count)
    const cum: number[] = []
    let c = 0
    for (let i = 0; i < weights.length; i++) {
      c += Math.max(0, weights[i]) / total
      cum.push(c)
    }
    const out: PointRgb[] = []
    for (let k = 0; k < count; k++) {
      const t = (k + 0.5) / count
      let lo = 0
      let hi = cum.length - 1
      while (lo < hi) {
        const mid = Math.floor((lo + hi) * 0.5)
        if (cum[mid] < t) lo = mid + 1
        else hi = mid
      }
      out.push({ ...samples[lo] })
    }
    return out
  }

  private _mapImageColor(r: number, g: number, b: number, x = 0, y = 0): { r: number; g: number; b: number } {
    let mapped: { r: number; g: number; b: number }
    switch (this.imageColorMode) {
      case 'quantized': {
        const levels = Math.max(2, Math.min(32, Math.floor(this.imageColorQuantizeLevels || 8)))
        const q = (v: number) => Math.round((Math.round((v / 255) * (levels - 1)) / (levels - 1)) * 255)
        mapped = { r: q(r), g: q(g), b: q(b) }
        break
      }
      case 'paletteMapped': {
        const palette = this._parsePalette()
        if (!palette.length) {
          mapped = { r, g, b }
          break
        }
        let best = palette[0]
        let bestD = Infinity
        const hsv = this._rgbToHsv(r, g, b)
        for (const c of palette) {
          let d = 0
          if (this.imageColorSpace === 'hsv') {
            const ph = this._rgbToHsv(c.r, c.g, c.b)
            const dh = Math.min(Math.abs(ph.h - hsv.h), 360 - Math.abs(ph.h - hsv.h)) / 180
            const ds = ph.s - hsv.s
            const dv = ph.v - hsv.v
            d = dh * dh * 0.6 + ds * ds * 0.25 + dv * dv * 0.15
          } else {
            const dr = c.r - r
            const dg = c.g - g
            const db = c.b - b
            d = dr * dr + dg * dg + db * db
          }
          if (d < bestD) {
            bestD = d
            best = c
          }
        }
        mapped = { r: best.r, g: best.g, b: best.b }
        break
      }
      case 'lumaOnly': {
        const y = Math.round(r * 0.2126 + g * 0.7152 + b * 0.0722)
        mapped = { r: y, g: y, b: y }
        break
      }
      case 'raw':
      default:
        mapped = { r, g, b }
        break
    }
    if (this.imageColorJitter > 1e-6) {
      const j = Math.max(0, Math.min(1, this.imageColorJitter))
      const amt = 255 * 0.2 * j
      const seed = seededUnit((x + 1) * 73856093 + (y + 1) * 19349663 + this.assignmentSeed * 83492791)
      const signed = (seed - 0.5) * 2
      mapped = {
        r: Math.max(0, Math.min(255, Math.round(mapped.r + signed * amt))),
        g: Math.max(0, Math.min(255, Math.round(mapped.g + signed * amt))),
        b: Math.max(0, Math.min(255, Math.round(mapped.b + signed * amt))),
      }
    }
    return mapped
  }

  private _parsePalette(): { r: number; g: number; b: number }[] {
    const src = this.imageColorPalette || ''
    const chunks = src.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
    const out: { r: number; g: number; b: number }[] = []
    for (const raw of chunks) {
      const hex = raw.replace(/^#/, '')
      if (!/^[0-9a-fA-F]{6}$/.test(hex) && !/^[0-9a-fA-F]{3}$/.test(hex)) continue
      const h = hex.length === 3 ? `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}` : hex
      out.push({
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
      })
    }
    return out
  }

  private _resolvedImageSource(): string {
    const frames = this.imageDataUrls.filter((s) => !!s?.trim())
    const useFrames = frames.length > 1 || (frames.length === 1 && !this.imageDataUrl?.trim())
    if (useFrames) {
      return frames[this._activeImageFrameIndex] || this.imageDataUrl || ''
    }
    return this.imageDataUrl || ''
  }

  private _updateActiveImageSource(deltaTime: number): void {
    if (this.patternMode !== 'imageBitmap') return
    const frames = this.imageDataUrls.filter((s) => !!s?.trim())
    const useFrames = frames.length > 1 || (frames.length === 1 && !this.imageDataUrl?.trim())
    if (!useFrames) {
      this._activeImageFrameIndex = 0
      this._activeImageBlendT = 0
      this._activeImageNextSource = ''
      return
    }
    const fps = Math.max(0.01, this.imageFrameRate || 12)
    this._imageFrameElapsedSec += deltaTime
    const rawT = this._imageFrameElapsedSec * fps
    const t = Math.floor(rawT)
    this._activeImageBlendT = rawT - t
    let idx = 0
    if (this.imageFramePingPong && frames.length > 1) {
      const span = frames.length * 2 - 2
      const cyc = this.imageFrameLoop ? t % span : Math.min(t, span)
      idx = cyc < frames.length ? cyc : span - cyc
    } else if (this.imageFrameLoop) {
      idx = t % frames.length
    } else {
      idx = Math.min(frames.length - 1, t)
    }
    if (idx !== this._activeImageFrameIndex) {
      this._activeImageFrameIndex = idx
    }
    const src = frames[idx] || ''
    const next = frames[(idx + 1) % frames.length] || src
    this._activeImageNextSource = next
    if (src !== this._activeImageSource) {
      this._activeImageSource = src
      this._lastConfigSig = ''
    }
  }

  private _passesImageMask(data: Uint8ClampedArray, w: number, x: number, y: number): boolean {
    const idx = (y * w + x) * 4
    const r = data[idx]
    const g = data[idx + 1]
    const b = data[idx + 2]
    const a = data[idx + 3]
    let ok = true
    if (this.imageMaskMode === 'luma') {
      const l = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255
      ok = l >= Math.max(0, Math.min(1, this.imageMaskLumaThreshold))
    } else if (this.imageMaskMode === 'hueRange') {
      const hsv = this._rgbToHsv(r, g, b)
      const min = ((this.imageMaskHueMin % 360) + 360) % 360
      const max = ((this.imageMaskHueMax % 360) + 360) % 360
      ok = min <= max ? hsv.h >= min && hsv.h <= max : hsv.h >= min || hsv.h <= max
    } else {
      ok = a > Math.max(0, Math.min(255, this.imageAlphaThreshold))
    }
    return this.imageInvertMask ? !ok : ok
  }

  private _sobelLuma(imageData: ImageData, x: number, y: number): number {
    const { width: w, height: h, data } = imageData
    const ix = Math.max(0, Math.min(w - 1, x))
    const iy = Math.max(0, Math.min(h - 1, y))
    const idx = (iy * w + ix) * 4
    return (data[idx] * 0.2126 + data[idx + 1] * 0.7152 + data[idx + 2] * 0.0722) / 255
  }

  private _rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
    const rn = r / 255
    const gn = g / 255
    const bn = b / 255
    const max = Math.max(rn, gn, bn)
    const min = Math.min(rn, gn, bn)
    const d = max - min
    let h = 0
    if (d > 1e-8) {
      if (max === rn) h = 60 * (((gn - bn) / d) % 6)
      else if (max === gn) h = 60 * ((bn - rn) / d + 2)
      else h = 60 * ((rn - gn) / d + 4)
    }
    if (h < 0) h += 360
    const s = max <= 1e-8 ? 0 : d / max
    return { h, s, v: max }
  }

  private _isTooCloseToAny(samples: PointRgb[], x: number, y: number, minDistSq: number): boolean {
    for (let i = samples.length - 1; i >= 0; i--) {
      const dx = samples[i].x - x
      const dy = samples[i].y - y
      if (dx * dx + dy * dy < minDistSq) return true
    }
    return false
  }

  private _cacheImageSamples(key: string, sampled: PointRgb[]) {
    this._imageSampleCache.set(key, sampled.map((s) => ({ ...s })))
    this._imageSampleCacheOrder = this._imageSampleCacheOrder.filter((k) => k !== key)
    this._imageSampleCacheOrder.push(key)
    const maxEntries = 24
    while (this._imageSampleCacheOrder.length > maxEntries) {
      const old = this._imageSampleCacheOrder.shift()
      if (old) this._imageSampleCache.delete(old)
    }
  }

  private _getCachedOrSampledImagePoints(imageData: ImageData, maxPx: number, sig: string): PointRgb[] {
    const key = `${sig}|sample`
    const cached = this._imageSampleCache.get(key)
    if (cached) return cached.map((s) => ({ ...s }))
    const coarseMax = Math.max(64, Math.floor(maxPx * 0.35))
    if (this.imageProgressiveRefine && this._coarseImageSig !== sig) {
      const coarse = this._sampleImageDataPoints(imageData, coarseMax)
      this._cacheImageSamples(key, coarse)
      this._coarseImageSig = sig
      this._imageDecodeStatus = 'loading'
      return coarse
    }
    const sampled = this._sampleImageDataPoints(imageData, maxPx)
    this._cacheImageSamples(key, sampled)
    this._coarseImageSig = sig
    return sampled
  }

  private _reorderForTemporalCoherence(prev: PointRgb[], next: PointRgb[]): PointRgb[] {
    if (prev.length === 0 || next.length === 0) return next
    const pool = next.map((p) => ({ ...p }))
    const used = new Array(pool.length).fill(false)
    const out: PointRgb[] = []
    const count = Math.min(prev.length, next.length)
    for (let i = 0; i < count; i++) {
      let best = -1
      let bestD = Infinity
      for (let j = 0; j < pool.length; j++) {
        if (used[j]) continue
        const dx = pool[j].x - prev[i].x
        const dy = pool[j].y - prev[i].y
        const d = dx * dx + dy * dy
        if (d < bestD) {
          bestD = d
          best = j
        }
      }
      if (best >= 0) {
        used[best] = true
        out.push(pool[best])
      }
    }
    for (let i = 0; i < pool.length; i++) if (!used[i]) out.push(pool[i])
    return out
  }

  private _blendWithNextFrameIfNeeded(budget: number) {
    if (this.patternMode !== 'imageBitmap') return
    const blendStrength = Math.max(0, Math.min(1, this.imageFrameBlend))
    if (
      blendStrength <= 1e-6 ||
      !this._activeImageNextSource ||
      this._activeImageNextSource === this._activeImageSource
    ) {
      return
    }
    const id = this._imageDataCache.get(this._activeImageNextSource)
    if (!id) return
    const sig = `${this._activeImageNextSource}|blend|${budget}|${this.imageSamplingMode}|${this.imageFitMode}`
    const next = this._getCachedOrSampledImagePoints(id, Math.min(16000, budget * 4), sig)
    if (!next.length || !this._cachedImagePoints.length) return
    const t = Math.max(0, Math.min(1, this._activeImageBlendT * blendStrength))
    const cur = this._cachedImagePoints
    const n = Math.min(cur.length, next.length)
    for (let i = 0; i < n; i++) {
      cur[i].x = cur[i].x + (next[i].x - cur[i].x) * t
      cur[i].y = cur[i].y + (next[i].y - cur[i].y) * t
      if (this._cachedImageRgb[i]) {
        this._cachedImageRgb[i].r = this._cachedImageRgb[i].r + (next[i].r - this._cachedImageRgb[i].r) * t
        this._cachedImageRgb[i].g = this._cachedImageRgb[i].g + (next[i].g - this._cachedImageRgb[i].g) * t
        this._cachedImageRgb[i].b = this._cachedImageRgb[i].b + (next[i].b - this._cachedImageRgb[i].b) * t
      }
    }
  }

  private _updateDebugOverlayFromSamples(samples: PointRgb[]) {
    if (this.imageDebugOverlayMode === 'off') {
      this._debugImageSamplesWorld = []
      return
    }
    this._debugImageSamplesWorld = samples.slice(0, 3000).map((s) => {
      const w = this._localToWorld(s.x, s.y)
      return { x: w.x, y: w.y, edge: false, alpha: 1 }
    })
  }

  private _transformPoints(pts: Point[]): Point[] {
    const rad = (this.rotation * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const cx = this.center.x
    const cy = this.center.y
    const sc = this.scale
    return pts.map((p) => {
      const sx = p.x * sc
      const sy = p.y * sc
      const rx = sx * cos - sy * sin
      const ry = sx * sin + sy * cos
      return new Point(rx + cx, ry + cy)
    })
  }

  private _ensureParticleAssigned(particle: Particle) {
    if (!this.particleListGetter) return
    const arr = this._collectParticlesSorted()
    const idx = arr.findIndex((p) => p.uid === particle.uid)
    if (idx < 0) return
    const { targets, targetRgb } = this._buildTargetsForCountWithColors(arr.length)
    const { assigned, targetIndex } = this._applyAssignmentWithIndices(arr, targets)
    const t = assigned[idx]
    if (!t) return
    const rgb =
      targetRgb && targetIndex[idx] !== undefined ? targetRgb[targetIndex[idx]] : undefined
    this._assignParticle(particle, t.x, t.y, idx, arr, rgb)
  }

  private _assignParticle(
    particle: Particle,
    tx: number,
    ty: number,
    sortedIndex: number,
    particles: Particle[],
    imageRgb?: { r: number; g: number; b: number },
  ) {
    particle.formPatternTargetX = tx
    particle.formPatternTargetY = ty
    const loc = this._worldToLocal(tx, ty)
    particle.formPatternLocalX = loc.x
    particle.formPatternLocalY = loc.y
    particle.formPatternAssigned = true
    const n = particles.length
    const span = Math.max(0, this.staggerMax - this.staggerMin)
    let st: number
    if (this.staggerOrder === 'index') {
      st =
        n > 1
          ? this.staggerMin + (span * sortedIndex) / (n - 1)
          : this.staggerMin
    } else if (this.staggerOrder === 'angle') {
      if (n > 1) {
        const cx = this.center.x
        const cy = this.center.y
        const order = [...particles.keys()].sort(
          (a, b) =>
            Math.atan2(particles[a].y - cy, particles[a].x - cx) -
            Math.atan2(particles[b].y - cy, particles[b].x - cx),
        )
        const rank = order.indexOf(sortedIndex)
        st = this.staggerMin + (span * Math.max(0, rank)) / (n - 1)
      } else {
        st = this.staggerMin
      }
    } else {
      st =
        this.staggerMin +
        seededUnit(this.assignmentSeed + sortedIndex * 31 + this._activationGeneration * 17) * span
    }
    particle.formPatternStaggerRemaining = Math.max(0, st)
    const v = this.speedVariance
    particle.formPatternSpeedMul =
      v > 0 ? 1 + (seededUnit(particle.uid * 13 + sortedIndex * 7) - 0.5) * 2 * v : 1
    particle.formPatternSinPhase =
      this.sinusoidalPhaseMode === 'perParticle'
        ? seededUnit(particle.uid * 999 + this.assignmentSeed) * Math.PI * 2
        : 0
    const pv = this.pathVariety
    const varietySeed =
      this.pathVarietySeedMode === 'deterministic'
        ? this.assignmentSeed + sortedIndex * 31
        : particle.uid * 41 + sortedIndex * 11
    particle.formPatternPathMul = pv > 0 ? 1 + (seededUnit(varietySeed) - 0.5) * 2 * pv : 1
    particle.formPatternSpringVx = 0
    particle.formPatternSpringVy = 0
    particle.formPatternLingerRemaining = 0
    particle.formPatternOvershootT = -1
    if (this.visualModulation !== 'none') {
      particle.formPatternVisBaseAlpha = particle.color.alpha
      particle.formPatternVisBaseSizeX = particle.size.x
      particle.formPatternVisBaseSizeY = particle.size.y
      particle.formPatternVisualActive = true
    } else {
      particle.formPatternVisualActive = false
    }
    if (
      imageRgb &&
      this.patternMode === 'imageBitmap' &&
      this.imageMatchParticleColors
    ) {
      this._maybeBackupParticleColorsForImage(particle)
      const blendMs = Math.max(0, this.imageColorBlendDurationMs)
      if (blendMs > 0) {
        particle.formPatternImageBlendFr = particle.color.r
        particle.formPatternImageBlendFg = particle.color.g
        particle.formPatternImageBlendFb = particle.color.b
        particle.formPatternImageBlendTr = imageRgb.r
        particle.formPatternImageBlendTg = imageRgb.g
        particle.formPatternImageBlendTb = imageRgb.b
        particle.formPatternImageColorBlendElapsed = 0
        particle.formPatternImageColorBlendActive = true
      } else {
        particle.formPatternImageColorBlendActive = false
        particle.color.r = imageRgb.r
        particle.color.g = imageRgb.g
        particle.color.b = imageRgb.b
        particle.colorStart.r = imageRgb.r
        particle.colorStart.g = imageRgb.g
        particle.colorStart.b = imageRgb.b
        particle.colorEnd.r = imageRgb.r
        particle.colorEnd.g = imageRgb.g
        particle.colorEnd.b = imageRgb.b
      }
    }
    this._initializeParticleForMove(particle, tx, ty)
  }

  private _maybeBackupParticleColorsForImage(particle: Particle) {
    if (!this.imageRestoreOriginalColorOnDeactivate) return
    if (particle.formPatternColorBackup !== null) return
    particle.formPatternColorBackup = {
      cr: particle.color.r,
      cg: particle.color.g,
      cb: particle.color.b,
      ca: particle.color.alpha,
      sr: particle.colorStart.r,
      sg: particle.colorStart.g,
      sb: particle.colorStart.b,
      sa: particle.colorStart.alpha,
      er: particle.colorEnd.r,
      eg: particle.colorEnd.g,
      eb: particle.colorEnd.b,
      ea: particle.colorEnd.alpha,
    }
  }

  private _restoreParticleColorsIfNeeded(particle: Particle) {
    const b = particle.formPatternColorBackup
    if (!b) return
    if (!this.imageRestoreOriginalColorOnDeactivate) {
      particle.formPatternColorBackup = null
      this._clearImageColorBlend(particle)
      return
    }
    particle.color.r = b.cr
    particle.color.g = b.cg
    particle.color.b = b.cb
    particle.color.alpha = b.ca
    particle.colorStart.r = b.sr
    particle.colorStart.g = b.sg
    particle.colorStart.b = b.sb
    particle.colorStart.alpha = b.sa
    particle.colorEnd.r = b.er
    particle.colorEnd.g = b.eg
    particle.colorEnd.b = b.eb
    particle.colorEnd.alpha = b.ea
    particle.formPatternColorBackup = null
    this._clearImageColorBlend(particle)
  }

  private _clearImageColorBlend(particle: Particle) {
    particle.formPatternImageColorBlendActive = false
    particle.formPatternImageColorBlendElapsed = 0
  }

  private _snapImageColorBlendToTarget(particle: Particle) {
    if (!particle.formPatternImageColorBlendActive) return
    const r = particle.formPatternImageBlendTr
    const g = particle.formPatternImageBlendTg
    const b = particle.formPatternImageBlendTb
    particle.color.r = r
    particle.color.g = g
    particle.color.b = b
    particle.colorStart.r = r
    particle.colorStart.g = g
    particle.colorStart.b = b
    particle.colorEnd.r = r
    particle.colorEnd.g = g
    particle.colorEnd.b = b
    particle.formPatternImageColorBlendActive = false
  }

  private _updateImageColorBlend(particle: Particle, deltaTime: number) {
    if (!this.imageMatchParticleColors || this.patternMode !== 'imageBitmap') return
    if (!particle.formPatternImageColorBlendActive) return
    const ms = Math.max(0, this.imageColorBlendDurationMs)
    if (ms <= 0) {
      this._snapImageColorBlendToTarget(particle)
      return
    }
    particle.formPatternImageColorBlendElapsed += deltaTime
    const t = Math.min(1, particle.formPatternImageColorBlendElapsed / (ms * 0.001))
    const fr = particle.formPatternImageBlendFr
    const fg = particle.formPatternImageBlendFg
    const fb = particle.formPatternImageBlendFb
    const tr = particle.formPatternImageBlendTr
    const tg = particle.formPatternImageBlendTg
    const tb = particle.formPatternImageBlendTb
    const r = fr + (tr - fr) * t
    const g = fg + (tg - fg) * t
    const b = fb + (tb - fb) * t
    particle.color.r = r
    particle.color.g = g
    particle.color.b = b
    particle.colorStart.r = r
    particle.colorStart.g = g
    particle.colorStart.b = b
    particle.colorEnd.r = r
    particle.colorEnd.g = g
    particle.colorEnd.b = b
    if (t >= 1) {
      particle.formPatternImageColorBlendActive = false
    }
  }

  private _initializeParticleForMove(particle: Particle, tx: number, ty: number) {
    particle.formPatternInitialX = particle.x
    particle.formPatternInitialY = particle.y
    const dx = tx - particle.formPatternInitialX
    const dy = ty - particle.formPatternInitialY
    const d = Math.sqrt(dx * dx + dy * dy)
    particle.formPatternTotalDistance = d
    if (d > 1e-8) {
      particle.formPatternChordUx = dx / d
      particle.formPatternChordUy = dy / d
    } else {
      particle.formPatternChordUx = 1
      particle.formPatternChordUy = 0
    }
    particle.formPatternAccumulatedLinearDistance = 0
    particle.formPatternPathTime = 0
  }

  private _applyJitter(tx: number, ty: number, index: number): Point {
    if (this.targetJitter <= 0) return new Point(tx, ty)
    const seed = this.assignmentSeed + this._activationGeneration * 1000003 + index * 31
    const a = seededUnit(seed + 2) * Math.PI * 2
    const r = seededUnit(seed + 5) * this.targetJitter
    return new Point(tx + Math.cos(a) * r, ty + Math.sin(a) * r)
  }

  private _applyAssignmentWithIndices(
    particles: Particle[],
    targets: Point[],
  ): { assigned: Point[]; targetIndex: number[] } {
    const n = particles.length
    if (n === 0) return { assigned: [], targetIndex: [] }
    const cx = this.center.x
    const cy = this.center.y
    const seed = this.assignmentSeed + this._activationGeneration * 1000003

    const t = targets.map((p, i) => this._applyJitter(p.x, p.y, i))

    switch (this.assignmentMode) {
      case 'random': {
        const perm = shuffledIndices(n, seed)
        const assigned = perm.map((j) => new Point(t[j].x, t[j].y))
        return { assigned, targetIndex: perm }
      }
      case 'angle': {
        const targetIndex = assignByPolarAngleTargetIndices(particles, t, cx, cy)
        const assigned = targetIndex.map((j) => new Point(t[j].x, t[j].y))
        return { assigned, targetIndex }
      }
      case 'greedy': {
        const targetIndex = assignGreedyNearestTargetIndices(particles, t)
        const assigned = targetIndex.map((j) => new Point(t[j].x, t[j].y))
        return { assigned, targetIndex }
      }
      case 'pathOrder': {
        const targetIndex = assignPathOrderTargetIndices(particles, t)
        const assigned = targetIndex.map((j) => new Point(t[j].x, t[j].y))
        return { assigned, targetIndex }
      }
      case 'optimal': {
        const useHungarian = n <= Math.max(4, this.optimalMaxParticles)
        const targetIndex = (
          useHungarian ? assignHungarianTargetIndices(particles, t) : assignGreedyNearestTargetIndices(particles, t)
        ).map((j, i) => (j >= 0 ? j : i % Math.max(1, t.length)))
        const assigned = targetIndex.map((j) => new Point(t[j].x, t[j].y))
        return { assigned, targetIndex }
      }
      default: {
        const targetIndex = [...Array(n).keys()]
        const assigned = t.map((p) => new Point(p.x, p.y))
        return { assigned, targetIndex }
      }
    }
  }

  private _applyAssignment(particles: Particle[], targets: Point[]): Point[] {
    return this._applyAssignmentWithIndices(particles, targets).assigned
  }

  private _snapArrival(particle: Particle) {
    particle.x = particle.formPatternTargetX + this._resolvedOffsetX
    particle.y = particle.formPatternTargetY + this._resolvedOffsetY
    particle.movement.x = particle.x
    particle.movement.y = particle.y
    this._applyVisualModulation(particle, 1)
    this._onReachTarget(particle)
  }

  private _onReachTarget(particle: Particle) {
    if (this.lingerMs > 0) {
      particle.formPatternLingerRemaining = this.lingerMs * 0.001
      return
    }
    this._finishArrival(particle)
  }

  private _finishArrival(particle: Particle) {
    if (this.killOnArrival && particle.maxLifeTime > 0) {
      particle.lifeTime = particle.maxLifeTime
      if (this.resetMaxLifeTime) particle.maxLifeTime = 0
    }
  }

  private _positionOnPath(
    particle: Particle,
    easedProgress: number,
    linearProgress: number,
    _deltaTime: number,
  ): { x: number; y: number } {
    const ix = particle.formPatternInitialX
    const iy = particle.formPatternInitialY
    const tx = particle.formPatternTargetX
    const ty = particle.formPatternTargetY
    const dx = tx - ix
    const dy = ty - iy
    const d = Math.sqrt(dx * dx + dy * dy) || 1
    const ux = dx / d
    const uy = dy / d
    const px = -uy
    const py = ux
    const vm = particle.formPatternPathMul

    let bx: number
    let by: number

    if (this.pathType === 'cubic') {
      const bulge = this.cubicPerpBulge * d * vm
      const asym = this.cubicAsymmetry
      const p1x = ix + dx / 3 + px * bulge
      const p1y = iy + dy / 3 + py * bulge
      const p2x = ix + (2 * dx) / 3 - px * bulge * asym
      const p2y = iy + (2 * dy) / 3 - py * bulge * asym
      const t = easedProgress
      const u = 1 - t
      bx = u * u * u * ix + 3 * u * u * t * p1x + 3 * u * t * t * p2x + t * t * t * tx
      by = u * u * u * iy + 3 * u * u * t * p1y + 3 * u * t * t * p2y + t * t * t * ty
    } else {
      bx = ix + dx * easedProgress
      by = iy + dy * easedProgress

      if (this.pathType === 'arc' && Math.abs(this.arcBulge) > 1e-8) {
        const mxi = 0.5 * (ix + tx)
        const myi = 0.5 * (iy + ty)
        const cx = mxi + px * this.arcBulge * d * vm
        const cy = myi + py * this.arcBulge * d * vm
        const omt = 1 - easedProgress
        bx = omt * omt * ix + 2 * omt * easedProgress * cx + easedProgress * easedProgress * tx
        by = omt * omt * iy + 2 * omt * easedProgress * cy + easedProgress * easedProgress * ty
      }

      if (this.pathType === 'spiral' && Math.abs(this.spiralTurns) > 1e-8) {
        const taper = Math.sin(Math.PI * linearProgress)
        const ang = this.spiralTurns * Math.PI * 2 * linearProgress
        const amp = this.sinusoidalAmplitude * taper * vm
        bx += px * Math.sin(ang) * amp
        by += py * Math.sin(ang) * amp
      }

      if (this.pathType === 'noise') {
        const t = particle.formPatternPathTime * this.noiseFrequency
        const seed = particle.uid * 0.137
        const n1 = Math.sin(t + seed + linearProgress * 6.28)
        const n2 = Math.cos(t * 0.73 + seed * 2.1)
        const dim = Math.max(0, 1 - linearProgress)
        bx += px * n1 * this.noiseAmplitude * dim * 0.5 * vm
        by += py * n2 * this.noiseAmplitude * dim * 0.5 * vm
      }

      if (this.pathType === 'sinusoidal' && linearProgress < 1) {
        const dim = Math.max(0, 1 - linearProgress)
        const currentAmplitude = this.sinusoidalAmplitude * dim * vm
        const phase =
          particle.formPatternPathTime * this.sinusoidalFrequency +
          (this.sinusoidalPhaseMode === 'perParticle' ? particle.formPatternSinPhase : 0)
        const sinMagnitude = currentAmplitude * Math.sin(phase)
        bx += px * sinMagnitude
        by += py * sinMagnitude
      }
    }

    return { x: bx, y: by }
  }

  private _applyEasing(t: number, easeType: string): number {
    const clampedT = Math.max(0, Math.min(1, t))
    switch (easeType) {
      case 'back.in':
        return this._easeBackIn(clampedT)
      case 'back.out':
        return this._easeBackOut(clampedT)
      case 'back.inOut':
        return this._easeBackInOut(clampedT)
      case 'power1.in':
        return this._easePower1In(clampedT)
      case 'power1.out':
        return this._easePower1Out(clampedT)
      case 'power1.inOut':
        return this._easePower1InOut(clampedT)
      case 'bounce.in':
        return this._easeBounceIn(clampedT)
      case 'bounce.out':
        return this._easeBounceOut(clampedT)
      case 'bounce.inOut':
        return this._easeBounceInOut(clampedT)
      case 'elastic.in':
        return this._easeElasticIn(clampedT)
      case 'elastic.out':
        return this._easeElasticOut(clampedT)
      case 'elastic.inOut':
        return this._easeElasticInOut(clampedT)
      case 'steps':
        return this._easeSteps(clampedT)
      case 'linear':
      default:
        return clampedT
    }
  }

  private _easeBackInOut(t: number, c1 = 1.70158, c2 = c1 * 1.525): number {
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2
  }

  private _easeBackIn(t: number, c1 = 1.70158): number {
    return t * t * ((c1 + 1) * t - c1)
  }

  private _easeBackOut(t: number, c1 = 1.70158): number {
    const tInv = t - 1
    return tInv * tInv * ((c1 + 1) * tInv + c1) + 1
  }

  private _easePower1In(t: number): number {
    return t
  }

  private _easePower1Out(t: number): number {
    return t
  }

  private _easePower1InOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
  }

  private _easeBounceIn(t: number): number {
    return 1 - this._easeBounceOut(1 - t)
  }

  private _easeBounceOut(t: number): number {
    const n1 = 7.5625
    const d1 = 2.75
    if (t < 1 / d1) {
      return n1 * t * t
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375
    }
  }

  private _easeBounceInOut(t: number): number {
    return t < 0.5 ? (1 - this._easeBounceOut(1 - 2 * t)) / 2 : (1 + this._easeBounceOut(2 * t - 1)) / 2
  }

  private _easeElasticIn(t: number, amplitude = 1, period = 0.3): number {
    if (t === 0) return 0
    if (t === 1) return 1
    const s = (period / (2 * Math.PI)) * Math.asin(1 / amplitude)
    const t1 = t - 1
    return -(amplitude * Math.pow(2, 10 * t1) * Math.sin(((t1 - s) * (2 * Math.PI)) / period))
  }

  private _easeElasticOut(t: number, amplitude = 1, period = 0.3): number {
    if (t === 0) return 0
    if (t === 1) return 1
    const s = (period / (2 * Math.PI)) * Math.asin(1 / amplitude)
    return amplitude * Math.pow(2, -10 * t) * Math.sin(((t - s) * (2 * Math.PI)) / period) + 1
  }

  private _easeElasticInOut(t: number, amplitude = 1, period = 0.45): number {
    if (t === 0) return 0
    if (t === 1) return 1
    const s = (period / (2 * Math.PI)) * Math.asin(1 / amplitude)
    const t2 = t * 2
    if (t2 < 1) {
      const t1 = t2 - 1
      return -0.5 * (amplitude * Math.pow(2, 10 * t1) * Math.sin(((t1 - s) * (2 * Math.PI)) / period))
    }
    const t1b = t2 - 1
    return amplitude * Math.pow(2, -10 * t1b) * Math.sin(((t1b - s) * (2 * Math.PI)) / period) * 0.5 + 1
  }

  private _easeSteps(t: number, numSteps = 12): number {
    const stepSize = 1 / numSteps
    const stepIndex = Math.floor(t / stepSize)
    return Math.min(stepIndex * stepSize, 1)
  }

  getName(): string {
    return BehaviourNames.FORM_PATTERN_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      active: this.active,
      priority: this.priority,
      patternMode: this.patternMode,
      points: this.points,
      presetShape: this.presetShape,
      presetParams: this.presetParams,
      runtimeText: this.runtimeText,
      fontFamily: this.fontFamily,
      fontSize: this.fontSize,
      fontWeight: this.fontWeight,
      pointBudget: this.pointBudget,
      svgPath: this.svgPath,
      svgPathSegmentsPerCurve: this.svgPathSegmentsPerCurve,
      textRasterMode: this.textRasterMode,
      textStrokeWidth: this.textStrokeWidth,
      bakedPolylineMode: this.bakedPolylineMode,
      center: { x: this.center.x, y: this.center.y },
      scale: this.scale,
      rotation: this.rotation,
      speed: this.speed,
      speedVariance: this.speedVariance,
      speedScaleByDistance: this.speedScaleByDistance,
      progressMode: this.progressMode,
      staggerMin: this.staggerMin,
      staggerMax: this.staggerMax,
      killOnArrival: this.killOnArrival,
      resetMaxLifeTime: this.resetMaxLifeTime,
      lingerMs: this.lingerMs,
      arrivalThreshold: this.arrivalThreshold,
      targetJitter: this.targetJitter,
      assignmentMode: this.assignmentMode,
      assignmentSeed: this.assignmentSeed,
      shuffleOnEachActivate: this.shuffleOnEachActivate,
      pathType: this.pathType,
      sinusoidalAmplitude: this.sinusoidalAmplitude,
      sinusoidalFrequency: this.sinusoidalFrequency,
      sinusoidalPhaseMode: this.sinusoidalPhaseMode,
      noiseAmplitude: this.noiseAmplitude,
      noiseFrequency: this.noiseFrequency,
      arcBulge: this.arcBulge,
      spiralTurns: this.spiralTurns,
      pathEasing: this.pathEasing,
      showTargetsPreview: this.showTargetsPreview,
      showPathPreview: this.showPathPreview,
      liveFormationTransform: this.liveFormationTransform,
      morphBlend: this.morphBlend,
      morphPresetShape: this.morphPresetShape,
      morphPresetParams: this.morphPresetParams,
      imageDataUrl: this.imageDataUrl,
      imageDataUrls: this.imageDataUrls,
      imageFrameRate: this.imageFrameRate,
      imageFrameLoop: this.imageFrameLoop,
      imageFramePingPong: this.imageFramePingPong,
      imageAlphaThreshold: this.imageAlphaThreshold,
      imageFitMode: this.imageFitMode,
      imageSamplingMode: this.imageSamplingMode,
      imageMatchParticleColors: this.imageMatchParticleColors,
      imageRestoreOriginalColorOnDeactivate: this.imageRestoreOriginalColorOnDeactivate,
      imageColorBlendDurationMs: this.imageColorBlendDurationMs,
      imageColorMode: this.imageColorMode,
      imageColorSpace: this.imageColorSpace,
      imageColorQuantizeLevels: this.imageColorQuantizeLevels,
      imageColorJitter: this.imageColorJitter,
      imageColorPalette: this.imageColorPalette,
      imageSamplingDensity: this.imageSamplingDensity,
      imageMinPointSpacingPx: this.imageMinPointSpacingPx,
      imageEdgeThickness: this.imageEdgeThickness,
      imageEdgeDetector: this.imageEdgeDetector,
      imageMaskMode: this.imageMaskMode,
      imageInvertMask: this.imageInvertMask,
      imageMaskLumaThreshold: this.imageMaskLumaThreshold,
      imageMaskHueMin: this.imageMaskHueMin,
      imageMaskHueMax: this.imageMaskHueMax,
      imageTemporalCoherence: this.imageTemporalCoherence,
      imageFrameBlend: this.imageFrameBlend,
      imageProgressiveRefine: this.imageProgressiveRefine,
      imageAutoDownscaleMax: this.imageAutoDownscaleMax,
      imageDebugOverlayMode: this.imageDebugOverlayMode,
      imageDecodeStatus: this._imageDecodeStatus,
      textAlign: this.textAlign,
      textLineHeight: this.textLineHeight,
      staggerOrder: this.staggerOrder,
      pathVariety: this.pathVariety,
      cubicPerpBulge: this.cubicPerpBulge,
      cubicAsymmetry: this.cubicAsymmetry,
      springStiffness: this.springStiffness,
      springDamping: this.springDamping,
      physicsBlend: this.physicsBlend,
      externalOffsetX: this.externalOffsetX,
      externalOffsetY: this.externalOffsetY,
      followEmitterWorldPosition: this.followEmitterWorldPosition,
      lifetimeProgressOffset: this.lifetimeProgressOffset,
      svgSourceMarkup: this.svgSourceMarkup,
      svgPathElementId: this.svgPathElementId,
      svgFitNormalize: this.svgFitNormalize,
      bakedPresets: this.bakedPresets,
      bakedPresetName: this.bakedPresetName,
      bakedFrames: this.bakedFrames,
      bakedFrameIndex: this.bakedFrameIndex,
      pointWeights: this.pointWeights,
      optimalMaxParticles: this.optimalMaxParticles,
      morphKeyframes: this.morphKeyframes,
      morphTimelinePlay: this.morphTimelinePlay,
      morphTimelineDurationMs: this.morphTimelineDurationMs,
      morphTimelineLoop: this.morphTimelineLoop,
      morphTimelineSpeed: this.morphTimelineSpeed,
      pathVarietySeedMode: this.pathVarietySeedMode,
      visualModulation: this.visualModulation,
      visualProgressEasing: this.visualProgressEasing,
      visualAlphaFrom: this.visualAlphaFrom,
      visualAlphaTo: this.visualAlphaTo,
      visualScaleFromMul: this.visualScaleFromMul,
      visualScaleToMul: this.visualScaleToMul,
      arrivalOvershootPx: this.arrivalOvershootPx,
      arrivalOvershootSettleMs: this.arrivalOvershootSettleMs,
      imageSampleByAlphaWeight: this.imageSampleByAlphaWeight,
      audioReactSpeed: this.audioReactSpeed,
      audioReactMorph: this.audioReactMorph,
      debugLogAssignmentMs: this.debugLogAssignmentMs,
      name: this.getName(),
    }
  }
}
