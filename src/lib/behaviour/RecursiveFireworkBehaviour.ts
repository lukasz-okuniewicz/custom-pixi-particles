import Particle from '../Particle'
import ParticlePool from '../ParticlePool'
import type Model from '../Model'
import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import { spatialCellKey } from '../util/spatialCellKey'

type FireworkPhase = 'comet' | 'spark'
type TriggerMode = 'lifeProgress' | 'apex' | 'distanceFromOrigin'
type DirectionMode = 'fixed' | 'followVelocity' | 'awayFromCenter' | 'randomPerBurst'
type BurstShape = 'circle' | 'ring' | 'cone' | 'star' | 'heart' | 'peony' | 'willow' | 'crossette' | 'horsetail' | 'spiral'
type PaletteStrategy =
  | 'randomFromPalette'
  | 'monochrome'
  | 'analogous'
  | 'complementary'
  | 'heat'
  | 'triadic'
  | 'pastel'
  | 'electric'
  | 'splitTriad'
  | 'paletteSweep'
  | 'depthAware'
type PaletteAnimationMode = 'none' | 'hueDrift' | 'depthSwap' | 'depthGradient'
type WindMode = 'constant' | 'noise'
type ColorProgramMode = 'none' | 'warmToCool' | 'coolToWarm' | 'lumaPulse' | 'lifeDesaturate' | 'lifeSaturate'
type RoleColorTintMode = 'none' | 'coolCometWarmSpark'
type DepthProgram = 'none' | 'bloom' | 'cascade' | 'implode' | 'fractal'
type ChildDirectionMode = 'radial' | 'inheritVelocity' | 'tangentCurve' | 'reflected'
type SeedSequenceMode = 'fixedCycle' | 'pingPong' | 'randomWalk'
type DepthColorPaletteMode = 'inherit' | 'rotate' | 'complement' | 'splitComplement'
type RecursionPhaseMode = 'cometOnly' | 'sparkOnly' | 'both'
type ChildRole = 'spark' | 'comet' | 'glitter' | 'crackle' | 'ember'
type BranchingMode = 'probabilistic' | 'guaranteedCore' | 'fanOut'
type RecursionMode = 'standard' | 'branchingComets' | 'chainReaction'
type TrailStyle = 'classic' | 'fadeTail' | 'glowStreak' | 'sparkleTrail'
type FireworkTextureImageGroup = 'comet' | 'explosion' | 'explosionParticle'
type WaveAnchorMode = 'originOnly' | 'originAndPointer' | 'mirroredDepth'
type ReactiveSourceMode = 'auto' | 'soundReactive' | 'pulse' | 'beatPhaseLock'
type ReactiveMode = 'off' | 'beatBurst' | 'spectralShapeMorph' | 'energyRecursion' | 'phaseLockedOrbit' | 'paletteEnergyMorph'
type ReactiveSourceBlendMode = 'single' | 'weightedMix' | 'max' | 'priority'

type MotifParamKey =
  | 'burstShape'
  | 'paletteStrategy'
  | 'trailStyle'
  | 'recursionMode'
  | 'depthProgram'
  | 'spreadDegrees'
  | 'explosionParticleCount'
  | 'childCometProbability'
  | 'shockwaveEnabled'
  | 'glowEnabled'

type FireworkShowScriptKeyframe = {
  /** Time (sec) since the root shot exploded. */
  t: number
  /** Param changes applied at/after this time. */
  params: Partial<Record<MotifParamKey, any>>
  /** Optional blend time (sec) for numeric params. */
  blendSec?: number
}

type FireworkShowScriptConfig = {
  enabled: boolean
  /** Keyframes sorted by `t`. */
  keyframes: FireworkShowScriptKeyframe[]
  /** When true, keyframes apply only to depth 0 explosions. */
  rootOnly?: boolean
}

type IntentKnobs = {
  /** 0..1: reduces variance, tightens shapes, reduces recursion chaos */
  elegance?: number
  /** 0..1: increases variance, encourages branching */
  chaos?: number
  /** 0..1: increases spawn density (bounded by budgets) */
  density?: number
  /** 0..1: turns on secondary effects and boosts visuals */
  spectacle?: number
  /** 0..1: biases toward reactive/musical gating when signals exist */
  musicality?: number
}

type RecursionGrammarRule = { role: ChildRole; weight: number }
type RecursionGrammarConfig = {
  enabled: boolean
  /** Transition table by parent role. */
  transitions: Partial<Record<ChildRole, RecursionGrammarRule[]>>
  /** Optional per-depth multiplier on role weights (index = depth). */
  depthWeightMult?: Partial<Record<ChildRole, number[]>>
}

type FieldForceType = 'attractor' | 'repulsor' | 'vortex' | 'lineAttractor'
type FieldForceConfig = {
  enabled: boolean
  type: FieldForceType
  x: number
  y: number
  /** Pixels; <=0 means infinite. */
  radius?: number
  /** Base strength in px/s^2 (impulse-like). */
  strength: number
  /** 0..1; higher = sharper near center. */
  falloff?: number
  /** For vortex. */
  swirl?: number
  /** Role filter (omit = all). */
  roles?: ChildRole[]
  /** Depth filter (omit = all). */
  minDepth?: number
  maxDepth?: number
}

type MusicQuantizeMode = 'holdUntilWindow' | 'snapOnExplode'
type MusicQuantizeConfig = {
  enabled: boolean
  mode?: MusicQuantizeMode
  /** Subdivisions per beat (e.g. 4=quarter notes, 8=eighth notes). */
  subdivisions?: number
  /** 0..0.5 window around grid (phase distance). */
  window?: number
  /** Prevent infinite holds by forcing explode beyond this life progress. */
  maxHoldLifeProgress?: number
  /** Applies to root only by default. */
  rootOnly?: boolean
}

type DiagnosticsConfig = {
  enabled: boolean
  /** Writes a compact diagnostics object into `model.reactiveSignals.debug`. */
  writeToReactiveDebug?: boolean
  /** Frequency in frames. */
  everyNFrames?: number
  /** When true, include a small replay pack snapshot. */
  includeReplayPack?: boolean
}

type ShockwaveEvent = {
  x: number
  y: number
  z: number
  radius: number
  strength: number
  delaySec: number
  ttlSec: number
}

type ReactiveV2Channel =
  | 'energy'
  | 'loudness'
  | 'onset'
  | 'flux'
  | 'low'
  | 'mid'
  | 'high'
  | 'beat'
  | 'pulsePhase'
  | 'beatPhase'
  | 'phase1x'
  | 'phase2x'
  | 'phase4x'

type ReactiveV2TargetParam =
  | 'spawnAmountMult'
  | 'childChanceAdd'
  | 'childChanceMult'
  | 'spreadMult'
  | 'baseAngleAddRad'
  | 'speedMult'
  | 'lifeMult'
  | 'alphaMult'
  | 'paletteHueAddDeg'
  | 'paletteSatMult'

type ReactiveV2Curve = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'smoothstep' | 'step'

type ReactiveV2Row = {
  source: ReactiveV2Channel
  target: ReactiveV2TargetParam
  amount: number
  curve?: ReactiveV2Curve
  clampMin?: number
  clampMax?: number
}

type ReactiveV2Config = {
  enabled: boolean
  /** Global scale on matrix output. */
  gain?: number
  /** Optional limiter on energy-like channels to avoid runaway bursts. */
  limiter?: { knee?: number; ratio?: number; ceiling?: number }
  /** Matrix rows evaluated per explosion burst. */
  matrix?: ReactiveV2Row[]
  /** When true, write debug info into Model.reactiveSignals.debug for inspector UI. */
  debug?: boolean
  /** Scale reactive modulation down when budgets are near limits. */
  perf?: {
    enabled?: boolean
    /** Where scaling starts based on emitter particle budget ratio. */
    startRatio?: number
    /** Where scaling is fully applied based on emitter particle budget ratio. */
    fullRatio?: number
    /** Minimum allowed multiplier (never drops below this). */
    minMult?: number
  }
}

interface FireworkState {
  phase: FireworkPhase
  depth: number
  explodeAtProgress: number
  baseSize: number
  startAlpha: number
  endAlpha: number
  startColor: { r: number; g: number; b: number }
  endColor: { r: number; g: number; b: number }
  zVelocity: number
  zAcceleration: number
  originX: number
  originY: number
  activationDelaySec: number
  carrierStage: boolean
  burstEnergy: number
  depthDelaySec: number
  shotSeedPhase: number
  hasExploded: boolean
  role: ChildRole
  originAnchored: boolean
  chainTriggered: boolean
  /** Which RecursiveFirework texture key list applies at sprite creation. */
  textureImageGroup: FireworkTextureImageGroup
  /** Generations left for color “sport” hue walk (see sportProbability / sportHueDelta). */
  sportGenerationsLeft: number
  /** Reduces max recursion depth for this subtree (curvature detonator children). */
  recursionDepthPenalty: number
  /** Last minefield grid cell for sparks (Proximity Minefield). */
  lastMineIx?: number
  lastMineIy?: number
  /** Smoothed heading (rad) for curvature detection on comets. */
  headingSmooth: number | null
  /** Accumulated heading change for corner detection. */
  headingTurnAccum: number
  cornerCooldownSec: number
  /** 0 = near sheet, 1 = far sheet (Z-Layer Piercer). */
  zSheetSlot: number
  /** Curvature detonator queued a tangent-biased micro pop at explosion. */
  cornerMicroPending: boolean
}

type MutableEmitter = {
  list: { add: (particle: Particle) => Particle; length: number }
  emit: (eventName: string, particle?: Particle) => void
  behaviours: {
    init: (particle: Particle, model: Model, turbulencePool: any) => void
    apply: (particle: Particle, deltaTime: number, model: Model) => void
  }
  turbulencePool: any
}

export default class RecursiveFireworkBehaviour extends Behaviour {
  enabled = true
  priority = -5

  triggerMode: TriggerMode = 'lifeProgress'
  directionMode: DirectionMode = 'fixed'
  cometCurve = 46
  cometCurveVariance = 20
  cometNoise = 18
  cometNoiseVariance = 8
  cometFadeIn = 0.08
  cometFadeOut = 0.22
  explosionTriggerMin = 0.45
  explosionTriggerMax = 0.82
  explodeDistance = 240

  explosionParticleCount = 30
  explosionParticleCountVariance = 14
  explosionSpeed = 280
  explosionSpeedVariance = 110
  explosionLifetime = 1.1
  explosionLifetimeVariance = 0.35
  explosionSize = 1.1
  explosionSizeVariance = 0.4
  explosionAlphaStart = 1
  explosionAlphaEnd = 0
  spreadDegrees = 360
  explosionDirectionDegrees = -90
  directionByDepth: number[] = []
  spreadByDepth: number[] = []
  burstStaggerMs = 0
  burstStaggerJitter = 0
  burstShape: BurstShape = 'circle'
  coneDegrees = 80
  starPoints = 5
  peonyPetals = 12
  willowArcJitter = 0.05
  crossetteBranches = 4
  horsetailTightness = 0.22

  recursionDepth = 2
  childCometProbability = 0.24
  childSpeedMultiplier = 0.9
  childLifetimeMultiplier = 0.85
  childColorJitter = 34
  childChanceByDepth: number[] = []
  countByDepth: number[] = []
  speedByDepth: number[] = []

  zVelocity = 0
  zVelocityVariance = 45
  zAcceleration = 0
  zIndexFactor = 0.8
  zIndexBase = 0
  perspectiveDepth = 1200
  perspectiveStrength = 1
  perspectiveProfile = 'subtle'
  perspectiveExponent = 1
  perspectiveFarScaleMin = 0.2
  perspectiveNearScaleMax = 2
  depthAlphaFalloff = 0
  depthSaturationFalloff = 0
  depthAlphaByDepth: number[] = []
  depthSaturationByDepth: number[] = []
  depthFogNear = 600
  depthFogFar = 2600
  depthFogAlpha = 0

  maxSpawnPerFrame = 150
  maxTotalSpawnBudget = 6000
  adaptiveThrottle = true
  throttleStartRatio = 0.72
  /** Additional global cap; 0 disables per-second cap. */
  maxSpawnPerSecond = 0
  /** Predictive planner strength (0..1) to trim burst counts before loops. */
  recursionPlannerStrength = 0
  /** Depth-based subtree cull beyond this ratio of recursionDepth (0..1, >1 disables). */
  subtreeCullDepthRatio = 1.1
  /** Extra visibility floor added per depth for subtree culling. */
  subtreeCullMinVisiblePerDepth = 0
  /** Additional damping on reactive energy when budgets are saturated. */
  reactiveSafetyDamping = 0
  lodEnabled = false
  lodTargetFrameMs = 16.7
  lodParticleThresholdNear = 2000
  lodParticleThresholdFar = 4500
  lodDepthReduction = 1
  lodSecondaryReduction = 0.5

  explosionColors: { r: number; g: number; b: number }[] = [
    { r: 255, g: 230, b: 120 },
    { r: 255, g: 110, b: 90 },
    { r: 120, g: 200, b: 255 },
    { r: 220, g: 120, b: 255 },
  ]
  paletteStrategy: PaletteStrategy = 'randomFromPalette'
  paletteAnimationMode: PaletteAnimationMode = 'none'
  colorProgramMode: ColorProgramMode = 'none'
  roleColorTint: RoleColorTintMode = 'none'
  depthColorPaletteMode: DepthColorPaletteMode = 'inherit'
  paletteDriftDegrees = 45
  monochromeColor = { r: 255, g: 170, b: 80 }
  heatBias = 0.6
  hueShiftPerChild = 8
  childChanceJitterPerBurst = 0
  spreadAnisotropy = 1
  spreadRotationDegrees = 0
  depthProgram: DepthProgram = 'none'
  childDirectionMode: ChildDirectionMode = 'radial'
  inheritDirectionStrength = 0.65
  energyPerRootShot = 100
  energyCostPerChild = 1
  energyLossPerDepth = 0.18
  minEnergyToRecurse = 8
  recursionPhaseMode: RecursionPhaseMode = 'cometOnly'
  minLifeProgressBeforeExplode = 0.12
  maxTotalChildrenPerShot = 900
  minVisibleContribution = 0.03
  brightnessNormalizeByDepth = 0
  depthDelayByLevel: number[] = []
  burstEnvelope = { attack: 0, hold: 0.2, release: 0.8 }
  branchingMode: BranchingMode = 'probabilistic'
  minChildrenPerExplosion = 0
  maxChildrenPerExplosionByDepth: number[] = []
  childChanceDecayPerDepth = 0
  childBurstScaleByDepth: number[] = []
  childCometBiasByDepth: number[] = []
  spiralTwistByDepth: number[] = []
  childSpeedJitterByDepth: number[] = []
  recursionDelayByDepth: number[] = []
  depthEnergyByLevel: number[] = []
  branchEnvelopePeakDepthRatio = 0.5
  branchEnvelopeWidth = 0.55
  branchEnvelopeStrength = 0
  burstStability = 0
  burstVarianceDamping = 0
  recursionPacingBlend = 0
  recursionPacingJitterMs = 0
  seedSequenceMode: SeedSequenceMode = 'fixedCycle'
  seedCycleLength = 16
  seedRandomWalkStep = 104729
  recursionMode: RecursionMode = 'standard'
  childExplosionProbability = 1
  maxChildrenPerLevel = 9999
  maxChainTriggersPerFrame = 16
  chainReactionDelayMs = 140
  chainReactionRadius = 100
  chainReactionProbability = 0.35
  chainReactionDepthBoost = 0
  trailStyle: TrailStyle = 'classic'
  cometSizeStart = 1
  cometSizeEnd = 1
  explosionSizeStart = 1
  explosionSizeEnd = 0.15
  flickerStrength = 0
  flickerFrequency = 24
  brightnessVariance = 0
  zScaleEnabled = true
  zScaleStrength = 1
  layeredExplosionEnabled = false
  layeredExplosionCount = 2
  layeredExplosionDelayMs = 70
  heavyEffectsEnabled = true
  recursion: Record<string, any> | null = null
  explosion: Record<string, any> | null = null
  trail: Record<string, any> | null = null
  depth: Record<string, any> | null = null
  performance: Record<string, any> | null = null
  /** Optional macro show-script (motif timeline). Defaults off. */
  showScript: FireworkShowScriptConfig | null = null
  /** Optional intent knobs for quick art direction. Defaults off. */
  intent: IntentKnobs | null = null
  /** Optional role transition grammar for coherent recursive trees. Defaults off. */
  recursionGrammar: RecursionGrammarConfig | null = null
  /** Optional force fields affecting motion. Defaults off. */
  fieldForces: FieldForceConfig[] | null = null
  /** Optional beat-grid quantization for explosion triggers. Defaults off. */
  musicQuantize: MusicQuantizeConfig | null = null
  /** Optional diagnostics + replay capture. Defaults off. */
  diagnostics: DiagnosticsConfig | null = null

  cometTailEnabled = false
  cometTailSpawnChance = 0.06
  cometTailScale = 0.45
  cometTailLifeMultiplier = 0.35

  secondarySparkleTrail = false
  secondarySparkleChance = 0.1
  secondarySparkleScale = 0.5
  secondaryCrackle = false
  secondaryCrackleChance = 0.1
  secondaryCrackleCount = 4
  roleWeights = {
    spark: 0.62,
    comet: 0.2,
    glitter: 0.1,
    crackle: 0.05,
    ember: 0.03,
  }

  twoStageEnabled = false
  carrierCount = 8
  carrierLife = 0.35
  microBurstCount = 6
  microBurstDelayMs = 120
  microBurstSpread = 160

  shockwaveEnabled = false
  shockwaveSize = 2.4
  shockwaveLife = 0.4
  shockwaveByDepth: number[] = []
  glowEnabled = false
  glowLife = 0.55
  glowScale = 1.4
  glowByDepth: number[] = []

  windEnabled = false
  windMode: WindMode = 'constant'
  windVector = { x: 30, y: 0 }
  windStrength = 1
  windNoiseScale = 0.015
  windAffectComet = false
  windAffectSparks = true

  debugShowDepth = false
  debugShowVectors = false
  debugShowGovernor = false
  debugShowShotSeed = false

  seed = 0
  seedPerShotOffset = 7919

  /** Loaded texture asset keys for the root rising comet (depth 0). Empty = emitter default. */
  cometTextureKeys: string[] = []
  /** Keys for recursive shell comets (depth ≥ 1), shockwave, glow, carriers, micro-burst, secondary trail particles. Empty = emitter default. */
  explosionTextureKeys: string[] = []
  /** Keys for main burst sparks. Empty = emitter default. */
  explosionParticleTextureKeys: string[] = []

  // --- Ideation / extended modes (defaults off = no change vs legacy) ---
  echoCount = 0
  echoSpacingMs = 55
  echoScaleFalloff = 0.72
  echoChildCometChance = 1
  echoChildCometsFinalLayerOnly = true
  echoTrailSampleCap = 12

  shearAsymmetry = 0
  coneBiasDegrees = 0
  /** Per-depth 0..1 blend: explosion aim lerps toward velocity heading. */
  velocityBlendDepthCurve: number[] = []

  minefieldCellSize = 0
  mineArmProgress = 0.55
  maxMinesPerShot = 8
  mineStaggerMs = 40
  mineSpreadDegrees = 140

  spiralTurns = 2.5
  spiralTightness = 1
  armRoleAlternate = false

  waveK1 = 0
  waveK2 = 0
  /** Below this sine value, spawn may be culled (set to -1.5 … 0.8 when using waveK1/waveK2). */
  interferenceThreshold = -9
  waveAnchorMode: WaveAnchorMode = 'originOnly'

  orbitRadius = 0
  orbitSpeed = 0.35
  hatchDelayMs = 0
  hatchCometChance = 0

  curvatureThresholdRad = 0
  cornerBurstScale = 1
  cornerCooldownMs = 220
  cornerMicroBurstCount = 5

  zSheetSeparation = 0
  /** Multiplier on child comet chance for near-sheet spawns (slot 0). */
  nearSheetCometBias = 1
  /** Multiplier on child comet chance for far-sheet spawns (slot 1). */
  farSheetCometBias = 1
  pedigreeSaturationFloor = 0

  sportProbability = 0
  sportHueDelta = 42

  forkArity = 0
  forkAngleJitter = 0
  leafCometChance = 0

  gridCellPx = 0
  maxCrystallizeNuclei = 6
  crystallizeDelayMs = 80

  magneticMousePullEnabled = false
  mousePullStartProgress = 0.55
  mousePullStrength = 0
  outwardBiasDegrees = 0

  legendaryChance = 0
  sigilSides = 7
  legendaryBudgetCap = 400
  legendaryRecursionCap = 2

  mergeRadius = 0
  mergeProbability = 0
  maxMergesPerFrame = 4

  reactiveSource: ReactiveSourceMode = 'auto'
  reactiveSourceBlendMode: ReactiveSourceBlendMode = 'single'
  reactiveSourceWeights: { soundReactive: number; pulse: number; beatPhaseLock: number } = {
    soundReactive: 1,
    pulse: 1,
    beatPhaseLock: 1,
  }
  reactiveChannelWeights: {
    energy: number
    lowBand: number
    midBand: number
    highBand: number
    beat: number
    pulsePhase: number
    beatPhase: number
    beatPhaseToEnergy: number
  } = {
    energy: 1,
    lowBand: 1,
    midBand: 1,
    highBand: 1,
    beat: 1,
    pulsePhase: 1,
    beatPhase: 1,
    beatPhaseToEnergy: 0,
  }
  reactiveSourcePriority: Array<'soundReactive' | 'pulse' | 'beatPhaseLock'> = ['soundReactive', 'pulse', 'beatPhaseLock']
  reactiveMode: ReactiveMode = 'off'
  reactiveGain = 1
  reactiveSmoothing = 0.24
  reactiveThreshold = 0.35
  reactiveCooldownMs = 140
  reactiveCooldownJitterMs = 0
  reactiveInfluence = 0.6
  reactiveShapeJitter = 0.45
  reactiveAttack = 0.3
  reactiveRelease = 0.14
  reactiveThresholdOn = 0.4
  reactiveThresholdOff = 0.28
  reactiveRouting: {
    burstAmount: number
    recursionChance: number
    spread: number
    baseAngle: number
  } = {
    burstAmount: 1,
    recursionChance: 1,
    spread: 1,
    baseAngle: 1,
  }
  reactivePaletteHueRange = 90
  reactivePaletteSaturationBoost = 0.35
  debugReactiveSignals = false
  debugReactiveLogEveryFrames = 24
  reactiveEnvelopeAttackMs = 35
  reactiveEnvelopeReleaseMs = 120
  reactiveV2: ReactiveV2Config | null = null
  reactiveTraceMode: 'off' | 'record' | 'playback' = 'off'
  reactiveTraceValues: number[] = []
  reactiveTraceLoop = true
  private reactiveEnergySmoothed = 0
  private reactiveGateOn = false
  private reactiveBeatLatchSec = 0
  private reactiveDebugFrameCounter = 0
  private reactiveTraceCursor = 0

  private perUid = new Map<number, FireworkState>()
  private pendingSeed = new Map<number, FireworkState>()
  private spawnedThisFrame = 0
  private randomCounter = 0
  private shotCounter = 0
  private seedWalkOffset = 0
  private spawnedThisShot = 0
  private latestEmitter: MutableEmitter | null = null
  private latestModel: Model | null = null
  private chainReactionEvents: Array<{ x: number; y: number; depth: number; delaySec: number; ttlSec: number; radius: number }> = []
  private chainTriggeredThisFrame = 0
  private echoBurstQueue: Array<{
    delaySec: number
    x: number
    y: number
    z: number
    vx: number
    vy: number
    depth: number
    echoIndex: number
    echoTotal: number
    shotSeedPhase: number
    burstEnergy: number
    originX: number
    originY: number
    cometChanceScale: number
    startColor: { r: number; g: number; b: number }
  }> = []
  private mineBurstQueue: Array<{ delaySec: number; x: number; y: number; z: number; depth: number; color: { r: number; g: number; b: number } }> = []
  private minesSpawnedThisShot = 0
  private crystallizeQueue: Array<{ delaySec: number; x: number; y: number; z: number; depth: number; color: { r: number; g: number; b: number }; count: number }> = []
  private cometTrailByUid = new Map<number, Array<{ x: number; y: number; vx: number; vy: number }>>()
  private mergeBudgetThisFrame = 0
  private shockwaveEvents: ShockwaveEvent[] = []
  private timeSec = 0
  private shotStartTimeSec = 0
  private lastReplayPack: any = null
  private spawnedThisSecond = 0
  private secondWindowTimerSec = 0

  update = () => {
    this.resolveConfigGroups()
    this.reactiveDebugFrameCounter += 1
    if (this.reactiveBeatLatchSec > 0) this.reactiveBeatLatchSec = Math.max(0, this.reactiveBeatLatchSec - 1 / 60)
    this.spawnedThisFrame = 0
    this.chainTriggeredThisFrame = 0
    this.mergeBudgetThisFrame = 0
    this.timeSec += 1 / 60
    this.secondWindowTimerSec += 1 / 60
    if (this.secondWindowTimerSec >= 1) {
      this.secondWindowTimerSec = 0
      this.spawnedThisSecond = 0
    }
    if (this.chainReactionEvents.length > 0) {
      this.chainReactionEvents = this.chainReactionEvents
        .map((event) => ({ ...event, delaySec: event.delaySec - 1 / 60, ttlSec: event.ttlSec - 1 / 60 }))
        .filter((event) => event.ttlSec > 0)
    }
    if (this.shockwaveEvents.length > 0) {
      this.shockwaveEvents = this.shockwaveEvents
        .map((e) => ({ ...e, delaySec: e.delaySec - 1 / 60, ttlSec: e.ttlSec - 1 / 60 }))
        .filter((e) => e.ttlSec > 0)
    }
    this.flushEchoBursts()
    this.flushMineBursts()
    this.flushCrystallize()
    this.applyShockwaves()
  }

  init = (particle: Particle) => {
    if (!this.enabled) return
    const seeded = this.pendingSeed.get(particle.uid)
    if (seeded) {
      this.perUid.set(particle.uid, seeded)
      this.pendingSeed.delete(particle.uid)
      this.applySpawnTexturePool(particle, seeded)
      return
    }
    const rootState = this.createState(0)
    rootState.originX = particle.movement.x
    rootState.originY = particle.movement.y
    this.perUid.set(particle.uid, rootState)
    this.applySpawnTexturePool(particle, rootState)
  }

  apply = (particle: Particle, deltaTime: number, model: Model) => {
    if (!this.enabled) return
    const state = this.perUid.get(particle.uid)
    if (!state) return
    this.latestModel = model
    this.latestEmitter = (model as any).emitter as MutableEmitter
    if (this.triggerMode === 'distanceFromOrigin' && state.depth === 0 && !state.originAnchored) {
      state.originX = particle.movement.x
      state.originY = particle.movement.y
      state.originAnchored = true
    }

    if (state.phase === 'spark') {
      this.applyFieldForces(particle, state, deltaTime)
      this.applySpark(particle, state, deltaTime)
      this.applyDepth(particle, state, deltaTime)
      return
    }

    this.applyFieldForces(particle, state, deltaTime)
    this.applyComet(particle, state, deltaTime)
    this.applyDepth(particle, state, deltaTime)
    this.tryChainReactionTrigger(particle, state, model)
    if (this.shouldExplode(particle, state)) {
      this.triggerExplosion(particle, state, model)
      particle.lifeTime = particle.maxLifeTime
    }
  }

  onParticleRemoved = (particle: Particle) => {
    this.perUid.delete(particle.uid)
    this.pendingSeed.delete(particle.uid)
    this.cometTrailByUid.delete(particle.uid)
  }

  private createState(depth: number, parent?: FireworkState | null): FireworkState {
    let color = this.pickColor(depth)
    let sportGenerationsLeft = 0
    if (parent && parent.sportGenerationsLeft > 0) {
      color = this.shiftHue(color, this.hueShiftPerChild * 0.5)
      sportGenerationsLeft = parent.sportGenerationsLeft - 1
    }
    if (this.sportProbability > 0 && this.random(depth + 918273) < this.sportProbability) {
      color = this.shiftHue(color, this.sportHueDelta)
      sportGenerationsLeft = Math.max(sportGenerationsLeft, 1)
    }
    const recursionDepthPenalty = parent ? parent.recursionDepthPenalty : 0
    return {
      phase: 'comet',
      depth,
      explodeAtProgress: this.randomRange(this.explosionTriggerMin, this.explosionTriggerMax),
      baseSize: depth === 0 ? 1 : this.childSizeMultiplier(depth),
      startAlpha: depth === 0 ? 0 : this.explosionAlphaStart,
      endAlpha: depth === 0 ? 0 : this.explosionAlphaEnd,
      startColor: color,
      endColor: color,
      zVelocity: this.zVelocity + this.varianceFrom(this.zVelocityVariance),
      zAcceleration: this.zAcceleration,
      originX: 0,
      originY: 0,
      activationDelaySec: 0,
      carrierStage: false,
      burstEnergy: 0,
      depthDelaySec: 0,
      shotSeedPhase: 0,
      hasExploded: false,
      role: 'comet',
      originAnchored: false,
      chainTriggered: false,
      textureImageGroup: depth === 0 ? 'comet' : 'explosion',
      sportGenerationsLeft,
      recursionDepthPenalty,
      headingSmooth: null,
      headingTurnAccum: 0,
      cornerCooldownSec: 0,
      zSheetSlot: 0,
      cornerMicroPending: false,
    }
  }

  private getTextureKeysForGroup(group: FireworkTextureImageGroup): string[] {
    const raw = group === 'comet' ? this.cometTextureKeys : group === 'explosion' ? this.explosionTextureKeys : this.explosionParticleTextureKeys
    if (!Array.isArray(raw)) return []
    return raw.filter((k) => typeof k === 'string' && k.length > 0)
  }

  private applySpawnTexturePool(particle: Particle, state: FireworkState) {
    const pool = this.getTextureKeysForGroup(state.textureImageGroup)
    particle.spawnTexturePool = pool.length > 0 ? pool : null
  }

  private applyComet(particle: Particle, state: FireworkState, dt: number) {
    const vx = particle.velocity.x
    const vy = particle.velocity.y
    const len = Math.sqrt(vx * vx + vy * vy) || 1
    const dirX = vx / len
    const dirY = vy / len
    const perpX = -dirY
    const perpY = dirX
    const t = particle.lifeProgress * Math.PI * 2
    const wobble = Math.sin(t + particle.uid * 0.19) * (this.cometCurve + this.varianceFrom(this.cometCurveVariance))
    const grain = Math.cos(t * 3 + particle.uid * 0.07) * (this.cometNoise + this.varianceFrom(this.cometNoiseVariance))
    particle.acceleration.x += perpX * (wobble + grain) * dt
    particle.acceleration.y += perpY * (wobble + grain) * dt
    if (this.windEnabled && this.windAffectComet) this.applyWind(particle)

    if (state.depth === 0 && this.echoCount >= 1) {
      let trail = this.cometTrailByUid.get(particle.uid)
      if (!trail) {
        trail = []
        this.cometTrailByUid.set(particle.uid, trail)
      }
      trail.push({ x: particle.movement.x, y: particle.movement.y, vx: particle.velocity.x, vy: particle.velocity.y })
      const cap = Math.max(4, Math.round(this.echoTrailSampleCap))
      while (trail.length > cap) trail.shift()
    }

    if (this.curvatureThresholdRad > 0) {
      const spd = Math.hypot(particle.velocity.x, particle.velocity.y)
      if (spd > 8) {
        const h = Math.atan2(particle.velocity.y, particle.velocity.x)
        if (state.headingSmooth === null) state.headingSmooth = h
        else {
          let dh = h - state.headingSmooth
          while (dh > Math.PI) dh -= Math.PI * 2
          while (dh < -Math.PI) dh += Math.PI * 2
          state.headingSmooth = this.lerp(state.headingSmooth, h, 0.35)
          state.headingTurnAccum += Math.abs(dh)
          if (state.cornerCooldownSec > 0) state.cornerCooldownSec -= 1 / 60
          if (state.headingTurnAccum >= this.curvatureThresholdRad && state.cornerCooldownSec <= 0) {
            state.explodeAtProgress = Math.min(state.explodeAtProgress, particle.lifeProgress + 0.05) * this.cornerBurstScale
            state.cornerCooldownSec = Math.max(0.05, this.cornerCooldownMs / 1000)
            state.headingTurnAccum = 0
            state.recursionDepthPenalty += 1
            state.cornerMicroPending = true
          }
        }
      }
    }

    const p = particle.lifeProgress
    const fadeIn = this.cometFadeIn <= 0 ? 1 : this.clamp01(p / this.cometFadeIn)
    const fadeOutStart = Math.max(0, 1 - this.cometFadeOut)
    const fadeOut = p <= fadeOutStart ? 1 : this.clamp01((1 - p) / Math.max(0.001, 1 - fadeOutStart))
    particle.color.alpha = this.clamp01(fadeIn * fadeOut)
    const rgb = this.applyPaletteAnimation(
      {
        r: this.lerp(state.startColor.r, state.endColor.r, p),
        g: this.lerp(state.startColor.g, state.endColor.g, p),
        b: this.lerp(state.startColor.b, state.endColor.b, p),
      },
      p,
      state.depth,
      state.phase,
    )
    this.applyDepthColor(particle, rgb, state.depth)
    const cometScale = this.lerp(this.cometSizeStart, this.cometSizeEnd, p)
    const bright = this.getBrightnessFactor(particle.uid, p, state.depth)
    particle.size.x = Math.max(0.02, state.baseSize * cometScale)
    particle.size.y = Math.max(0.02, state.baseSize * cometScale)
    particle.color.alpha = this.clamp01(particle.color.alpha * bright)
    this.applyTrailStyleToParticle(particle, state, p)
  }

  private applySpark(particle: Particle, state: FireworkState, deltaTime: number) {
    if (state.activationDelaySec > 0) {
      state.activationDelaySec -= 1 / 60
      particle.color.alpha = 0
      return
    }
    if (state.depthDelaySec > 0) {
      state.depthDelaySec -= 1 / 60
      particle.color.alpha = 0
      return
    }
    const p = this.clamp01(particle.lifeProgress)
    particle.color.alpha = this.lerp(state.startAlpha, state.endAlpha, p)
    const rgb = this.applyPaletteAnimation(
      {
        r: this.lerp(state.startColor.r, state.endColor.r, p),
        g: this.lerp(state.startColor.g, state.endColor.g, p),
        b: this.lerp(state.startColor.b, state.endColor.b, p),
      },
      p,
      state.depth,
      state.phase,
    )
    this.applyDepthColor(particle, rgb, state.depth)
    const sparkScale = this.lerp(this.explosionSizeStart, this.explosionSizeEnd, p)
    const bright = this.getBrightnessFactor(particle.uid, p, state.depth)
    particle.size.x = Math.max(0.02, state.baseSize * sparkScale)
    particle.size.y = Math.max(0.02, state.baseSize * sparkScale)
    particle.color.alpha = this.clamp01(particle.color.alpha * bright)
    if (this.windEnabled && this.windAffectSparks) this.applyWind(particle)

    if (this.magneticMousePullEnabled && this.mousePullStrength > 0) {
      const pw = this.latestModel?.pointerWorld
      if (pw && p >= this.clamp01(this.mousePullStartProgress)) {
        const dx = pw.x - particle.movement.x
        const dy = pw.y - particle.movement.y
        const len = Math.hypot(dx, dy) || 1
        const pull = this.mousePullStrength * 0.22
        particle.velocity.x += (dx / len) * pull * deltaTime
        particle.velocity.y += (dy / len) * pull * deltaTime
      }
    }

    if (this.minefieldCellSize > 0.5) {
      const g = this.minefieldCellSize
      const ix = Math.floor(particle.movement.x / g)
      const iy = Math.floor(particle.movement.y / g)
      if (state.lastMineIx !== ix || state.lastMineIy !== iy) {
        state.lastMineIx = ix
        state.lastMineIy = iy
        if (
          p >= this.clamp01(this.mineArmProgress) &&
          this.minesSpawnedThisShot < Math.max(1, Math.round(this.maxMinesPerShot)) &&
          this.random(particle.uid + ix * 131 + iy * 17) < 0.9
        ) {
          this.minesSpawnedThisShot += 1
          this.mineBurstQueue.push({
            delaySec: (this.mineStaggerMs / 1000) * (0.2 + this.random(particle.uid + 901) * 0.8),
            x: particle.movement.x,
            y: particle.movement.y,
            z: particle.z,
            depth: state.depth,
            color: { ...state.startColor },
          })
        }
      }
    }

    if (this.twoStageEnabled && state.carrierStage && p > this.clamp01(this.microBurstDelayMs / 1000 / Math.max(0.01, particle.maxLifeTime))) {
      state.carrierStage = false
      this.spawnMicroBurst(particle, state)
      particle.lifeTime = particle.maxLifeTime
    }
    if (!state.hasExploded && (this.recursionPhaseMode === 'sparkOnly' || this.recursionPhaseMode === 'both')) {
      const shouldSparkExplode = this.shouldExplode(particle, state)
      if (shouldSparkExplode && particle.lifeProgress >= this.minLifeProgressBeforeExplode) {
        const model = this.latestModel
        if (model) {
          this.triggerExplosion(particle, state, model)
          state.hasExploded = true
        }
      }
    }
  }

  private applyDepth(particle: Particle, state: FireworkState, dt: number) {
    state.zVelocity += state.zAcceleration * dt
    particle.z += state.zVelocity * dt
    if (particle.sprite) particle.sprite.zIndex = this.zIndexBase + particle.z * this.zIndexFactor
    const depth = Math.max(1, this.perspectiveDepth)
    const strength = Math.max(0, this.perspectiveStrength)
    const exponent = Math.max(0.1, this.perspectiveExponent)
    const perspectiveDenom = Math.max(1, depth + particle.z * strength)
    const perspective = depth / perspectiveDenom
    const curvedPerspective = Math.pow(Math.max(0.0001, perspective), exponent)
    const farMin = Math.max(0.001, this.perspectiveFarScaleMin)
    const nearMax = Math.max(farMin, this.perspectiveNearScaleMax)
    const boundedPerspective = Math.max(farMin, Math.min(nearMax, curvedPerspective))
    const zScale = this.zScaleEnabled
      ? this.lerp(1, boundedPerspective, this.clamp01(this.zScaleStrength))
      : 1
    particle.size.x = Math.max(0.02, particle.size.x * zScale)
    particle.size.y = Math.max(0.02, particle.size.y * zScale)
    if (this.depthAlphaFalloff > 0) particle.color.alpha *= Math.max(0.25, 1 - state.depth * this.depthAlphaFalloff)
    if (this.depthAlphaByDepth.length > 0) particle.color.alpha *= Math.max(0, this.getByDepth(this.depthAlphaByDepth, state.depth, 1))
    if (this.depthFogAlpha > 0 && this.depthFogFar > this.depthFogNear) {
      const fogT = this.clamp01((particle.z - this.depthFogNear) / Math.max(1, this.depthFogFar - this.depthFogNear))
      particle.color.alpha *= 1 - fogT * this.clamp01(this.depthFogAlpha)
    }
  }

  private beginLegendaryOverride(state: FireworkState): { restore: () => void } {
    const saved = {
      burstShape: this.burstShape,
      starPoints: this.starPoints,
      recursionDepth: this.recursionDepth,
      maxTotalChildrenPerShot: this.maxTotalChildrenPerShot,
      glowEnabled: this.glowEnabled,
      shockwaveEnabled: this.shockwaveEnabled,
    }
    if (state.depth !== 0 || this.legendaryChance <= 0 || this.random(701001) >= this.legendaryChance) {
      return { restore: () => {} }
    }
    this.burstShape = 'star'
    this.starPoints = Math.max(3, Math.round(this.sigilSides))
    this.recursionDepth = Math.min(this.recursionDepth, Math.max(1, Math.round(this.legendaryRecursionCap)))
    this.maxTotalChildrenPerShot = Math.min(this.maxTotalChildrenPerShot, Math.max(40, Math.round(this.legendaryBudgetCap)))
    this.glowEnabled = true
    this.shockwaveEnabled = true
    return {
      restore: () => {
        this.burstShape = saved.burstShape
        this.starPoints = saved.starPoints
        this.recursionDepth = saved.recursionDepth
        this.maxTotalChildrenPerShot = saved.maxTotalChildrenPerShot
        this.glowEnabled = saved.glowEnabled
        this.shockwaveEnabled = saved.shockwaveEnabled
      },
    }
  }

  private readReactiveInput(model: Model) {
    const src = model.reactiveSignals
    const sourceMatches =
      this.reactiveSource === 'auto' ||
      src.source === 'mixed' ||
      src.source === this.reactiveSource
    if (!sourceMatches) {
      return { energy: 0, beat: 0, low: 0, mid: 0, high: 0, pulsePhase: 0, beatPhase: 0 }
    }
    const gain = Math.max(0, this.reactiveGain)
    let targetEnergy = this.clamp01((src.energy || 0) * gain)
    if (this.reactiveSafetyDamping > 0 && this.latestEmitter) {
      const budgetRatio = this.latestEmitter.list.length / Math.max(1, this.maxTotalSpawnBudget)
      const pressure = this.clamp01((budgetRatio - 0.65) / 0.35)
      const damp = this.lerp(1, Math.max(0.2, 1 - this.clamp01(this.reactiveSafetyDamping)), pressure)
      targetEnergy *= damp
    }
    if (this.reactiveTraceMode === 'playback' && this.reactiveTraceValues.length > 0) {
      const idx = Math.max(0, Math.min(this.reactiveTraceValues.length - 1, this.reactiveTraceCursor))
      targetEnergy = this.clamp01(this.reactiveTraceValues[idx] || 0)
      this.reactiveTraceCursor += 1
      if (this.reactiveTraceCursor >= this.reactiveTraceValues.length) {
        this.reactiveTraceCursor = this.reactiveTraceLoop ? 0 : this.reactiveTraceValues.length - 1
      }
    } else if (this.reactiveTraceMode === 'record') {
      this.reactiveTraceValues.push(targetEnergy)
      if (this.reactiveTraceValues.length > 4096) this.reactiveTraceValues.shift()
    }
    const attack = this.clamp01(this.reactiveAttack > 0 ? this.reactiveAttack : this.reactiveSmoothing)
    const release = this.clamp01(this.reactiveRelease > 0 ? this.reactiveRelease : this.reactiveSmoothing)
    const isRising = targetEnergy > this.reactiveEnergySmoothed
    this.reactiveEnergySmoothed = this.lerp(this.reactiveEnergySmoothed, targetEnergy, isRising ? attack : release)
    const thresholdOn = this.clamp01(Math.max(this.reactiveThreshold, this.reactiveThresholdOn))
    const thresholdOff = this.clamp01(Math.min(thresholdOn, this.reactiveThresholdOff))
    if (!this.reactiveGateOn && this.reactiveEnergySmoothed >= thresholdOn) this.reactiveGateOn = true
    if (this.reactiveGateOn && this.reactiveEnergySmoothed <= thresholdOff) this.reactiveGateOn = false
    const beat = src.beat > 0.5 || this.reactiveGateOn ? 1 : 0
    if (beat > 0 && this.reactiveBeatLatchSec <= 0) {
      const jitterMs = this.varianceFrom(Math.max(0, this.reactiveCooldownJitterMs))
      this.reactiveBeatLatchSec = Math.max(0, (this.reactiveCooldownMs + jitterMs) / 1000)
    }
    if (this.debugReactiveSignals && this.reactiveDebugFrameCounter % Math.max(1, Math.round(this.debugReactiveLogEveryFrames)) === 0) {
      // Lightweight diagnostics for tuning reactive mappings in live sessions.
      // eslint-disable-next-line no-console
      console.debug('[RecursiveFireworkBehaviour/reactive]', {
        source: src.source,
        energy: this.reactiveEnergySmoothed,
        beat,
        low: src.lowBand || 0,
        mid: src.midBand || 0,
        high: src.highBand || 0,
        pulsePhase: src.pulsePhase || 0,
        beatPhase: src.beatPhase || 0,
      })
    }
    return {
      energy: this.reactiveEnergySmoothed,
      beat,
      low: this.clamp01((src.lowBand || 0) * gain),
      mid: this.clamp01((src.midBand || 0) * gain),
      high: this.clamp01((src.highBand || 0) * gain),
      loudness: this.clamp01((src.loudness || 0) * gain),
      onset: this.clamp01((src.onset || 0) * gain),
      flux: this.clamp01((src.flux || 0) * gain),
      pulsePhase: this.clamp01(src.pulsePhase || 0),
      beatPhase: this.clamp01(src.beatPhase || 0),
      phase1x: this.clamp01(src.phase1x || 0),
      phase2x: this.clamp01(src.phase2x || 0),
      phase4x: this.clamp01(src.phase4x || 0),
    }
  }

  private applyReactiveV2Curve(t: number, curve: ReactiveV2Curve) {
    const x = this.clamp01(t)
    if (curve === 'linear') return x
    if (curve === 'easeIn') return x * x
    if (curve === 'easeOut') return 1 - (1 - x) * (1 - x)
    if (curve === 'easeInOut') return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2
    if (curve === 'smoothstep') return x * x * (3 - 2 * x)
    if (curve === 'step') return x >= 0.5 ? 1 : 0
    return x
  }

  private softKneeLimit(x: number, knee: number, ratio: number, ceiling: number) {
    const v = Math.max(0, x)
    const c = Math.max(0.0001, ceiling)
    const k = this.clamp01(knee)
    const r = Math.max(1, ratio)
    const t0 = c * (1 - k)
    if (v <= t0) return v
    const over = v - t0
    const compressed = t0 + over / r
    return Math.min(c, compressed)
  }

  private evalReactiveV2(
    reactive: any,
    state: FireworkState,
  ): {
    spawnAmountMult: number
    childChanceAdd: number
    childChanceMult: number
    spreadMult: number
    baseAngleAddRad: number
    speedMult: number
    lifeMult: number
    alphaMult: number
    paletteHueAddDeg: number
    paletteSatMult: number
  } {
    const cfg = this.reactiveV2
    const out = {
      spawnAmountMult: 1,
      childChanceAdd: 0,
      childChanceMult: 1,
      spreadMult: 1,
      baseAngleAddRad: 0,
      speedMult: 1,
      lifeMult: 1,
      alphaMult: 1,
      paletteHueAddDeg: 0,
      paletteSatMult: 1,
    }
    if (!cfg?.enabled) return out

    const gain = Math.max(0, cfg.gain ?? 1)
    const knee = cfg.limiter?.knee ?? 0.2
    const ratio = cfg.limiter?.ratio ?? 3
    const ceiling = cfg.limiter?.ceiling ?? 1

    const get = (ch: ReactiveV2Channel) => {
      const raw =
        ch === 'energy'
          ? reactive.energy
          : ch === 'loudness'
            ? reactive.loudness
            : ch === 'onset'
              ? reactive.onset
              : ch === 'flux'
                ? reactive.flux
                : ch === 'low'
                  ? reactive.low
                  : ch === 'mid'
                    ? reactive.mid
                    : ch === 'high'
                      ? reactive.high
                      : ch === 'beat'
                        ? reactive.beat
                        : ch === 'pulsePhase'
                          ? reactive.pulsePhase
                          : ch === 'beatPhase'
                            ? reactive.beatPhase
                            : ch === 'phase1x'
                              ? reactive.phase1x
                              : ch === 'phase2x'
                                ? reactive.phase2x
                                : reactive.phase4x
      const v = this.clamp01((raw || 0) * gain)
      if (ch === 'energy' || ch === 'loudness') return this.softKneeLimit(v, knee, ratio, ceiling)
      return v
    }

    const rows = Array.isArray(cfg.matrix) ? cfg.matrix : []
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row) continue
      const curve = (row.curve || 'linear') as ReactiveV2Curve
      let t = this.applyReactiveV2Curve(get(row.source), curve)
      const cmin = row.clampMin
      const cmax = row.clampMax
      if (typeof cmin === 'number') t = Math.max(cmin, t)
      if (typeof cmax === 'number') t = Math.min(cmax, t)
      const amt = (row.amount || 0) * this.clamp01(this.reactiveInfluence)
      const delta = t * amt
      if (row.target === 'spawnAmountMult') out.spawnAmountMult *= Math.max(0, 1 + delta)
      else if (row.target === 'childChanceAdd') out.childChanceAdd += delta
      else if (row.target === 'childChanceMult') out.childChanceMult *= Math.max(0, 1 + delta)
      else if (row.target === 'spreadMult') out.spreadMult *= Math.max(0, 1 + delta)
      else if (row.target === 'baseAngleAddRad') out.baseAngleAddRad += delta
      else if (row.target === 'speedMult') out.speedMult *= Math.max(0.05, 1 + delta)
      else if (row.target === 'lifeMult') out.lifeMult *= Math.max(0.05, 1 + delta)
      else if (row.target === 'alphaMult') out.alphaMult *= Math.max(0, 1 + delta)
      else if (row.target === 'paletteHueAddDeg') out.paletteHueAddDeg += delta * 180
      else if (row.target === 'paletteSatMult') out.paletteSatMult *= Math.max(0, 1 + delta)
    }

    // Depth dampening to keep recursion stable unless user explicitly counteracts.
    const depthDamp = 1 / (1 + Math.max(0, state.depth) * 0.35)
    out.spawnAmountMult = this.lerp(1, out.spawnAmountMult, depthDamp)
    out.childChanceMult = this.lerp(1, out.childChanceMult, depthDamp)

    // Perf governor: scale modulation down when near budgets.
    if (cfg.perf?.enabled && this.latestEmitter) {
      const startRatio = this.clamp01(cfg.perf.startRatio ?? 0.65)
      const fullRatio = this.clamp01(Math.max(startRatio + 0.01, cfg.perf.fullRatio ?? 0.92))
      const minMult = this.clamp01(cfg.perf.minMult ?? 0.2)
      const budgetRatio = this.latestEmitter.list.length / Math.max(1, this.maxTotalSpawnBudget)
      const t = this.clamp01((budgetRatio - startRatio) / Math.max(0.0001, fullRatio - startRatio))
      const mult = this.lerp(1, minMult, t)
      out.spawnAmountMult = this.lerp(1, out.spawnAmountMult, mult)
      out.childChanceMult = this.lerp(1, out.childChanceMult, mult)
      out.childChanceAdd *= mult
      out.spreadMult = this.lerp(1, out.spreadMult, mult)
      out.baseAngleAddRad *= mult
      out.speedMult = this.lerp(1, out.speedMult, mult)
      out.lifeMult = this.lerp(1, out.lifeMult, mult)
      out.alphaMult = this.lerp(1, out.alphaMult, mult)
      out.paletteHueAddDeg *= mult
      out.paletteSatMult = this.lerp(1, out.paletteSatMult, mult)
    }
    return out
  }

  private getReactiveRoutingTemplate(mode: ReactiveMode) {
    if (mode === 'beatBurst') return { burstAmount: 1, recursionChance: 0.25, spread: 0.35, baseAngle: 0.15 }
    if (mode === 'spectralShapeMorph') return { burstAmount: 0.25, recursionChance: 0.2, spread: 1, baseAngle: 0.2 }
    if (mode === 'energyRecursion') return { burstAmount: 0.35, recursionChance: 1, spread: 0.2, baseAngle: 0.15 }
    if (mode === 'phaseLockedOrbit') return { burstAmount: 0.3, recursionChance: 0.3, spread: 0.25, baseAngle: 1 }
    if (mode === 'paletteEnergyMorph') return { burstAmount: 0.2, recursionChance: 0.3, spread: 0.15, baseAngle: 0.25 }
    return { burstAmount: 0, recursionChance: 0, spread: 0, baseAngle: 0 }
  }

  private applyReactivePaletteMorph(
    color: { r: number; g: number; b: number },
    reactive: { energy: number; low: number; high: number },
  ) {
    if (this.reactiveMode !== 'paletteEnergyMorph') return color
    const influence = this.clamp01(this.reactiveInfluence)
    if (influence <= 0) return color
    const spectralBalance = this.clamp01(0.5 + (reactive.high - reactive.low) * 0.7)
    const hueSign = spectralBalance >= 0.5 ? 1 : -1
    const hueShift = hueSign * this.reactivePaletteHueRange * reactive.energy * influence
    const satBoost = 1 + this.reactivePaletteSaturationBoost * reactive.energy * influence
    return this.saturateRgb(this.shiftHue(color, hueShift), satBoost)
  }

  private triggerExplosion(particle: Particle, state: FireworkState, model: Model) {
    const emitter = (model as any).emitter as MutableEmitter | undefined
    if (!emitter) return
    this.latestEmitter = emitter
    this.latestModel = model
    if (state.depth === 0) {
      this.shotCounter += 1
      this.spawnedThisShot = 0
      this.minesSpawnedThisShot = 0
      this.shotStartTimeSec = this.timeSec
    }
    if (state.hasExploded) return
    if (particle.lifeProgress < this.minLifeProgressBeforeExplode) return
    if (state.phase === 'comet' && this.recursionPhaseMode === 'sparkOnly') return
    if (state.phase === 'spark' && this.recursionPhaseMode === 'cometOnly') return
    state.hasExploded = true
    const leg = this.beginLegendaryOverride(state)
    try {
      this.applyShowScript(state)
      const intent = this.getIntentScalars()
      if (intent.spectacle > 0.001) {
        this.heavyEffectsEnabled = true
        if (this.random(991100) < intent.spectacle * 0.7) this.glowEnabled = true
        if (this.random(991101) < intent.spectacle * 0.55) this.shockwaveEnabled = true
      }
      const governor = this.getAdaptiveGovernor(emitter)
      const lodGov = this.getLodSecondaryGovernor(emitter)
      const shotGov = this.getShotPressureGovernor()
      const plannerGov = this.getRecursionPlannerGovernor(emitter, state.depth)
      const reactive = this.readReactiveInput(model)
      const reactiveOn = this.reactiveMode !== 'off'
      const v2 = this.evalReactiveV2(reactive, state)
      this.applyDepthProgramForState()
      const depthCount = this.getByDepth(this.countByDepth, state.depth, this.explosionParticleCount)
      const depthScale = Math.max(0, this.getByDepth(this.childBurstScaleByDepth, state.depth, 1))
      const envelope = this.getBranchEnvelope(state.depth)
      const route = this.getReactiveRoutingTemplate(this.reactiveMode)
      const routeBurst = this.clamp01((this.reactiveRouting?.burstAmount ?? 1) * route.burstAmount)
      const routeRecurse = this.clamp01((this.reactiveRouting?.recursionChance ?? 1) * route.recursionChance)
      const routeSpread = this.clamp01((this.reactiveRouting?.spread ?? 1) * route.spread)
      const routeAngle = this.clamp01((this.reactiveRouting?.baseAngle ?? 1) * route.baseAngle)
      let rawAmount = this.getRawSpawnAmount(depthCount, state.depth) * governor * lodGov * shotGov * plannerGov * depthScale * envelope * intent.amount
      if (reactiveOn && this.reactiveMode === 'beatBurst') {
        const threshold = this.clamp01(this.reactiveThreshold)
        const beatPunch = reactive.beat > 0 && this.reactiveBeatLatchSec > 0 ? 1 : 0
        const energyOver = this.clamp01((reactive.energy - threshold) / Math.max(0.0001, 1 - threshold))
        const burstDrive = Math.max(beatPunch, energyOver)
        const influence = this.clamp01(this.reactiveInfluence * Math.max(0.2, routeBurst))
        // Intentionally strong contrast:
        // - off-beat / low energy => sparse bursts
        // - on-beat / high energy => dense bursts
        const lowFactor = this.lerp(0.08, 0.35, influence)
        const highFactor = this.lerp(1.2, 2.7, influence)
        rawAmount *= this.lerp(lowFactor, highFactor, burstDrive)
      }
      rawAmount *= v2.spawnAmountMult
      const amount = this.getSpawnAmountForDepth(state.depth, rawAmount)
      const remainingShotBudget = Math.max(0, this.maxTotalChildrenPerShot - this.spawnedThisShot)
      const cappedAmount = Math.min(amount, remainingShotBudget)
      const spreadDeg = this.getByDepth(this.spreadByDepth, state.depth, this.spreadDegrees) * intent.spread
      let spread = (Math.PI * spreadDeg) / 180
      let base = this.getExplosionBaseAngle(particle, state)
      if (reactiveOn && this.reactiveMode === 'spectralShapeMorph') {
        const balance = this.clamp01(0.5 + (reactive.high - reactive.low) * this.clamp01(this.reactiveShapeJitter))
        spread *= this.lerp(0.58, 1.25, balance * Math.max(0.2, routeSpread))
      }
      if (reactiveOn && this.reactiveMode === 'phaseLockedOrbit') {
        const phase = reactive.beatPhase > 0 ? reactive.beatPhase : reactive.pulsePhase
        base += (phase - 0.5) * Math.PI * this.clamp01(this.reactiveInfluence * Math.max(0.2, routeAngle))
      }
      spread *= v2.spreadMult
      base += v2.baseAngleAddRad
      const start = base - spread * 0.5
      const baseChildChance = this.getByDepth(this.childChanceByDepth, state.depth, this.childCometProbability)
      const depthChanceDecay = Math.pow(1 - this.clamp01(this.childChanceDecayPerDepth), Math.max(0, state.depth))
      const depthChanceBias = Math.max(0, this.getByDepth(this.childCometBiasByDepth, state.depth, 1))
      let childChance = this.clamp01(
        (baseChildChance + this.varianceFrom(this.childChanceJitterPerBurst)) * governor * lodGov * shotGov * depthChanceDecay * depthChanceBias * envelope,
      )
      childChance = this.clamp01(childChance * intent.childChance)
      if (reactiveOn && this.reactiveMode === 'energyRecursion') {
        const t = this.clamp01((reactive.energy - this.clamp01(this.reactiveThreshold)) / Math.max(0.0001, 1 - this.clamp01(this.reactiveThreshold)))
        childChance = this.clamp01(
          this.lerp(childChance * 0.55, childChance * (1 + this.clamp01(this.reactiveInfluence * Math.max(0.2, routeRecurse)) * 1.1), t),
        )
      }
      childChance = this.clamp01((childChance + v2.childChanceAdd) * v2.childChanceMult)
      const lodDepthLimit = this.getLodDepthLimit(emitter)
      const maxDepthEff = Math.max(0, this.recursionDepth - state.recursionDepthPenalty)
      const canRecurse = state.depth < Math.min(maxDepthEff, lodDepthLimit)
      const availableEnergy = this.getAvailableEnergy(state)
      if (this.spawnedThisShot >= this.maxTotalChildrenPerShot) return

      const justSpawned: Particle[] = []
      for (let i = 0; i < cappedAmount; i++) {
        if (!this.canSpawnMore(emitter)) break
        if (this.spawnedThisShot >= this.maxTotalChildrenPerShot) break
        if (this.waveK1 !== 0 || this.waveK2 !== 0) {
          const ox = state.originX
          const oy = state.originY
          const d1 = Math.hypot(particle.movement.x - ox, particle.movement.y - oy)
          let d2 = d1
          if (this.waveAnchorMode === 'originAndPointer') {
            const pw = this.latestModel?.pointerWorld
            d2 = pw ? Math.hypot(particle.movement.x - pw.x, particle.movement.y - pw.y) : d1
          } else if (this.waveAnchorMode === 'mirroredDepth') {
            d2 = Math.hypot(particle.movement.x + ox * 0.22, particle.movement.y + oy * 0.22)
          }
          const phase = Math.sin(d1 * this.waveK1 + d2 * this.waveK2 + state.depth * 0.85 + i * 0.07)
          const th = this.interferenceThreshold
          if (th > -4 && phase < th && this.random(i + 80033) > 0.38) continue
        }
        const direction = this.getShapeDirection(start, spread, i, cappedAmount, particle, state.depth)
        const role = this.pickChildRole(particle.uid + i * 23, i, state.role, state.depth)
        const roleIsComet = role === 'comet'
        const sheetSlot = this.zSheetSeparation !== 0 ? i % 2 : 0
        const sheetMult = sheetSlot === 0 ? this.nearSheetCometBias : this.farSheetCometBias
        const chanceForSpawn = this.clamp01(childChance * sheetMult)
        const asChildComet = this.shouldBecomeChildComet({
          roleIsComet,
          canRecurse,
          availableEnergy,
          chance: chanceForSpawn,
          idx: i,
          depth: state.depth,
          uid: particle.uid,
        })
        const childState = asChildComet ? this.createState(state.depth + 1, state) : this.createSparkState(state.depth, state.startColor, 'explosionParticle', state)
        if (reactiveOn && this.reactiveMode === 'paletteEnergyMorph') {
          childState.startColor = this.applyReactivePaletteMorph(childState.startColor, reactive)
          childState.endColor = this.applyReactivePaletteMorph(childState.endColor, reactive)
        }
        if (this.reactiveV2?.enabled) {
          if (v2.paletteHueAddDeg !== 0) {
            childState.startColor = this.shiftHue(childState.startColor, v2.paletteHueAddDeg)
            childState.endColor = this.shiftHue(childState.endColor, v2.paletteHueAddDeg)
          }
          if (v2.paletteSatMult !== 1) {
            childState.startColor = this.saturateRgb(childState.startColor, v2.paletteSatMult)
            childState.endColor = this.saturateRgb(childState.endColor, v2.paletteSatMult)
          }
        }
        childState.role = role
        childState.zSheetSlot = sheetSlot
        const p = this.spawnParticle(emitter, model, childState)
        if (!p) break
        p.movement.x = particle.movement.x
        p.movement.y = particle.movement.y
        p.x = particle.x
        p.y = particle.y
        p.z = particle.z
        if (this.zSheetSeparation !== 0) {
          const sign = sheetSlot === 0 ? 1 : -1
          p.z += sign * Math.abs(this.zSheetSeparation)
          childState.zVelocity += sign * Math.abs(this.zSheetSeparation) * 0.018
        }
        p.directionCos = Math.cos(direction)
        p.directionSin = Math.sin(direction)
        p.velocity.x = p.directionCos
        p.velocity.y = p.directionSin
        p.acceleration.set(0, 0)
        const depthSpeedJitter = Math.max(0, this.getByDepth(this.childSpeedJitterByDepth, state.depth, 0))
        const speed =
          (this.getByDepth(this.speedByDepth, state.depth, this.explosionSpeed) + this.varianceFrom(this.explosionSpeedVariance + depthSpeedJitter)) *
          (asChildComet ? this.childSpeedMultiplier : 1) *
          v2.speedMult
        p.velocity.x *= speed
        p.velocity.y *= speed
        this.applyRoleToParticle(p, childState)
        p.maxLifeTime = Math.max(
          0.15,
          (asChildComet ? p.maxLifeTime * this.childLifetimeMultiplier : this.explosionLifetime + this.varianceFrom(this.explosionLifetimeVariance)) * v2.lifeMult,
        )
        p.lifeTime = 0
        p.lifeProgress = 0
        childState.activationDelaySec = this.calculateActivationDelaySec(i, cappedAmount, state.depth, childState.depth)
        childState.depthDelaySec = this.getByDepth(this.depthDelayByLevel, childState.depth, 0)
        if (asChildComet) childState.depthDelaySec += Math.max(0, this.getByDepth(this.recursionDelayByDepth, childState.depth, 0))
        childState.originX = particle.movement.x
        childState.originY = particle.movement.y
        childState.originAnchored = true
        const depthEnergyScale = Math.max(0, this.getByDepth(this.depthEnergyByLevel, childState.depth, 1))
        childState.burstEnergy = asChildComet ? Math.max(0, availableEnergy - this.energyCostPerChild) * (1 - this.energyLossPerDepth) * depthEnergyScale : 0
        childState.shotSeedPhase = state.shotSeedPhase
        if (!this.hasVisibleContribution(childState)) {
          p.lifeTime = p.maxLifeTime
          continue
        }
        emitter.emit('emitter/create', p)
        this.spawnedThisShot += 1
        justSpawned.push(p)

        if (this.heavyEffectsEnabled && this.cometTailEnabled && asChildComet && this.random(p.uid + 601) < this.cometTailSpawnChance) this.spawnCometTailSpark(emitter, model, p, childState)
        if (this.heavyEffectsEnabled && this.secondarySparkleTrail && this.random(p.uid + 791) < this.secondarySparkleChance) this.spawnSecondarySparkle(emitter, model, p, childState)
        if (this.heavyEffectsEnabled && this.secondaryCrackle && this.random(p.uid + 991) < this.secondaryCrackleChance) this.spawnSecondaryCrackle(emitter, model, p, childState)
      }

      if (this.mergeRadius > 0 && this.mergeProbability > 0 && justSpawned.length > 1) {
        this.tryMergeSpawnGroup(justSpawned, emitter)
      }

      if (state.cornerMicroPending && this.cornerMicroBurstCount > 0) {
        state.cornerMicroPending = false
        const spd = Math.hypot(particle.velocity.x, particle.velocity.y)
        const tgx = spd > 1e-4 ? -particle.velocity.y / spd : 0
        const tgy = spd > 1e-4 ? particle.velocity.x / spd : 1
        for (let j = 0; j < this.cornerMicroBurstCount; j++) {
          const sp = this.spawnParticle(emitter, model, this.createSparkState(state.depth, state.startColor, 'explosionParticle', state))
          if (!sp) break
          const jit = (this.random(j + 4401) - 0.5) * 0.55
          sp.movement.x = particle.movement.x
          sp.movement.y = particle.movement.y
          sp.x = particle.x
          sp.y = particle.y
          sp.z = particle.z
          const ms = this.explosionSpeed * 0.42
          sp.velocity.x = (tgx + jit * tgy) * ms
          sp.velocity.y = (tgy - jit * tgx) * ms
          sp.maxLifeTime = Math.max(0.12, this.explosionLifetime * 0.42)
          sp.lifeTime = 0
          emitter.emit('emitter/create', sp)
          this.spawnedThisShot += 1
        }
      }

      if (this.heavyEffectsEnabled && this.twoStageEnabled) this.spawnCarriers(emitter, model, particle, state, base)
      if (this.heavyEffectsEnabled && this.shockwaveEnabled) this.spawnShockwave(emitter, model, particle, state)
      if (this.heavyEffectsEnabled && this.glowEnabled) this.spawnGlow(emitter, model, particle, state)
      if (this.recursionMode === 'chainReaction') this.enqueueChainReaction(particle, state)
      if (this.layeredExplosionEnabled && state.depth < this.recursionDepth) this.spawnLayeredExplosions(particle, state)

      if (state.depth === 0 && state.phase === 'comet' && this.echoCount >= 1) {
        const trail = this.cometTrailByUid.get(particle.uid) || []
        const echoTotal = Math.max(2, Math.round(this.echoCount))
        for (let k = 1; k < echoTotal; k++) {
          const sampleIdx = Math.max(0, trail.length - 1 - k)
          const sample = trail[sampleIdx]
          if (!sample) continue
          const isFinalEcho = k === echoTotal - 1
          this.echoBurstQueue.push({
            delaySec: (k * this.echoSpacingMs) / 1000,
            x: sample.x,
            y: sample.y,
            z: particle.z,
            vx: sample.vx,
            vy: sample.vy,
            depth: state.depth,
            echoIndex: k,
            echoTotal,
            shotSeedPhase: state.shotSeedPhase,
            burstEnergy: Math.max(4, availableEnergy * Math.pow(this.echoScaleFalloff, k)),
            originX: state.originX,
            originY: state.originY,
            cometChanceScale: isFinalEcho ? this.echoChildCometChance : this.echoChildCometsFinalLayerOnly ? 0 : this.echoChildCometChance * 0.35,
            startColor: { ...state.startColor },
          })
        }
      }

      if (this.gridCellPx > 0) this.scheduleCrystallize(particle, state, cappedAmount, start, spread)

      if (this.reactiveV2?.enabled && this.reactiveV2?.debug) {
        model.reactiveSignals.debug = {
          source: model.reactiveSignals.source,
          reactive,
          v2,
          depth: state.depth,
          shot: this.shotCounter,
          spawnedThisShot: this.spawnedThisShot,
        }
      }
      this.maybeWriteDiagnostics(model, state, reactive)
    } finally {
      leg.restore()
    }
  }

  private maybeWriteDiagnostics(model: Model, state: FireworkState, reactive: any) {
    const d = this.diagnostics
    if (!d?.enabled) return
    const every = Math.max(1, Math.round(d.everyNFrames ?? 6))
    if (this.reactiveDebugFrameCounter % every !== 0) return
    if (!d.writeToReactiveDebug) return
    const emitter = (model as any).emitter as MutableEmitter | undefined
    const replay = d.includeReplayPack ? this.buildReplayPack(model) : undefined
    model.reactiveSignals.debug = {
      ...(model.reactiveSignals.debug || {}),
      recursiveFirework: {
        shot: this.shotCounter,
        depth: state.depth,
        particles: emitter?.list?.length ?? 0,
        spawnedThisFrame: this.spawnedThisFrame,
        spawnedThisShot: this.spawnedThisShot,
        budget: { maxSpawnPerFrame: this.maxSpawnPerFrame, maxTotalSpawnBudget: this.maxTotalSpawnBudget, maxChildrenPerShot: this.maxTotalChildrenPerShot },
        reactive: {
          energy: reactive?.energy ?? 0,
          low: reactive?.low ?? 0,
          mid: reactive?.mid ?? 0,
          high: reactive?.high ?? 0,
          beat: reactive?.beat ?? 0,
          beatPhase: reactive?.beatPhase ?? 0,
          pulsePhase: reactive?.pulsePhase ?? 0,
        },
        replayPack: replay,
      },
    }
  }

  private buildReplayPack(model: Model) {
    const pack = {
      shot: this.shotCounter,
      seed: this.seed,
      seedSequenceMode: this.seedSequenceMode,
      seedCycleLength: this.seedCycleLength,
      seedPerShotOffset: this.seedPerShotOffset,
      shotSeed: this.getSeedForShot(),
      config: {
        recursionDepth: this.recursionDepth,
        recursionMode: this.recursionMode,
        burstShape: this.burstShape,
        paletteStrategy: this.paletteStrategy,
        trailStyle: this.trailStyle,
        explosionParticleCount: this.explosionParticleCount,
        childCometProbability: this.childCometProbability,
        musicQuantize: this.musicQuantize,
        intent: this.intent,
        showScript: this.showScript,
        recursionGrammar: this.recursionGrammar,
        fieldForces: this.fieldForces,
      },
      reactiveTrace: this.reactiveTraceValues.slice(-256),
      reactiveSource: model.reactiveSignals.source,
    }
    this.lastReplayPack = pack
    return pack
  }

  private createSparkState(
    depth: number,
    parentColor: { r: number; g: number; b: number },
    textureImageGroup: 'explosion' | 'explosionParticle' = 'explosionParticle',
    parentState?: FireworkState | null,
  ) {
    const s = this.createState(depth, parentState ?? null)
    s.phase = 'spark'
    s.textureImageGroup = textureImageGroup
    s.baseSize = Math.max(0.03, this.explosionSize + this.varianceFrom(this.explosionSizeVariance))
    s.startAlpha = this.explosionAlphaStart
    s.endAlpha = this.explosionAlphaEnd
    s.startColor = this.jitterColor(parentColor, this.childColorJitter)
    s.endColor = this.jitterColor(s.startColor, 20)
    return s
  }

  private spawnParticle(emitter: MutableEmitter, model: Model, state: FireworkState): Particle | null {
    if (!this.canSpawnMore(emitter)) return null
    const p = emitter.list.add(ParticlePool.global.pop())
    this.pendingSeed.set(p.uid, state)
    emitter.behaviours.init(p, model, emitter.turbulencePool)
    emitter.behaviours.apply(p, 0, model)
    this.spawnedThisFrame += 1
    this.spawnedThisSecond += 1
    return p
  }

  private canSpawnMore(emitter: MutableEmitter) {
    const secCap = this.maxSpawnPerSecond > 0 ? this.spawnedThisSecond < this.maxSpawnPerSecond : true
    return this.spawnedThisFrame < this.maxSpawnPerFrame && secCap && emitter.list.length < this.maxTotalSpawnBudget
  }

  private shouldExplode(particle: Particle, state: FireworkState) {
    if (this.triggerMode === 'apex') return particle.velocity.y >= 0
    if (this.triggerMode === 'distanceFromOrigin') {
      const dx = particle.movement.x - state.originX
      const dy = particle.movement.y - state.originY
      return dx * dx + dy * dy >= this.explodeDistance * this.explodeDistance
    }
    const basic = particle.lifeProgress >= state.explodeAtProgress
    if (!basic) return false
    const q = this.musicQuantize
    if (!q?.enabled) return true
    if ((q.rootOnly ?? true) && state.depth !== 0) return true
    const maxHold = this.clamp01(q.maxHoldLifeProgress ?? 0.92)
    if (particle.lifeProgress >= maxHold) return true
    const beatPhase = this.latestModel?.reactiveSignals?.beatPhase ?? 0
    const pulsePhase = this.latestModel?.reactiveSignals?.pulsePhase ?? 0
    const phase = beatPhase > 0 ? beatPhase : pulsePhase
    const subdiv = Math.max(1, Math.round(q.subdivisions ?? 4))
    const window = Math.max(0.001, Math.min(0.49, q.window ?? 0.06))
    const u = (phase * subdiv) % 1
    const dist = Math.min(u, 1 - u)
    return dist <= window
  }

  private applyShowScript(state: FireworkState) {
    const script = this.showScript
    if (!script?.enabled || !Array.isArray(script.keyframes) || script.keyframes.length === 0) return
    if ((script.rootOnly ?? false) && state.depth !== 0) return
    const t = Math.max(0, this.timeSec - this.shotStartTimeSec)
    let kf: FireworkShowScriptKeyframe | null = null
    for (let i = 0; i < script.keyframes.length; i++) {
      const cur = script.keyframes[i]
      if (!cur) continue
      if (cur.t <= t) kf = cur
      else break
    }
    if (!kf) return
    const params = kf.params || {}
    if (params.burstShape) this.burstShape = params.burstShape
    if (params.paletteStrategy) this.paletteStrategy = params.paletteStrategy
    if (params.trailStyle) this.trailStyle = params.trailStyle
    if (params.recursionMode) this.recursionMode = params.recursionMode
    if (params.depthProgram) this.depthProgram = params.depthProgram
    if (params.shockwaveEnabled !== undefined) this.shockwaveEnabled = !!params.shockwaveEnabled
    if (params.glowEnabled !== undefined) this.glowEnabled = !!params.glowEnabled
    if (params.spreadDegrees !== undefined) this.spreadDegrees = Number(params.spreadDegrees)
    if (params.explosionParticleCount !== undefined) this.explosionParticleCount = Number(params.explosionParticleCount)
    if (params.childCometProbability !== undefined) this.childCometProbability = Number(params.childCometProbability)
  }

  private getIntentScalars() {
    const it = this.intent
    if (!it) return { amount: 1, childChance: 1, spread: 1, variance: 1, spectacle: 0, musicality: 0 }
    const elegance = this.clamp01(it.elegance ?? 0)
    const chaos = this.clamp01(it.chaos ?? 0)
    const density = this.clamp01(it.density ?? 0)
    const spectacle = this.clamp01(it.spectacle ?? 0)
    const musicality = this.clamp01(it.musicality ?? 0)
    const variance = this.lerp(1 + chaos * 0.6, 1 - elegance * 0.35, elegance)
    const spread = this.lerp(1 + chaos * 0.25, 1 - elegance * 0.18, elegance)
    const amount = 1 + density * 0.9 - elegance * 0.1
    const childChance = 1 + density * 0.35 + chaos * 0.15 - elegance * 0.1
    return {
      amount: Math.max(0.1, amount),
      childChance: Math.max(0.1, childChance),
      spread: Math.max(0.2, spread),
      variance: Math.max(0.2, variance),
      spectacle,
      musicality,
    }
  }

  private applyFieldForces(particle: Particle, state: FireworkState, deltaTime: number) {
    const fields = this.fieldForces
    if (!fields || fields.length === 0) return
    const dt = deltaTime > 2 ? deltaTime / 1000 : deltaTime
    const px = particle.movement.x
    const py = particle.movement.y
    let ax = 0
    let ay = 0
    for (const f of fields) {
      if (!f?.enabled) continue
      if (f.roles && f.roles.length > 0 && !f.roles.includes(state.role)) continue
      const minD = f.minDepth ?? -9999
      const maxD = f.maxDepth ?? 9999
      if (state.depth < minD || state.depth > maxD) continue
      const dx = (f.x ?? 0) - px
      const dy = (f.y ?? 0) - py
      const r2 = dx * dx + dy * dy
      const radius = f.radius ?? 0
      if (radius > 0 && r2 > radius * radius) continue
      const r = Math.sqrt(Math.max(1e-6, r2))
      const nx = dx / r
      const ny = dy / r
      const fall = this.clamp01(f.falloff ?? 0.35)
      const t = radius > 0 ? 1 - Math.min(1, r / Math.max(1, radius)) : 1
      const gain = Math.pow(Math.max(0, t), 1 + fall * 3)
      const s = (f.strength ?? 0) * gain
      if (f.type === 'attractor') {
        ax += nx * s
        ay += ny * s
      } else if (f.type === 'repulsor') {
        ax -= nx * s
        ay -= ny * s
      } else if (f.type === 'vortex') {
        const swirl = (f.swirl ?? 1) * s
        ax += -ny * swirl
        ay += nx * swirl
      } else if (f.type === 'lineAttractor') {
        ax += Math.sign(dx || 1) * s
      }
    }
    if (ax === 0 && ay === 0) return
    particle.velocity.x += ax * dt
    particle.velocity.y += ay * dt
  }

  private applyShockwaves() {
    const emitter = this.latestEmitter
    if (!emitter) return
    if (this.shockwaveEvents.length === 0) return
    const maxImpulses = 64
    let impulses = 0
    for (const e of this.shockwaveEvents) {
      if (e.delaySec > 0) continue
      const r = Math.max(1, e.radius)
      const r2 = r * r
      const list = emitter.list as unknown as Particle[]
      for (let i = 0; i < list.length; i++) {
        if (impulses >= maxImpulses) return
        const p = list[i]
        if (!p) continue
        const s = this.perUid.get(p.uid)
        if (!s) continue
        const dx = p.movement.x - e.x
        const dy = p.movement.y - e.y
        const d2 = dx * dx + dy * dy
        if (d2 > r2) continue
        const d = Math.sqrt(Math.max(1e-6, d2))
        const t = 1 - d / r
        const impulse = e.strength * (0.15 + 0.85 * t)
        const nx = dx / d
        const ny = dy / d
        p.velocity.x += nx * impulse
        p.velocity.y += ny * impulse
        impulses += 1
      }
    }
  }

  /** Blends uniform index spacing with a power-law random for visible shear on t-based burst shapes (spiral, ring, …). */
  private pickBurstTForShear(i: number, amount: number): number {
    const tLin = amount <= 1 ? 0 : i / (amount - 1)
    if (this.shearAsymmetry <= 0.001) return tLin
    const r = Math.pow(this.random(i + 301), 1 / (1 + this.shearAsymmetry * 2.2))
    return this.lerp(tLin, r, Math.min(1, this.shearAsymmetry))
  }

  private getShapeDirection(start: number, spread: number, i: number, amount: number, particle: Particle, depth = 0) {
    if (this.burstShape === 'spiral') {
      const t = this.pickBurstTForShear(i, amount)
      const turns = (this.spiralTurns > 0 ? this.spiralTurns : 2 + depth * 0.5) * Math.max(0.2, this.spiralTightness)
      const radiusBias = 1 + (t - 0.5) * 0.08 * this.spiralTightness
      const a = start + t * Math.PI * 2 * turns * radiusBias
      return this.withSpiral(a + this.varianceFrom(0.05), depth)
    }
    const t = this.pickBurstTForShear(i, amount)
    if (this.burstShape === 'ring') return this.withSpiral(start + t * spread, depth)
    if (this.burstShape === 'cone') return this.withSpiral(start + this.random(i + 201) * ((Math.PI * this.coneDegrees) / 180), depth)
    if (this.burstShape === 'peony') {
      const petal = Math.floor(t * Math.max(3, this.peonyPetals))
      return this.withSpiral(start + (petal / Math.max(3, this.peonyPetals)) * spread + this.varianceFrom(0.08), depth)
    }
    if (this.burstShape === 'willow') return this.withSpiral(start + t * spread + this.varianceFrom(this.willowArcJitter), depth)
    if (this.burstShape === 'crossette') {
      const br = this.forkArity > 0 ? Math.min(Math.max(2, this.crossetteBranches), Math.round(this.forkArity)) : Math.max(2, this.crossetteBranches)
      const branches = Math.max(2, br)
      const branch = Math.floor(t * branches)
      const jitter = ((this.forkAngleJitter * Math.PI) / 180) * (this.random(i + 512) - 0.5) * 2
      return this.withSpiral(start + branch * ((Math.PI * 2) / branches) + this.varianceFrom(0.09) + jitter, depth)
    }
    if (this.burstShape === 'horsetail') {
      const tailSpread = spread * this.horsetailTightness
      return this.withSpiral(start + (this.random(i + 711) - 0.5) * tailSpread, depth)
    }
    if (this.burstShape === 'star') {
      const points = Math.max(3, this.starPoints)
      const spike = Math.floor(t * points * 2)
      return this.withSpiral(start + (spike / (points * 2)) * spread + this.varianceFrom(0.07), depth)
    }
    if (this.burstShape === 'heart') {
      const a = t * Math.PI * 2
      const hx = 16 * Math.pow(Math.sin(a), 3)
      const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a))
      return this.withSpiral(Math.atan2(hy, hx), depth)
    }
    const spreadNoise = this.getByDepth(this.spiralTwistByDepth, depth, 0)
    const r = this.shearAsymmetry > 0.001 ? Math.pow(this.random(i + 301), 1 / (1 + this.shearAsymmetry * 2.2)) : this.random(i + 301)
    const base = start + r * spread + (this.varianceFrom(spreadNoise) * Math.PI) / 180
    const directionalOffset = this.computeDirectionalOffset(particle)
    const anisotropicOffset = this.computeAnisotropicOffset(base + directionalOffset)
    return this.withSpiral(base + directionalOffset + anisotropicOffset, depth)
  }

  private getExplosionBaseAngle(particle: Particle, state: FireworkState) {
    let baseAngle: number
    if (this.directionMode === 'followVelocity') {
      baseAngle = Math.atan2(particle.velocity.y || particle.directionSin || 0, particle.velocity.x || particle.directionCos || 1)
    } else if (this.directionMode === 'awayFromCenter') {
      const dx = particle.movement.x - state.originX
      const dy = particle.movement.y - state.originY
      baseAngle = Math.atan2(dy, dx)
    } else if (this.directionMode === 'randomPerBurst') {
      baseAngle = this.random(particle.uid + 5001) * Math.PI * 2
    } else {
      const fixed = this.getByDepth(this.directionByDepth, state.depth, this.explosionDirectionDegrees)
      baseAngle = (fixed * Math.PI) / 180
    }
    const vb = this.clamp01(this.getByDepth(this.velocityBlendDepthCurve, state.depth, 0))
    if (vb > 0.001) {
      const vang = Math.atan2(particle.velocity.y || particle.directionSin || 0, particle.velocity.x || particle.directionCos || 1)
      let delta = vang - baseAngle
      while (delta > Math.PI) delta -= Math.PI * 2
      while (delta < -Math.PI) delta += Math.PI * 2
      baseAngle += delta * vb
    }
    baseAngle += (this.coneBiasDegrees * Math.PI) / 180
    if (this.magneticMousePullEnabled && this.outwardBiasDegrees !== 0) {
      const pw = this.latestModel?.pointerWorld
      if (pw) {
        const ax = particle.movement.x - pw.x
        const ay = particle.movement.y - pw.y
        const away = Math.atan2(ay, ax)
        const blend = this.clamp01(Math.abs(this.outwardBiasDegrees) / 120)
        let d2 = away - baseAngle
        while (d2 > Math.PI) d2 -= Math.PI * 2
        while (d2 < -Math.PI) d2 += Math.PI * 2
        baseAngle += d2 * blend * Math.sign(this.outwardBiasDegrees || 1)
      }
    }
    return baseAngle
  }

  private pickColor(depth: number) {
    if (this.paletteStrategy === 'monochrome') return this.jitterColor(this.monochromeColor, 10)
    if (this.paletteStrategy === 'complementary') {
      const base = this.pickBaseColor()
      return this.random(41) < 0.5 ? base : this.shiftHue(base, 180)
    }
    if (this.paletteStrategy === 'analogous') {
      const base = this.pickBaseColor()
      return this.shiftHue(base, this.random(42) < 0.5 ? -24 : 24)
    }
    if (this.paletteStrategy === 'triadic') {
      const base = this.pickBaseColor()
      const arm = Math.floor(this.random(45) * 3)
      const deg = arm === 0 ? 0 : arm === 1 ? 120 : -120
      return this.shiftHue(base, deg)
    }
    if (this.paletteStrategy === 'pastel') {
      const c = this.pickBaseColor()
      const t = 0.55
      const soft = {
        r: this.clampColor(this.lerp(c.r, 255, t)),
        g: this.clampColor(this.lerp(c.g, 255, t)),
        b: this.clampColor(this.lerp(c.b, 255, t)),
      }
      return this.jitterColor(soft, 12)
    }
    if (this.paletteStrategy === 'electric') {
      const base = this.pickBaseColor()
      const wobbled = this.shiftHue(base, (this.random(46) - 0.5) * 20)
      return this.saturateRgb(wobbled, 1.35)
    }
    if (this.paletteStrategy === 'heat') {
      const t = this.random(43) * this.heatBias + (1 - this.heatBias) * 0.5
      return { r: this.clampColor(220 + t * 35), g: this.clampColor(70 + t * 180), b: this.clampColor(30 + t * 40) }
    }
    if (this.paletteStrategy === 'splitTriad') {
      const base = this.pickBaseColor()
      const arm = Math.floor(this.random(47) * 3)
      const deg = arm === 0 ? 0 : arm === 1 ? 150 : -150
      return this.shiftHue(base, deg)
    }
    if (this.paletteStrategy === 'paletteSweep') {
      const n = this.explosionColors.length
      if (n < 2) return this.pickBaseColor()
      let i = Math.floor(this.random(48) * n)
      let j = Math.floor(this.random(49) * n)
      if (j === i) j = (j + 1) % n
      const a = this.explosionColors[i]
      const b = this.explosionColors[j]
      const u = this.random(50)
      return {
        r: this.clampColor(this.lerp(a.r, b.r, u)),
        g: this.clampColor(this.lerp(a.g, b.g, u)),
        b: this.clampColor(this.lerp(a.b, b.b, u)),
      }
    }
    if (this.paletteStrategy === 'depthAware') {
      const n = this.explosionColors.length
      if (n === 0) return { r: 255, g: 210, b: 140 }
      if (n === 1) return { ...this.explosionColors[0] }
      const mid = Math.ceil(n / 2)
      const low = this.explosionColors.slice(0, mid)
      const high = this.explosionColors.slice(mid)
      const pool = depth === 0 ? low : high.length > 0 ? high : low
      const idx = Math.floor(this.random(51 + depth) * pool.length)
      return { ...pool[idx] }
    }
    return this.pickBaseColor()
  }

  private pickBaseColor() {
    if (!Array.isArray(this.explosionColors) || this.explosionColors.length === 0) return { r: 255, g: 210, b: 140 }
    return this.explosionColors[Math.floor(this.random(44) * this.explosionColors.length)]
  }

  private random(salt = 0) {
    if (!this.seed) return Math.random()
    this.randomCounter += 1
    const seed = this.getSeedForShot() + this.seedPerShotOffset * this.shotCounter
    let x = (seed ^ (salt + this.randomCounter * 1103515245)) | 0
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    return Math.abs(x % 1000000) / 1000000
  }

  private getByDepth(values: number[], depth: number, fallback: number) {
    if (!Array.isArray(values) || values.length === 0) return fallback
    const v = values[Math.min(depth, values.length - 1)]
    return v === undefined || v === null ? fallback : v
  }

  private getAdaptiveGovernor(emitter: MutableEmitter) {
    if (!this.adaptiveThrottle) return 1
    const ratio = emitter.list.length / Math.max(1, this.maxTotalSpawnBudget)
    if (ratio <= this.throttleStartRatio) return 1
    const over = (ratio - this.throttleStartRatio) / Math.max(0.01, 1 - this.throttleStartRatio)
    const base = Math.max(0.2, 1 - over * 0.8)
    if (this.maxSpawnPerSecond <= 0) return base
    const secRatio = this.spawnedThisSecond / Math.max(1, this.maxSpawnPerSecond)
    const secGov = secRatio <= 0.65 ? 1 : Math.max(0.2, 1 - ((secRatio - 0.65) / 0.35) * 0.8)
    return Math.min(base, secGov)
  }

  private getLodDepthLimit(emitter: MutableEmitter) {
    if (!this.lodEnabled) return this.recursionDepth
    if (emitter.list.length < this.lodParticleThresholdNear) return this.recursionDepth
    const over = Math.min(1, (emitter.list.length - this.lodParticleThresholdNear) / Math.max(1, this.lodParticleThresholdFar - this.lodParticleThresholdNear))
    return Math.max(0, Math.floor(this.recursionDepth - over * this.lodDepthReduction))
  }

  private getLodSecondaryGovernor(emitter: MutableEmitter) {
    if (!this.lodEnabled) return 1
    if (emitter.list.length <= this.lodParticleThresholdNear) return 1
    const over = Math.min(1, (emitter.list.length - this.lodParticleThresholdNear) / Math.max(1, this.lodParticleThresholdFar - this.lodParticleThresholdNear))
    return Math.max(0.1, 1 - over * this.lodSecondaryReduction)
  }

  private getShotPressureGovernor() {
    const maxShotChildren = Math.max(1, this.maxTotalChildrenPerShot)
    const ratio = this.spawnedThisShot / maxShotChildren
    if (ratio <= 0.6) return 1
    const over = (ratio - 0.6) / 0.4
    return Math.max(0.2, 1 - over * 0.8)
  }

  private getRecursionPlannerGovernor(emitter: MutableEmitter, depth: number) {
    const strength = this.clamp01(this.recursionPlannerStrength)
    if (strength <= 0) return 1
    const budgetRatio = emitter.list.length / Math.max(1, this.maxTotalSpawnBudget)
    const shotRatio = this.spawnedThisShot / Math.max(1, this.maxTotalChildrenPerShot)
    const secRatio = this.maxSpawnPerSecond > 0 ? this.spawnedThisSecond / Math.max(1, this.maxSpawnPerSecond) : 0
    const depthRatio = depth / Math.max(1, this.recursionDepth)
    const pressure = this.clamp01(Math.max(budgetRatio, shotRatio, secRatio) * 0.8 + depthRatio * 0.2)
    const planned = this.lerp(1, Math.max(0.2, 1 - pressure * 0.85), strength)
    return planned
  }

  private getBranchEnvelope(depth: number) {
    const strength = this.clamp01(this.branchEnvelopeStrength)
    if (strength <= 0) return 1
    const maxDepth = Math.max(1, this.recursionDepth)
    const depthNorm = this.clamp01(depth / maxDepth)
    const peak = this.clamp01(this.branchEnvelopePeakDepthRatio)
    const width = Math.max(0.05, this.branchEnvelopeWidth)
    const dist = (depthNorm - peak) / width
    const gaussian = Math.exp(-(dist * dist) * 2)
    return this.lerp(1, gaussian, strength)
  }

  private getRawSpawnAmount(depthCount: number, depth: number) {
    const damping = this.clamp01(this.burstVarianceDamping)
    const depthFalloff = this.clamp01(depth / Math.max(1, this.recursionDepth))
    const varianceScale = 1 - damping * depthFalloff
    const variance = this.varianceFrom(this.explosionParticleCountVariance * varianceScale)
    return depthCount + variance
  }

  private applyDepthColor(particle: Particle, rgb: { r: number; g: number; b: number }, depth: number) {
    const brightnessNorm = 1 / (1 + Math.max(0, depth) * Math.max(0, this.brightnessNormalizeByDepth))
    const nRgb = {
      r: this.clampColor(rgb.r * brightnessNorm),
      g: this.clampColor(rgb.g * brightnessNorm),
      b: this.clampColor(rgb.b * brightnessNorm),
    }
    const gray = (nRgb.r + nRgb.g + nRgb.b) / 3
    let depthSat = this.getByDepth(this.depthSaturationByDepth, depth, 1 - depth * this.depthSaturationFalloff)
    if (this.pedigreeSaturationFloor > 0) depthSat = Math.max(this.pedigreeSaturationFloor, depthSat)
    const sat = Math.max(0, depthSat)
    particle.color.r = this.clampColor(gray + (nRgb.r - gray) * sat)
    particle.color.g = this.clampColor(gray + (nRgb.g - gray) * sat)
    particle.color.b = this.clampColor(gray + (nRgb.b - gray) * sat)
  }

  private applyPaletteAnimation(
    rgb: { r: number; g: number; b: number },
    lifeProgress: number,
    depth: number,
    phase: FireworkPhase,
  ) {
    let baseRgb = this.applyDepthColorProgram(rgb, depth)
    baseRgb = this.applyRoleColorTint(baseRgb, phase)
    baseRgb = this.applyPaletteAnimPhase(baseRgb, lifeProgress, depth)
    return this.applyColorProgramPhase(baseRgb, lifeProgress)
  }

  private applyRoleColorTint(rgb: { r: number; g: number; b: number }, phase: FireworkPhase) {
    if (this.roleColorTint !== 'coolCometWarmSpark') return rgb
    if (phase === 'comet') return this.shiftHue(rgb, -18)
    return this.shiftHue(rgb, 8)
  }

  private applyPaletteAnimPhase(rgb: { r: number; g: number; b: number }, lifeProgress: number, depth: number) {
    const baseRgb = rgb
    if (this.paletteAnimationMode === 'hueDrift') return this.shiftHue(baseRgb, lifeProgress * this.paletteDriftDegrees)
    if (this.paletteAnimationMode === 'depthSwap' && this.explosionColors.length > 0) {
      const idx = Math.min(depth, this.explosionColors.length - 1)
      const target = this.explosionColors[idx]
      return { r: this.lerp(baseRgb.r, target.r, 0.45), g: this.lerp(baseRgb.g, target.g, 0.45), b: this.lerp(baseRgb.b, target.b, 0.45) }
    }
    if (this.paletteAnimationMode === 'depthGradient' && this.explosionColors.length >= 2) {
      const n = this.explosionColors.length
      const maxDepth = Math.max(1, this.recursionDepth)
      const t = this.clamp01(depth / maxDepth)
      const f = t * (n - 1)
      const i0 = Math.min(Math.floor(f), n - 2)
      const i1 = i0 + 1
      const u = f - i0
      const ca = this.explosionColors[i0]
      const cb = this.explosionColors[i1]
      const along = {
        r: this.lerp(ca.r, cb.r, u),
        g: this.lerp(ca.g, cb.g, u),
        b: this.lerp(ca.b, cb.b, u),
      }
      const blend = 0.72
      return {
        r: this.clampColor(this.lerp(baseRgb.r, along.r, blend)),
        g: this.clampColor(this.lerp(baseRgb.g, along.g, blend)),
        b: this.clampColor(this.lerp(baseRgb.b, along.b, blend)),
      }
    }
    return baseRgb
  }

  private applyColorProgramPhase(rgb: { r: number; g: number; b: number }, lifeProgress: number) {
    const baseRgb = rgb
    if (this.colorProgramMode === 'warmToCool') {
      const warm = { r: 255, g: 180, b: 90 }
      const cool = { r: 110, g: 180, b: 255 }
      return { r: this.lerp(this.lerp(baseRgb.r, warm.r, 0.55), cool.r, lifeProgress), g: this.lerp(this.lerp(baseRgb.g, warm.g, 0.55), cool.g, lifeProgress), b: this.lerp(this.lerp(baseRgb.b, warm.b, 0.55), cool.b, lifeProgress) }
    }
    if (this.colorProgramMode === 'coolToWarm') {
      const warm = { r: 255, g: 180, b: 90 }
      const cool = { r: 110, g: 180, b: 255 }
      return { r: this.lerp(this.lerp(baseRgb.r, cool.r, 0.55), warm.r, lifeProgress), g: this.lerp(this.lerp(baseRgb.g, cool.g, 0.55), warm.g, lifeProgress), b: this.lerp(this.lerp(baseRgb.b, cool.b, 0.55), warm.b, lifeProgress) }
    }
    if (this.colorProgramMode === 'lumaPulse') {
      const cycles = Math.max(3, Math.min(14, this.flickerFrequency * 0.35))
      const w = 1 + 0.2 * Math.sin(lifeProgress * Math.PI * 2 * cycles)
      return {
        r: this.clampColor(baseRgb.r * w),
        g: this.clampColor(baseRgb.g * w),
        b: this.clampColor(baseRgb.b * w),
      }
    }
    if (this.colorProgramMode === 'lifeDesaturate') {
      const gain = this.lerp(1, 0.38, lifeProgress)
      return this.saturateRgb(baseRgb, gain)
    }
    if (this.colorProgramMode === 'lifeSaturate') {
      const gain = this.lerp(1, 1.28, lifeProgress)
      return this.saturateRgb(baseRgb, gain)
    }
    return baseRgb
  }

  private applyDepthColorProgram(rgb: { r: number; g: number; b: number }, depth: number) {
    if (this.depthColorPaletteMode === 'rotate') return this.shiftHue(rgb, depth * 24)
    if (this.depthColorPaletteMode === 'complement') return depth % 2 === 0 ? rgb : this.shiftHue(rgb, 180)
    if (this.depthColorPaletteMode === 'splitComplement') return this.shiftHue(rgb, depth % 2 === 0 ? 150 : -150)
    return rgb
  }

  private computeDirectionalOffset(particle: Particle) {
    const strength = this.clamp01(this.inheritDirectionStrength)
    if (this.childDirectionMode === 'inheritVelocity') {
      const angle = Math.atan2(particle.velocity.y || 0, particle.velocity.x || 1)
      return angle * strength
    }
    if (this.childDirectionMode === 'tangentCurve') {
      const angle = Math.atan2(particle.acceleration.y || 0, particle.acceleration.x || 1)
      return angle * strength
    }
    if (this.childDirectionMode === 'reflected') {
      const angle = Math.atan2(-(particle.velocity.y || 0), particle.velocity.x || 1)
      return angle * strength
    }
    return 0
  }

  private computeAnisotropicOffset(angle: number) {
    const anisotropy = Math.max(0.05, this.spreadAnisotropy)
    if (Math.abs(anisotropy - 1) < 0.001) return 0
    const rot = (this.spreadRotationDegrees * Math.PI) / 180
    const local = angle - rot
    const scale = Math.sqrt(Math.pow(Math.cos(local), 2) + Math.pow(Math.sin(local) * anisotropy, 2))
    return (scale - 1) * 0.12
  }

  private withSpiral(angle: number, depth: number) {
    const twist = this.getByDepth(this.spiralTwistByDepth, depth, 0)
    return angle + (twist * Math.PI) / 180
  }

  private getSpawnAmountForDepth(depth: number, rawAmount: number) {
    const minChildren = Math.max(0, Math.round(this.minChildrenPerExplosion))
    const depthMax = this.getByDepth(this.maxChildrenPerExplosionByDepth, depth, Number.POSITIVE_INFINITY)
    const maxChildren = Number.isFinite(depthMax) ? Math.max(minChildren, Math.round(depthMax)) : Number.POSITIVE_INFINITY
    const stability = this.clamp01(this.burstStability)
    const rounded = Math.round(rawAmount)
    const floored = Math.floor(rawAmount)
    const bounded = Math.max(0, Math.round(this.lerp(rounded, floored, stability)))
    const depthCap = Math.max(0, Math.round(this.maxChildrenPerLevel))
    return Math.max(minChildren, Math.min(Math.min(maxChildren, depthCap || maxChildren), bounded))
  }

  private shouldBecomeChildComet(input: { roleIsComet: boolean; canRecurse: boolean; availableEnergy: number; chance: number; idx: number; depth: number; uid: number }) {
    const { roleIsComet, canRecurse, availableEnergy, chance, idx, depth, uid } = input
    if (!roleIsComet || !canRecurse) return false
    if (availableEnergy < Math.max(this.energyCostPerChild, this.minEnergyToRecurse)) return false
    const envelope = this.getBranchEnvelope(depth)
    const energyRatio = this.clamp01(availableEnergy / Math.max(this.minEnergyToRecurse, this.energyPerRootShot))
    const blendedChance = this.clamp01(this.lerp(chance, chance * envelope, Math.max(0, this.branchEnvelopeStrength)))
    const effectiveChance = this.clamp01(blendedChance * this.lerp(0.7, 1.12, energyRatio))
    const recursionModeBoost = this.recursionMode === 'branchingComets' ? 1.25 : 1
    let modeChance = this.clamp01(effectiveChance * recursionModeBoost * this.childExplosionProbability)
    if (this.burstShape === 'crossette' && this.leafCometChance > 0 && idx > 0) {
      modeChance *= this.clamp01(this.leafCometChance)
    }
    if (this.branchingMode === 'fanOut') return this.random(uid + idx * 17) < Math.max(modeChance, 0.6)
    if (this.branchingMode === 'guaranteedCore' && idx === 0) return true
    return this.random(uid + idx * 17 + depth * 131) < modeChance
  }

  private tryChainReactionTrigger(particle: Particle, state: FireworkState, model: Model) {
    if (this.recursionMode !== 'chainReaction' || state.chainTriggered) return
    if (this.chainTriggeredThisFrame >= this.maxChainTriggersPerFrame) return
    for (let i = 0; i < this.chainReactionEvents.length; i++) {
      const event = this.chainReactionEvents[i]
      if (event.delaySec > 0) continue
      if (state.depth > event.depth + this.chainReactionDepthBoost + 1) continue
      const dx = particle.movement.x - event.x
      const dy = particle.movement.y - event.y
      if (dx * dx + dy * dy > event.radius * event.radius) continue
      if (this.random(particle.uid + i * 97) > this.chainReactionProbability) continue
      state.chainTriggered = true
      this.chainTriggeredThisFrame += 1
      state.explodeAtProgress = Math.min(state.explodeAtProgress, particle.lifeProgress + 0.02)
      if (particle.lifeProgress >= this.minLifeProgressBeforeExplode) {
        this.triggerExplosion(particle, state, model)
        particle.lifeTime = particle.maxLifeTime
      }
      return
    }
  }

  private enqueueChainReaction(particle: Particle, state: FireworkState) {
    this.chainReactionEvents.push({
      x: particle.movement.x,
      y: particle.movement.y,
      depth: state.depth,
      delaySec: Math.max(0, this.chainReactionDelayMs / 1000),
      ttlSec: Math.max(0.1, this.chainReactionDelayMs / 1000 + 1.2),
      radius: Math.max(1, this.chainReactionRadius),
    })
  }

  private spawnLayeredExplosions(particle: Particle, state: FireworkState) {
    const layers = Math.max(2, Math.round(this.layeredExplosionCount))
    for (let layer = 1; layer < layers; layer++) {
      this.chainReactionEvents.push({
        x: particle.movement.x,
        y: particle.movement.y,
        depth: state.depth + 1,
        delaySec: Math.max(0, (this.layeredExplosionDelayMs * layer) / 1000),
        ttlSec: Math.max(0.2, (this.layeredExplosionDelayMs * layer) / 1000 + 0.7),
        radius: Math.max(1, this.chainReactionRadius * (0.55 + layer * 0.12)),
      })
    }
  }

  private getAvailableEnergy(state: FireworkState) {
    if (state.depth === 0 && state.burstEnergy <= 0) return this.energyPerRootShot
    return state.burstEnergy
  }

  private hasVisibleContribution(state: FireworkState) {
    const visibility = Math.max(0, state.baseSize) * Math.max(0, state.startAlpha)
    const depthFloor = this.minVisibleContribution + Math.max(0, state.depth) * Math.max(0, this.subtreeCullMinVisiblePerDepth)
    const maxDepthByRatio = Math.floor(Math.max(0, this.recursionDepth) * Math.max(0, this.subtreeCullDepthRatio))
    if (this.subtreeCullDepthRatio <= 1 && state.depth > maxDepthByRatio) return false
    return visibility >= depthFloor
  }

  private pickChildRole(salt: number, armAlternateIdx = 0, parentRole: ChildRole = 'comet', depth = 0): ChildRole {
    const grammar = this.recursionGrammar
    if (grammar?.enabled) {
      const rules = grammar.transitions?.[parentRole]
      if (Array.isArray(rules) && rules.length > 0) {
        const depthMults = grammar.depthWeightMult || {}
        const weighted = rules
          .map((r) => {
            const multArr = depthMults[r.role]
            const mult = Array.isArray(multArr) && multArr.length > 0 ? this.getByDepth(multArr, depth, 1) : 1
            return { role: r.role, w: Math.max(0, (r.weight ?? 0) * Math.max(0, mult)) }
          })
          .filter((r) => r.w > 0)
        const total = weighted.reduce((a, r) => a + r.w, 0)
        if (total > 0) {
          let t = this.random(salt) * total
          for (const r of weighted) {
            t -= r.w
            if (t <= 0) return r.role
          }
          return weighted[weighted.length - 1]?.role ?? 'spark'
        }
      }
    }
    let w = this.roleWeights || { spark: 1, comet: 0, glitter: 0, crackle: 0, ember: 0 }
    if (this.armRoleAlternate && armAlternateIdx % 2 === 1) {
      w = {
        spark: Math.max(0, (w.spark ?? 0) * 0.82),
        comet: Math.max(0, (w.comet ?? 0) * 1.38),
        glitter: w.glitter ?? 0,
        crackle: w.crackle ?? 0,
        ember: w.ember ?? 0,
      }
    }
    const entries: Array<[ChildRole, number]> = [
      ['spark', Math.max(0, w.spark ?? 0)],
      ['comet', Math.max(0, w.comet ?? 0)],
      ['glitter', Math.max(0, w.glitter ?? 0)],
      ['crackle', Math.max(0, w.crackle ?? 0)],
      ['ember', Math.max(0, w.ember ?? 0)],
    ]
    const total = entries.reduce((a, [, v]) => a + v, 0)
    if (total <= 0) return 'spark'
    let t = this.random(salt) * total
    for (const [role, weight] of entries) {
      t -= weight
      if (t <= 0) return role
    }
    return 'spark'
  }

  private applyRoleToParticle(p: Particle, state: FireworkState) {
    const role = state.role
    if (role === 'comet') return
    if (role === 'glitter') {
      p.maxLifeTime *= 0.45
      p.size.x *= 0.55
      p.size.y *= 0.55
      state.startAlpha = Math.min(1, state.startAlpha * 0.9)
      state.endAlpha = Math.max(0, state.endAlpha * 0.5)
      return
    }
    if (role === 'crackle') {
      p.maxLifeTime *= 0.35
      p.velocity.x *= 1.25
      p.velocity.y *= 1.25
      return
    }
    if (role === 'ember') {
      p.maxLifeTime *= 1.45
      p.velocity.x *= 0.55
      p.velocity.y *= 0.55
      state.endAlpha = Math.max(0.05, state.endAlpha)
      return
    }
  }

  private applyDepthProgramForState() {
    if (this.depthProgram === 'none') return
    if (this.depthProgram === 'bloom') {
      if (this.depthAlphaByDepth.length === 0) this.depthAlphaByDepth = [1, 0.86, 0.72, 0.56]
      if (this.depthSaturationByDepth.length === 0) this.depthSaturationByDepth = [1, 0.94, 0.85, 0.72]
      return
    }
    if (this.depthProgram === 'cascade') {
      if (this.depthAlphaByDepth.length === 0) this.depthAlphaByDepth = [1, 0.9, 0.75, 0.58]
      if (this.depthSaturationByDepth.length === 0) this.depthSaturationByDepth = [1, 0.88, 0.7, 0.55]
      return
    }
    if (this.depthProgram === 'implode') {
      if (this.depthAlphaByDepth.length === 0) this.depthAlphaByDepth = [1, 0.78, 0.62, 0.48]
      if (this.depthSaturationByDepth.length === 0) this.depthSaturationByDepth = [1, 0.82, 0.65, 0.5]
      return
    }
    if (this.depthAlphaByDepth.length === 0) this.depthAlphaByDepth = [1, 0.84, 0.66, 0.5]
    if (this.depthSaturationByDepth.length === 0) this.depthSaturationByDepth = [1, 0.9, 0.78, 0.62]
  }

  private getSeedForShot() {
    if (this.seedSequenceMode === 'fixedCycle') return this.seed + (this.shotCounter % Math.max(1, this.seedCycleLength))
    if (this.seedSequenceMode === 'pingPong') {
      const cycle = Math.max(2, this.seedCycleLength)
      const idx = this.shotCounter % (cycle * 2 - 2)
      const reflected = idx < cycle ? idx : cycle * 2 - 2 - idx
      return this.seed + reflected
    }
    this.seedWalkOffset += (this.randomCounter % 2 === 0 ? 1 : -1) * Math.max(1, this.seedRandomWalkStep)
    return this.seed + this.seedWalkOffset
  }

  private shiftHue(color: { r: number; g: number; b: number }, degrees: number) {
    const rad = (degrees * Math.PI) / 180
    const cosA = Math.cos(rad)
    const sinA = Math.sin(rad)
    const r = color.r
    const g = color.g
    const b = color.b
    return {
      r: this.clampColor((0.213 + cosA * 0.787 - sinA * 0.213) * r + (0.715 - cosA * 0.715 - sinA * 0.715) * g + (0.072 - cosA * 0.072 + sinA * 0.928) * b),
      g: this.clampColor((0.213 - cosA * 0.213 + sinA * 0.143) * r + (0.715 + cosA * 0.285 + sinA * 0.14) * g + (0.072 - cosA * 0.072 - sinA * 0.283) * b),
      b: this.clampColor((0.213 - cosA * 0.213 - sinA * 0.787) * r + (0.715 - cosA * 0.715 + sinA * 0.715) * g + (0.072 + cosA * 0.928 + sinA * 0.072) * b),
    }
  }

  private saturateRgb(rgb: { r: number; g: number; b: number }, gain: number) {
    const gray = (rgb.r + rgb.g + rgb.b) / 3
    return {
      r: this.clampColor(gray + (rgb.r - gray) * gain),
      g: this.clampColor(gray + (rgb.g - gray) * gain),
      b: this.clampColor(gray + (rgb.b - gray) * gain),
    }
  }

  private spawnSecondarySparkle(emitter: MutableEmitter, model: Model, src: Particle, state: FireworkState) {
    const sparkle = this.spawnParticle(emitter, model, this.createSparkState(state.depth, state.startColor, 'explosion', state))
    if (!sparkle) return
    sparkle.movement.x = src.movement.x
    sparkle.movement.y = src.movement.y
    sparkle.x = src.x
    sparkle.y = src.y
    sparkle.velocity.x = src.velocity.x * 0.3
    sparkle.velocity.y = src.velocity.y * 0.3
    sparkle.size.x *= this.secondarySparkleScale
    sparkle.size.y *= this.secondarySparkleScale
    sparkle.maxLifeTime *= 0.55
    emitter.emit('emitter/create', sparkle)
  }

  private spawnSecondaryCrackle(emitter: MutableEmitter, model: Model, src: Particle, state: FireworkState) {
    const count = Math.max(1, Math.round(this.secondaryCrackleCount))
    for (let i = 0; i < count; i++) {
      const crack = this.spawnParticle(emitter, model, this.createSparkState(state.depth, state.startColor, 'explosion', state))
      if (!crack) return
      const a = this.random(i + 401) * Math.PI * 2
      const speed = this.explosionSpeed * 0.35
      crack.movement.x = src.movement.x
      crack.movement.y = src.movement.y
      crack.x = src.x
      crack.y = src.y
      crack.velocity.x = Math.cos(a) * speed
      crack.velocity.y = Math.sin(a) * speed
      crack.maxLifeTime *= 0.35
      emitter.emit('emitter/create', crack)
    }
  }

  private spawnCometTailSpark(emitter: MutableEmitter, model: Model, src: Particle, state: FireworkState) {
    const spark = this.spawnParticle(emitter, model, this.createSparkState(state.depth, state.startColor, 'explosion', state))
    if (!spark) return
    spark.movement.x = src.movement.x
    spark.movement.y = src.movement.y
    spark.x = src.x
    spark.y = src.y
    spark.velocity.x = src.velocity.x * 0.25
    spark.velocity.y = src.velocity.y * 0.25
    spark.size.x *= this.cometTailScale
    spark.size.y *= this.cometTailScale
    spark.maxLifeTime *= this.cometTailLifeMultiplier
    emitter.emit('emitter/create', spark)
  }

  private spawnCarriers(emitter: MutableEmitter, model: Model, src: Particle, state: FireworkState, base: number) {
    const carriers = Math.max(1, Math.round(this.carrierCount * this.getLodSecondaryGovernor(emitter)))
    const useOrbit = this.orbitRadius > 1
    for (let i = 0; i < carriers; i++) {
      const c = this.spawnParticle(emitter, model, this.createSparkState(state.depth, state.startColor, 'explosion', state))
      if (!c) return
      const ringA = useOrbit ? (i / Math.max(1, carriers - 1)) * Math.PI * 2 + base : base + (this.random(i + 8001) - 0.5) * (Math.PI * 2)
      const ox = useOrbit ? Math.cos(ringA) * this.orbitRadius : 0
      const oy = useOrbit ? Math.sin(ringA) * this.orbitRadius : 0
      c.movement.x = src.movement.x + ox
      c.movement.y = src.movement.y + oy
      c.x = src.x + ox
      c.y = src.y + oy
      if (useOrbit) {
        const tx = -Math.sin(ringA)
        const ty = Math.cos(ringA)
        const os = this.orbitSpeed * this.explosionSpeed * 0.48
        c.velocity.x = tx * os
        c.velocity.y = ty * os
      } else {
        const a = ringA
        c.velocity.x = Math.cos(a) * (this.explosionSpeed * 0.5)
        c.velocity.y = Math.sin(a) * (this.explosionSpeed * 0.5)
      }
      let life = this.carrierLife
      if (this.hatchDelayMs > 0) life = Math.max(life, this.hatchDelayMs / 1000)
      c.maxLifeTime = Math.max(0.08, life)
      c.lifeTime = 0
      const s = this.perUid.get(c.uid)
      if (s) s.carrierStage = true
      emitter.emit('emitter/create', c)
    }
  }

  private spawnMicroBurst(src: Particle, state: FireworkState) {
    const emitter = this.latestEmitter
    const model = this.latestModel
    if (!emitter || !model) return
    const spread = (Math.PI * this.microBurstSpread) / 180
    for (let i = 0; i < this.microBurstCount; i++) {
      const hatch = this.hatchCometChance > 0 && this.random(i + 10203) < this.hatchCometChance
      const childState = hatch ? this.createState(state.depth + 1, state) : this.createSparkState(state.depth, state.startColor, 'explosion', state)
      if (hatch) {
        childState.role = 'comet'
        childState.textureImageGroup = 'explosion'
      }
      const p = this.spawnParticle(emitter, model, childState)
      if (!p) return
      const a = Math.atan2(src.velocity.y, src.velocity.x) - spread * 0.5 + this.random(i + 9301) * spread
      p.movement.x = src.movement.x
      p.movement.y = src.movement.y
      p.x = src.x
      p.y = src.y
      const sp = this.explosionSpeed * (hatch ? 0.62 : 0.55)
      p.velocity.x = Math.cos(a) * sp
      p.velocity.y = Math.sin(a) * sp
      p.maxLifeTime = hatch ? Math.max(0.35, this.explosionLifetime * this.childLifetimeMultiplier * 0.85) : Math.max(0.12, this.explosionLifetime * 0.5)
      p.lifeTime = 0
      if (hatch) this.applyRoleToParticle(p, childState)
      emitter.emit('emitter/create', p)
    }
  }

  private spawnShockwave(emitter: MutableEmitter, model: Model, src: Particle, state: FireworkState) {
    const s = this.spawnParticle(emitter, model, this.createSparkState(state.depth, state.startColor, 'explosion', state))
    if (!s) return
    s.movement.x = src.movement.x
    s.movement.y = src.movement.y
    s.x = src.x
    s.y = src.y
    s.velocity.set(0, 0)
    const depthScale = this.getByDepth(this.shockwaveByDepth, state.depth, 1)
    s.size.x = this.shockwaveSize * depthScale
    s.size.y = this.shockwaveSize * depthScale
    s.maxLifeTime = this.shockwaveLife
    s.lifeTime = 0
    emitter.emit('emitter/create', s)
    this.shockwaveEvents.push({
      x: src.movement.x,
      y: src.movement.y,
      z: src.z,
      radius: Math.max(10, this.chainReactionRadius * 0.6 + this.shockwaveSize * 90),
      strength: Math.max(5, this.shockwaveSize * 22),
      delaySec: 0,
      ttlSec: 0.12,
    })
  }

  private spawnGlow(emitter: MutableEmitter, model: Model, src: Particle, state: FireworkState) {
    const g = this.spawnParticle(emitter, model, this.createSparkState(state.depth, state.startColor, 'explosion', state))
    if (!g) return
    g.movement.x = src.movement.x
    g.movement.y = src.movement.y
    g.x = src.x
    g.y = src.y
    g.velocity.set(0, 0)
    const depthScale = this.getByDepth(this.glowByDepth, state.depth, 1)
    g.size.x *= this.glowScale * depthScale
    g.size.y *= this.glowScale * depthScale
    g.maxLifeTime = this.glowLife
    g.lifeTime = 0
    emitter.emit('emitter/create', g)
  }

  private tryMergeSpawnGroup(group: Particle[], emitter: MutableEmitter) {
    const r = Math.max(1, this.mergeRadius)
    const r2 = r * r
    const n = group.length
    const used = new Set<number>()
    for (let i = 0; i < n && this.mergeBudgetThisFrame < this.maxMergesPerFrame; i++) {
      if (used.has(i)) continue
      for (let j = i + 1; j < n && this.mergeBudgetThisFrame < this.maxMergesPerFrame; j++) {
        if (used.has(j)) continue
        const a = group[i]
        const b = group[j]
        const dx = a.movement.x - b.movement.x
        const dy = a.movement.y - b.movement.y
        if (dx * dx + dy * dy > r2) continue
        if (this.random(i * 17 + j + 6601) > this.mergeProbability) continue
        used.add(j)
        this.mergeBudgetThisFrame += 1
        a.size.x = Math.min(5, a.size.x * 1.38)
        a.size.y = Math.min(5, a.size.y * 1.38)
        b.lifeTime = b.maxLifeTime
        emitter.emit('emitter/remove', b)
        break
      }
    }
  }

  private flushEchoBursts() {
    if (this.echoBurstQueue.length === 0) return
    const dt = 1 / 60
    const next: typeof this.echoBurstQueue = []
    for (const job of this.echoBurstQueue) {
      job.delaySec -= dt
      if (job.delaySec > 0) next.push(job)
      else this.runEchoBurst(job)
    }
    this.echoBurstQueue = next
  }

  private runEchoBurst(job: (typeof this.echoBurstQueue)[0]) {
    const emitter = this.latestEmitter
    const model = this.latestModel
    if (!emitter || !model) return
    const proxyParticle = {
      movement: { x: job.x, y: job.y },
      velocity: { x: job.vx || 0.01, y: job.vy || -1 },
      x: job.x,
      y: job.y,
      z: job.z,
      uid: 8800000 + job.echoIndex,
      lifeProgress: 0.75,
      maxLifeTime: 1,
      lifeTime: 0.75,
      directionCos: 1,
      directionSin: 0,
      acceleration: { set() {}, x: 0, y: 0 },
    } as unknown as Particle

    const echoParent = this.createState(job.depth)
    echoParent.startColor = { ...job.startColor }
    echoParent.endColor = { ...job.startColor }
    echoParent.burstEnergy = job.burstEnergy
    echoParent.shotSeedPhase = job.shotSeedPhase
    echoParent.originX = job.originX
    echoParent.originY = job.originY

    const governor = this.getAdaptiveGovernor(emitter)
    const lodGov = this.getLodSecondaryGovernor(emitter)
    const depthCount = this.getByDepth(this.countByDepth, job.depth, this.explosionParticleCount)
    const envelope = this.getBranchEnvelope(job.depth)
    const scaleEcho = Math.pow(this.echoScaleFalloff, job.echoIndex)
    const rawAmount = Math.max(
      2,
      Math.floor(this.getRawSpawnAmount(depthCount, job.depth) * governor * lodGov * envelope * scaleEcho * 0.82),
    )
    const cappedAmount = Math.min(rawAmount, Math.max(0, this.maxTotalChildrenPerShot - this.spawnedThisShot))
    if (cappedAmount <= 0) return
    const spreadDeg = this.getByDepth(this.spreadByDepth, job.depth, this.spreadDegrees)
    const spread = (Math.PI * spreadDeg) / 180
    const base = this.getExplosionBaseAngle(proxyParticle, echoParent)
    const start = base - spread * 0.5
    const childChance = this.clamp01(
      this.getByDepth(this.childChanceByDepth, job.depth, this.childCometProbability) * governor * job.cometChanceScale,
    )
    const lodDepthLimit = this.getLodDepthLimit(emitter)
    const maxDepthEff = Math.max(0, this.recursionDepth - echoParent.recursionDepthPenalty)
    const canRecurse = job.depth < Math.min(maxDepthEff, lodDepthLimit)
    const availableEnergy = job.burstEnergy

    for (let i = 0; i < cappedAmount; i++) {
      if (!this.canSpawnMore(emitter)) break
      if (this.spawnedThisShot >= this.maxTotalChildrenPerShot) break
      const direction = this.getShapeDirection(start, spread, i, cappedAmount, proxyParticle, job.depth)
      const role = this.pickChildRole(proxyParticle.uid + i * 29, i, echoParent.role, job.depth)
      const asChildComet = this.shouldBecomeChildComet({
        roleIsComet: role === 'comet',
        canRecurse,
        availableEnergy,
        chance: childChance,
        idx: i,
        depth: job.depth,
        uid: proxyParticle.uid,
      })
      const childState = asChildComet ? this.createState(job.depth + 1, echoParent) : this.createSparkState(job.depth, echoParent.startColor, 'explosionParticle', echoParent)
      childState.role = role
      const p = this.spawnParticle(emitter, model, childState)
      if (!p) break
      p.movement.x = job.x
      p.movement.y = job.y
      p.x = job.x
      p.y = job.y
      p.z = job.z
      p.directionCos = Math.cos(direction)
      p.directionSin = Math.sin(direction)
      p.velocity.x = p.directionCos
      p.velocity.y = p.directionSin
      p.acceleration.set(0, 0)
      const depthSpeedJitter = Math.max(0, this.getByDepth(this.childSpeedJitterByDepth, job.depth, 0))
      const speed =
        (this.getByDepth(this.speedByDepth, job.depth, this.explosionSpeed) + this.varianceFrom(this.explosionSpeedVariance + depthSpeedJitter)) *
        (asChildComet ? this.childSpeedMultiplier : 1)
      p.velocity.x *= speed
      p.velocity.y *= speed
      this.applyRoleToParticle(p, childState)
      p.maxLifeTime = Math.max(0.15, asChildComet ? p.maxLifeTime * this.childLifetimeMultiplier : this.explosionLifetime + this.varianceFrom(this.explosionLifetimeVariance))
      p.lifeTime = 0
      p.lifeProgress = 0
      childState.activationDelaySec = this.calculateActivationDelaySec(i, cappedAmount, job.depth, childState.depth)
      childState.depthDelaySec = this.getByDepth(this.depthDelayByLevel, childState.depth, 0)
      if (asChildComet) childState.depthDelaySec += Math.max(0, this.getByDepth(this.recursionDelayByDepth, childState.depth, 0))
      childState.originX = job.x
      childState.originY = job.y
      childState.originAnchored = true
      const depthEnergyScale = Math.max(0, this.getByDepth(this.depthEnergyByLevel, childState.depth, 1))
      childState.burstEnergy = asChildComet ? Math.max(0, availableEnergy - this.energyCostPerChild) * (1 - this.energyLossPerDepth) * depthEnergyScale : 0
      childState.shotSeedPhase = job.shotSeedPhase
      if (!this.hasVisibleContribution(childState)) {
        p.lifeTime = p.maxLifeTime
        continue
      }
      emitter.emit('emitter/create', p)
      this.spawnedThisShot += 1
    }
  }

  private flushMineBursts() {
    if (this.mineBurstQueue.length === 0) return
    const dt = 1 / 60
    const next: typeof this.mineBurstQueue = []
    for (const job of this.mineBurstQueue) {
      job.delaySec -= dt
      if (job.delaySec > 0) next.push(job)
      else this.spawnMineBurst(job)
    }
    this.mineBurstQueue = next
  }

  private spawnMineBurst(job: (typeof this.mineBurstQueue)[0]) {
    const emitter = this.latestEmitter
    const model = this.latestModel
    if (!emitter || !model) return
    const spread = (Math.PI * this.mineSpreadDegrees) / 180
    const count = Math.min(6, Math.max(2, Math.round(this.microBurstCount * 0.55)))
    const mineParent = this.createState(job.depth)
    mineParent.startColor = { ...job.color }
    mineParent.originX = job.x
    mineParent.originY = job.y
    for (let i = 0; i < count; i++) {
      if (!this.canSpawnMore(emitter)) break
      const st = this.createSparkState(job.depth, job.color, 'explosionParticle', mineParent)
      const p = this.spawnParticle(emitter, model, st)
      if (!p) break
      const a = this.random(i + 7722) * spread - spread * 0.5 - Math.PI / 2
      p.movement.x = job.x
      p.movement.y = job.y
      p.x = job.x
      p.y = job.y
      p.z = job.z
      p.velocity.x = Math.cos(a) * this.explosionSpeed * 0.52
      p.velocity.y = Math.sin(a) * this.explosionSpeed * 0.52
      p.maxLifeTime = this.explosionLifetime * 0.48
      p.lifeTime = 0
      p.lifeProgress = 0
      emitter.emit('emitter/create', p)
      this.spawnedThisShot += 1
    }
  }

  private scheduleCrystallize(particle: Particle, state: FireworkState, amount: number, start: number, spread: number) {
    const g = Math.max(6, this.gridCellPx)
    const cells = new Map<number, { x: number; y: number; n: number }>()
    const baseX = particle.movement.x
    const baseY = particle.movement.y
    const stride = Math.max(1, Math.floor(amount / Math.max(2, this.maxCrystallizeNuclei)))
    for (let i = 0; i < amount; i += stride) {
      const dir = this.getShapeDirection(start, spread, i, amount, particle, state.depth)
      const px = baseX + Math.cos(dir) * 42
      const py = baseY + Math.sin(dir) * 42
      const k = spatialCellKey(Math.floor(px / g), Math.floor(py / g))
      const cur = cells.get(k) || { x: px, y: py, n: 0 }
      cur.n += 1
      cur.x = (cur.x * (cur.n - 1) + px) / cur.n
      cur.y = (cur.y * (cur.n - 1) + py) / cur.n
      cells.set(k, cur)
    }
    const nuclei = [...cells.values()]
      .sort((a, b) => b.n - a.n)
      .slice(0, Math.max(1, Math.round(this.maxCrystallizeNuclei)))
    let delay = 0
    for (const n of nuclei) {
      this.crystallizeQueue.push({
        delaySec: delay,
        x: n.x,
        y: n.y,
        z: particle.z,
        depth: state.depth,
        color: { ...state.startColor },
        count: Math.min(10, Math.max(2, n.n + 2)),
      })
      delay += this.crystallizeDelayMs / 1000
    }
  }

  private flushCrystallize() {
    if (this.crystallizeQueue.length === 0) return
    const dt = 1 / 60
    const next: typeof this.crystallizeQueue = []
    for (const job of this.crystallizeQueue) {
      job.delaySec -= dt
      if (job.delaySec > 0) next.push(job)
      else this.spawnCrystallizeCluster(job)
    }
    this.crystallizeQueue = next
  }

  private spawnCrystallizeCluster(job: (typeof this.crystallizeQueue)[0]) {
    const emitter = this.latestEmitter
    const model = this.latestModel
    if (!emitter || !model) return
    const cParent = this.createState(job.depth)
    cParent.startColor = { ...job.color }
    for (let i = 0; i < job.count; i++) {
      if (!this.canSpawnMore(emitter)) break
      const st = this.createSparkState(job.depth, job.color, 'explosionParticle', cParent)
      const p = this.spawnParticle(emitter, model, st)
      if (!p) break
      const a = job.count <= 1 ? 0 : (i / (job.count - 1)) * Math.PI * 2
      p.movement.x = job.x
      p.movement.y = job.y
      p.x = job.x
      p.y = job.y
      p.z = job.z
      p.velocity.x = Math.cos(a) * this.explosionSpeed * 0.44
      p.velocity.y = Math.sin(a) * this.explosionSpeed * 0.44
      p.maxLifeTime = this.explosionLifetime * 0.55
      p.lifeTime = 0
      p.lifeProgress = 0
      emitter.emit('emitter/create', p)
      this.spawnedThisShot += 1
    }
  }

  private applyWind(particle: Particle) {
    if (this.windMode === 'noise') {
      const t = particle.lifeProgress * 100
      particle.velocity.x += Math.sin(t * this.windNoiseScale + particle.uid * 0.01) * this.windStrength
      particle.velocity.y += Math.cos(t * this.windNoiseScale + particle.uid * 0.02) * this.windStrength
    } else {
      particle.velocity.x += this.windVector.x * this.windStrength * 0.016
      particle.velocity.y += this.windVector.y * this.windStrength * 0.016
    }
  }

  private jitterColor(color: { r: number; g: number; b: number }, jitter: number) {
    return { r: this.clampColor(color.r + this.varianceFrom(jitter)), g: this.clampColor(color.g + this.varianceFrom(jitter)), b: this.clampColor(color.b + this.varianceFrom(jitter)) }
  }

  private clampColor(v: number) {
    return Math.max(0, Math.min(255, Math.round(v)))
  }

  private childSizeMultiplier(depth: number) {
    return Math.max(0.35, 1 - depth * 0.18)
  }

  private clamp01(v: number) {
    return Math.max(0, Math.min(1, v))
  }

  private lerp(a: number, b: number, t: number) {
    return a + (b - a) * this.clamp01(t)
  }

  private calculateBurstDelaySec(index: number, total: number) {
    if (this.burstStaggerMs <= 0 && this.burstStaggerJitter <= 0) return 0
    const stageT = this.clamp01(index / Math.max(1, total - 1))
    const attack = Math.max(0, this.burstEnvelope?.attack ?? 0)
    const hold = Math.max(0, this.burstEnvelope?.hold ?? 0)
    const release = Math.max(0, this.burstEnvelope?.release ?? 1)
    let envelopeScale = 1
    if (stageT < attack && attack > 0) envelopeScale = stageT / attack
    else if (stageT > release && release < 1) envelopeScale = Math.max(0.2, 1 - (stageT - release) / Math.max(0.001, 1 - release))
    else if (stageT >= attack && stageT <= hold) envelopeScale = 1
    return Math.max(0, ((index * this.burstStaggerMs + this.varianceFrom(this.burstStaggerJitter)) * envelopeScale) / 1000)
  }

  private calculateActivationDelaySec(index: number, total: number, parentDepth: number, childDepth: number) {
    const burstDelay = this.calculateBurstDelaySec(index, total)
    const recursionDelay = Math.max(0, this.getByDepth(this.recursionDelayByDepth, childDepth, 0))
    const blend = this.clamp01(this.recursionPacingBlend)
    const base = burstDelay + this.lerp(0, recursionDelay, blend)
    const depthT = this.clamp01((parentDepth + childDepth) / Math.max(1, this.recursionDepth * 2))
    const jitterMs = this.recursionPacingJitterMs * (1 + depthT * 0.35)
    const jitter = this.varianceFrom(Math.max(0, jitterMs)) / 1000
    return Math.max(0, base + jitter)
  }

  private randomRange(min: number, max: number) {
    if (max <= min) return min
    return min + Math.random() * (max - min)
  }

  private applyTrailStyleToParticle(particle: Particle, state: FireworkState, lifeProgress: number) {
    if (this.trailStyle === 'fadeTail') {
      particle.color.alpha *= this.clamp01(1 - lifeProgress * 0.55)
      return
    }
    if (this.trailStyle === 'glowStreak') {
      const pulse = 0.85 + Math.sin((particle.uid + lifeProgress * 120) * 0.12) * 0.15
      particle.color.alpha *= pulse
      particle.size.x *= 1.08
      particle.size.y *= 0.92
      return
    }
    if (this.trailStyle === 'sparkleTrail' && this.heavyEffectsEnabled) {
      const flicker = 0.7 + this.random(particle.uid + Math.floor(lifeProgress * 1000)) * 0.5
      particle.color.alpha *= flicker
      if (state.phase === 'comet') particle.size.x *= 0.96
    }
  }

  private getBrightnessFactor(uid: number, lifeProgress: number, depth: number) {
    const variance = this.brightnessVariance > 0 ? this.varianceFrom(this.brightnessVariance) / 255 : 0
    const freq = Math.max(0.1, this.flickerFrequency)
    const flicker = this.flickerStrength > 0 ? Math.sin((uid * 0.17 + lifeProgress * freq) * Math.PI * 2) * this.flickerStrength : 0
    const depthFade = 1 - Math.min(0.8, depth * 0.08)
    return Math.max(0.2, 1 + variance + flicker) * depthFade
  }

  private resolveConfigGroups() {
    const apply = (group: Record<string, any> | null, key: string, target: keyof this) => {
      if (!group || group[key] === undefined || group[key] === null) return
      ;(this as any)[target] = group[key]
    }
    apply(this.recursion, 'mode', 'recursionMode')
    apply(this.recursion, 'childExplosionProbability', 'childExplosionProbability')
    apply(this.recursion, 'maxChildrenPerLevel', 'maxChildrenPerLevel')
    apply(this.recursion, 'maxChainTriggersPerFrame', 'maxChainTriggersPerFrame')
    apply(this.recursion, 'chainReactionDelayMs', 'chainReactionDelayMs')
    apply(this.recursion, 'chainReactionRadius', 'chainReactionRadius')
    apply(this.recursion, 'chainReactionProbability', 'chainReactionProbability')
    apply(this.explosion, 'layeredExplosionCount', 'layeredExplosionCount')
    apply(this.explosion, 'layeredExplosionEnabled', 'layeredExplosionEnabled')
    apply(this.explosion, 'layeredExplosionDelayMs', 'layeredExplosionDelayMs')
    apply(this.explosion, 'sizeStart', 'explosionSizeStart')
    apply(this.explosion, 'sizeEnd', 'explosionSizeEnd')
    apply(this.explosion, 'brightnessVariance', 'brightnessVariance')
    apply(this.explosion, 'flickerStrength', 'flickerStrength')
    apply(this.explosion, 'flickerFrequency', 'flickerFrequency')
    apply(this.trail, 'style', 'trailStyle')
    apply(this.depth, 'zScaleStrength', 'zScaleStrength')
    apply(this.depth, 'zScaleEnabled', 'zScaleEnabled')
    apply(this.depth, 'perspectiveDepth', 'perspectiveDepth')
    apply(this.depth, 'perspectiveStrength', 'perspectiveStrength')
    apply(this.depth, 'perspectiveExponent', 'perspectiveExponent')
    apply(this.depth, 'perspectiveFarScaleMin', 'perspectiveFarScaleMin')
    apply(this.depth, 'perspectiveNearScaleMax', 'perspectiveNearScaleMax')
    apply(this.performance, 'maxSpawnPerFrame', 'maxSpawnPerFrame')
    apply(this.performance, 'maxTotalSpawnBudget', 'maxTotalSpawnBudget')
    apply(this.performance, 'maxSpawnPerSecond', 'maxSpawnPerSecond')
    apply(this.performance, 'recursionPlannerStrength', 'recursionPlannerStrength')
    apply(this.performance, 'subtreeCullDepthRatio', 'subtreeCullDepthRatio')
    apply(this.performance, 'subtreeCullMinVisiblePerDepth', 'subtreeCullMinVisiblePerDepth')
    apply(this.performance, 'reactiveSafetyDamping', 'reactiveSafetyDamping')
    apply(this.performance, 'heavyEffectsEnabled', 'heavyEffectsEnabled')
  }

  getName() {
    return BehaviourNames.RECURSIVE_FIREWORK_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      triggerMode: this.triggerMode,
      directionMode: this.directionMode,
      cometCurve: this.cometCurve,
      cometCurveVariance: this.cometCurveVariance,
      cometNoise: this.cometNoise,
      cometNoiseVariance: this.cometNoiseVariance,
      cometFadeIn: this.cometFadeIn,
      cometFadeOut: this.cometFadeOut,
      explosionTriggerMin: this.explosionTriggerMin,
      explosionTriggerMax: this.explosionTriggerMax,
      explodeDistance: this.explodeDistance,
      explosionParticleCount: this.explosionParticleCount,
      explosionParticleCountVariance: this.explosionParticleCountVariance,
      explosionSpeed: this.explosionSpeed,
      explosionSpeedVariance: this.explosionSpeedVariance,
      explosionLifetime: this.explosionLifetime,
      explosionLifetimeVariance: this.explosionLifetimeVariance,
      explosionSize: this.explosionSize,
      explosionSizeVariance: this.explosionSizeVariance,
      explosionAlphaStart: this.explosionAlphaStart,
      explosionAlphaEnd: this.explosionAlphaEnd,
      spreadDegrees: this.spreadDegrees,
      explosionDirectionDegrees: this.explosionDirectionDegrees,
      directionByDepth: this.directionByDepth,
      spreadByDepth: this.spreadByDepth,
      burstStaggerMs: this.burstStaggerMs,
      burstStaggerJitter: this.burstStaggerJitter,
      burstShape: this.burstShape,
      coneDegrees: this.coneDegrees,
      starPoints: this.starPoints,
      peonyPetals: this.peonyPetals,
      willowArcJitter: this.willowArcJitter,
      crossetteBranches: this.crossetteBranches,
      horsetailTightness: this.horsetailTightness,
      recursionDepth: this.recursionDepth,
      childCometProbability: this.childCometProbability,
      childSpeedMultiplier: this.childSpeedMultiplier,
      childLifetimeMultiplier: this.childLifetimeMultiplier,
      childColorJitter: this.childColorJitter,
      childChanceByDepth: this.childChanceByDepth,
      countByDepth: this.countByDepth,
      speedByDepth: this.speedByDepth,
      zVelocity: this.zVelocity,
      zVelocityVariance: this.zVelocityVariance,
      zAcceleration: this.zAcceleration,
      zIndexFactor: this.zIndexFactor,
      zIndexBase: this.zIndexBase,
      perspectiveDepth: this.perspectiveDepth,
      perspectiveStrength: this.perspectiveStrength,
      perspectiveProfile: this.perspectiveProfile,
      perspectiveExponent: this.perspectiveExponent,
      perspectiveFarScaleMin: this.perspectiveFarScaleMin,
      perspectiveNearScaleMax: this.perspectiveNearScaleMax,
      depthAlphaFalloff: this.depthAlphaFalloff,
      depthSaturationFalloff: this.depthSaturationFalloff,
      depthAlphaByDepth: this.depthAlphaByDepth,
      depthSaturationByDepth: this.depthSaturationByDepth,
      depthFogNear: this.depthFogNear,
      depthFogFar: this.depthFogFar,
      depthFogAlpha: this.depthFogAlpha,
      maxSpawnPerFrame: this.maxSpawnPerFrame,
      maxTotalSpawnBudget: this.maxTotalSpawnBudget,
      maxSpawnPerSecond: this.maxSpawnPerSecond,
      adaptiveThrottle: this.adaptiveThrottle,
      throttleStartRatio: this.throttleStartRatio,
      recursionPlannerStrength: this.recursionPlannerStrength,
      subtreeCullDepthRatio: this.subtreeCullDepthRatio,
      subtreeCullMinVisiblePerDepth: this.subtreeCullMinVisiblePerDepth,
      reactiveSafetyDamping: this.reactiveSafetyDamping,
      lodEnabled: this.lodEnabled,
      lodTargetFrameMs: this.lodTargetFrameMs,
      lodParticleThresholdNear: this.lodParticleThresholdNear,
      lodParticleThresholdFar: this.lodParticleThresholdFar,
      lodDepthReduction: this.lodDepthReduction,
      lodSecondaryReduction: this.lodSecondaryReduction,
      explosionColors: this.explosionColors,
      paletteStrategy: this.paletteStrategy,
      paletteAnimationMode: this.paletteAnimationMode,
      colorProgramMode: this.colorProgramMode,
      roleColorTint: this.roleColorTint,
      depthColorPaletteMode: this.depthColorPaletteMode,
      paletteDriftDegrees: this.paletteDriftDegrees,
      monochromeColor: this.monochromeColor,
      heatBias: this.heatBias,
      hueShiftPerChild: this.hueShiftPerChild,
      childChanceJitterPerBurst: this.childChanceJitterPerBurst,
      spreadAnisotropy: this.spreadAnisotropy,
      spreadRotationDegrees: this.spreadRotationDegrees,
      depthProgram: this.depthProgram,
      childDirectionMode: this.childDirectionMode,
      inheritDirectionStrength: this.inheritDirectionStrength,
      energyPerRootShot: this.energyPerRootShot,
      energyCostPerChild: this.energyCostPerChild,
      energyLossPerDepth: this.energyLossPerDepth,
      minEnergyToRecurse: this.minEnergyToRecurse,
      recursionPhaseMode: this.recursionPhaseMode,
      minLifeProgressBeforeExplode: this.minLifeProgressBeforeExplode,
      maxTotalChildrenPerShot: this.maxTotalChildrenPerShot,
      minVisibleContribution: this.minVisibleContribution,
      brightnessNormalizeByDepth: this.brightnessNormalizeByDepth,
      depthDelayByLevel: this.depthDelayByLevel,
      burstEnvelope: this.burstEnvelope,
      branchingMode: this.branchingMode,
      minChildrenPerExplosion: this.minChildrenPerExplosion,
      maxChildrenPerExplosionByDepth: this.maxChildrenPerExplosionByDepth,
      childChanceDecayPerDepth: this.childChanceDecayPerDepth,
      childBurstScaleByDepth: this.childBurstScaleByDepth,
      childCometBiasByDepth: this.childCometBiasByDepth,
      spiralTwistByDepth: this.spiralTwistByDepth,
      childSpeedJitterByDepth: this.childSpeedJitterByDepth,
      recursionDelayByDepth: this.recursionDelayByDepth,
      depthEnergyByLevel: this.depthEnergyByLevel,
      branchEnvelopePeakDepthRatio: this.branchEnvelopePeakDepthRatio,
      branchEnvelopeWidth: this.branchEnvelopeWidth,
      branchEnvelopeStrength: this.branchEnvelopeStrength,
      burstStability: this.burstStability,
      burstVarianceDamping: this.burstVarianceDamping,
      recursionPacingBlend: this.recursionPacingBlend,
      recursionPacingJitterMs: this.recursionPacingJitterMs,
      seedSequenceMode: this.seedSequenceMode,
      seedCycleLength: this.seedCycleLength,
      seedRandomWalkStep: this.seedRandomWalkStep,
      cometTailEnabled: this.cometTailEnabled,
      cometTailSpawnChance: this.cometTailSpawnChance,
      cometTailScale: this.cometTailScale,
      cometTailLifeMultiplier: this.cometTailLifeMultiplier,
      secondarySparkleTrail: this.secondarySparkleTrail,
      secondarySparkleChance: this.secondarySparkleChance,
      secondarySparkleScale: this.secondarySparkleScale,
      secondaryCrackle: this.secondaryCrackle,
      secondaryCrackleChance: this.secondaryCrackleChance,
      secondaryCrackleCount: this.secondaryCrackleCount,
      roleWeights: this.roleWeights,
      twoStageEnabled: this.twoStageEnabled,
      carrierCount: this.carrierCount,
      carrierLife: this.carrierLife,
      microBurstCount: this.microBurstCount,
      microBurstDelayMs: this.microBurstDelayMs,
      microBurstSpread: this.microBurstSpread,
      shockwaveEnabled: this.shockwaveEnabled,
      shockwaveSize: this.shockwaveSize,
      shockwaveLife: this.shockwaveLife,
      shockwaveByDepth: this.shockwaveByDepth,
      glowEnabled: this.glowEnabled,
      glowLife: this.glowLife,
      glowScale: this.glowScale,
      glowByDepth: this.glowByDepth,
      windEnabled: this.windEnabled,
      windMode: this.windMode,
      windVector: this.windVector,
      windStrength: this.windStrength,
      windNoiseScale: this.windNoiseScale,
      windAffectComet: this.windAffectComet,
      windAffectSparks: this.windAffectSparks,
      debugShowDepth: this.debugShowDepth,
      debugShowVectors: this.debugShowVectors,
      debugShowGovernor: this.debugShowGovernor,
      debugShowShotSeed: this.debugShowShotSeed,
      seed: this.seed,
      seedPerShotOffset: this.seedPerShotOffset,
      recursionMode: this.recursionMode,
      childExplosionProbability: this.childExplosionProbability,
      maxChildrenPerLevel: this.maxChildrenPerLevel,
      maxChainTriggersPerFrame: this.maxChainTriggersPerFrame,
      chainReactionDelayMs: this.chainReactionDelayMs,
      chainReactionRadius: this.chainReactionRadius,
      chainReactionProbability: this.chainReactionProbability,
      chainReactionDepthBoost: this.chainReactionDepthBoost,
      trailStyle: this.trailStyle,
      cometSizeStart: this.cometSizeStart,
      cometSizeEnd: this.cometSizeEnd,
      explosionSizeStart: this.explosionSizeStart,
      explosionSizeEnd: this.explosionSizeEnd,
      flickerStrength: this.flickerStrength,
      flickerFrequency: this.flickerFrequency,
      brightnessVariance: this.brightnessVariance,
      zScaleEnabled: this.zScaleEnabled,
      zScaleStrength: this.zScaleStrength,
      layeredExplosionEnabled: this.layeredExplosionEnabled,
      layeredExplosionCount: this.layeredExplosionCount,
      layeredExplosionDelayMs: this.layeredExplosionDelayMs,
      heavyEffectsEnabled: this.heavyEffectsEnabled,
      recursion: this.recursion,
      explosion: this.explosion,
      trail: this.trail,
      depth: this.depth,
      performance: this.performance,
      echoCount: this.echoCount,
      echoSpacingMs: this.echoSpacingMs,
      echoScaleFalloff: this.echoScaleFalloff,
      echoChildCometChance: this.echoChildCometChance,
      echoChildCometsFinalLayerOnly: this.echoChildCometsFinalLayerOnly,
      echoTrailSampleCap: this.echoTrailSampleCap,
      shearAsymmetry: this.shearAsymmetry,
      coneBiasDegrees: this.coneBiasDegrees,
      velocityBlendDepthCurve: this.velocityBlendDepthCurve,
      minefieldCellSize: this.minefieldCellSize,
      mineArmProgress: this.mineArmProgress,
      maxMinesPerShot: this.maxMinesPerShot,
      mineStaggerMs: this.mineStaggerMs,
      mineSpreadDegrees: this.mineSpreadDegrees,
      spiralTurns: this.spiralTurns,
      spiralTightness: this.spiralTightness,
      armRoleAlternate: this.armRoleAlternate,
      waveK1: this.waveK1,
      waveK2: this.waveK2,
      interferenceThreshold: this.interferenceThreshold,
      waveAnchorMode: this.waveAnchorMode,
      orbitRadius: this.orbitRadius,
      orbitSpeed: this.orbitSpeed,
      hatchDelayMs: this.hatchDelayMs,
      hatchCometChance: this.hatchCometChance,
      curvatureThresholdRad: this.curvatureThresholdRad,
      cornerBurstScale: this.cornerBurstScale,
      cornerCooldownMs: this.cornerCooldownMs,
      cornerMicroBurstCount: this.cornerMicroBurstCount,
      zSheetSeparation: this.zSheetSeparation,
      nearSheetCometBias: this.nearSheetCometBias,
      farSheetCometBias: this.farSheetCometBias,
      pedigreeSaturationFloor: this.pedigreeSaturationFloor,
      sportProbability: this.sportProbability,
      sportHueDelta: this.sportHueDelta,
      forkArity: this.forkArity,
      forkAngleJitter: this.forkAngleJitter,
      leafCometChance: this.leafCometChance,
      gridCellPx: this.gridCellPx,
      maxCrystallizeNuclei: this.maxCrystallizeNuclei,
      crystallizeDelayMs: this.crystallizeDelayMs,
      magneticMousePullEnabled: this.magneticMousePullEnabled,
      mousePullStartProgress: this.mousePullStartProgress,
      mousePullStrength: this.mousePullStrength,
      outwardBiasDegrees: this.outwardBiasDegrees,
      legendaryChance: this.legendaryChance,
      sigilSides: this.sigilSides,
      legendaryBudgetCap: this.legendaryBudgetCap,
      legendaryRecursionCap: this.legendaryRecursionCap,
      mergeRadius: this.mergeRadius,
      mergeProbability: this.mergeProbability,
      maxMergesPerFrame: this.maxMergesPerFrame,
      reactiveSource: this.reactiveSource,
      reactiveSourceBlendMode: this.reactiveSourceBlendMode,
      reactiveSourceWeights: this.reactiveSourceWeights,
      reactiveChannelWeights: this.reactiveChannelWeights,
      reactiveSourcePriority: this.reactiveSourcePriority,
      reactiveMode: this.reactiveMode,
      reactiveGain: this.reactiveGain,
      reactiveSmoothing: this.reactiveSmoothing,
      reactiveThreshold: this.reactiveThreshold,
      reactiveThresholdOn: this.reactiveThresholdOn,
      reactiveThresholdOff: this.reactiveThresholdOff,
      reactiveCooldownMs: this.reactiveCooldownMs,
      reactiveCooldownJitterMs: this.reactiveCooldownJitterMs,
      reactiveInfluence: this.reactiveInfluence,
      reactiveShapeJitter: this.reactiveShapeJitter,
      reactiveAttack: this.reactiveAttack,
      reactiveRelease: this.reactiveRelease,
      reactiveRouting: this.reactiveRouting,
      reactivePaletteHueRange: this.reactivePaletteHueRange,
      reactivePaletteSaturationBoost: this.reactivePaletteSaturationBoost,
      debugReactiveSignals: this.debugReactiveSignals,
      debugReactiveLogEveryFrames: this.debugReactiveLogEveryFrames,
      reactiveTraceMode: this.reactiveTraceMode,
      reactiveTraceValues: this.reactiveTraceValues,
      reactiveTraceLoop: this.reactiveTraceLoop,
      showScript: this.showScript,
      intent: this.intent,
      recursionGrammar: this.recursionGrammar,
      fieldForces: this.fieldForces,
      musicQuantize: this.musicQuantize,
      diagnostics: this.diagnostics,
      lastReplayPack: this.lastReplayPack,
      name: this.getName(),
    }
  }
}
