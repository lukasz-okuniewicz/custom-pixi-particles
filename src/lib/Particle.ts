// src/lib/Particle.ts
import { Sprite } from 'pixi.js'
import { Color, Point } from './util'
import ThereBack from './util/ThereBack'

/**
 * Represents a particle object used in particle system simulations
 */
export default class Particle {
  static _UID: { value: number } = { value: 0 }
  next: Particle | null = null
  prev: Particle | null = null

  /**
   * Stores the unique ID of the particle
   */
  uid = Particle._UID.value++

  /**
   * Stores the movement of the particle
   */
  movement = new Point()

  /**
   * Stores the acceleration of the particle
   */
  acceleration = new Point()

  /**
   * Stores the velocity of the particle
   */
  velocity = new Point()

  /**
   * Stores the size of the particle
   */
  size = new Point()

  /**
   * Stores the starting size of the particle
   */
  sizeStart = new Point()

  /**
   * Stores the starting warp size of the particle
   */
  warpSizeStart = new Point()

  /**
   * Stores the ending size of the particle
   */
  sizeEnd = new Point()

  /**
   * Stores the x value of the particle for sin wave
   */
  sinXVal = new Point()

  /**
   * Stores the y value of the particle for sin wave
   */
  sinYVal = new Point()

  /**
   * Stores the color of the particle
   */
  color = new Color()

  /**
   * Stores the starting color of the particle
   */
  colorStart = new Color()

  /**
   * Stores the ending color of the particle
   */
  colorEnd = new Color()
  superColorAlphaEnd = 1

  /**
   * Stores the maximum life time of the particle
   */
  maxLifeTime: number

  /**
   * Stores the current life time of the particle
   */
  lifeTime: number

  /**
   * Stores the current life progress of the particle
   */
  lifeProgress: number

  /**
   * Stores the x position of the particle
   */
  x: number

  /**
   * Stores the y position of the particle
   */
  y: number

  /**
   * Stores the z position of the particle
   */
  z: number

  /**
   * Stores the velocity angle of the particle
   */
  velocityAngle: number

  /**
   * Stores the radians per second of the particle
   */
  radiansPerSecond: number

  /**
   * Stores the radius of the particle
   */
  radius: number
  radiusX: number
  radiusY: number

  /**
   * Stores the starting radius of the particle
   */
  radiusStart: number

  /**
   * Stores the ending radius of the particle
   */
  radiusEnd: number

  /**
   * Stores the cosine of the direction of the particle
   */
  directionCos: number

  /**
   * Stores the sine of the direction of the particle
   */
  directionSin: number

  /**
   * Stores the rotation of the particle
   */
  rotation: number

  /**
   * Stores the rotation delta of the particle
   */
  rotationDelta: number

  /**
   * Stores the angle of the particle
   */
  angle: number

  /**
   * Stores the sprite of the particle
   */
  sprite: Sprite

  /**
   * Stores whether the vortices are shown
   */
  showVortices: boolean

  /**
   * Stores whether the turbulence is enabled
   */
  turbulence: boolean

  /**
   * Stores the finishing texture of the particle
   */
  finishingTexture: number

  /** Index into resolved `textureVariants` for this spawn (-1 if unused). */
  textureVariantIndex: number

  /**
   * When set before `emitter/create`, Renderer picks a random static texture from this list
   * instead of emitter texture variants. Cleared after sprite creation.
   */
  spawnTexturePool: string[] | null = null

  /** Whether the display object plays a frame strip or a single texture. */
  spriteDisplayKind: 'static' | 'animated'

  /**
   * Stores the camera z position of the particle
   */
  cameraZ: number

  /**
   * Stores the camera z position converter of the particle
   */
  cameraZConverter: number

  /**
   * Stores the warp speed of the particle
   */
  warpSpeed: number

  /**
   * Stores the warp base speed of the particle
   */
  warpBaseSpeed: number

  /**
   * Stores the warp field of view of the particle
   */
  warpFov: number

  /**
   * Stores the warp stretch of the particle
   */
  warpStretch: number

  skipPositionBehaviour: boolean = false
  skipAngularVelocityBehaviour: boolean = false
  skipColorBehaviour: boolean = false
  skipEmitDirectionBehaviour: boolean = false
  skipRotationBehaviour: boolean = false
  skipSizeBehaviour: boolean = false
  skipAttractionRepulsionBehaviour: boolean = false

  /**
   * Stores the warp distance scale converter of the particle
   */
  warpDistanceScaleConverter: number

  sizeDifference: { x: number; y: number }

  fromAtoB: boolean = false
  fromAtoBTwoWays: boolean = false
  pointA: Point = new Point()
  pointB: Point = new Point()
  there: ThereBack = new ThereBack()
  back: ThereBack = new ThereBack()
  xStart: number = 0
  yStart: number = 0
  xTarget: number = 0
  yTarget: number = 0
  thereDuration: number = 1
  backDuration: number = 1
  progress: number = 0
  time: number = 0
  thereAmplitude: number = 10
  backAmplitude: number = 10
  direction: number = 1

  noiseOffset: Point = new Point()
  timeline: any[] = []
  initialDirectionCos: number = 0
  initialDirectionSin: number = 0
  velocityScale: number = 1
  rotationAcceleration: number = 0
  pathTime: number = 0 // For behaviours like MoveToPoint sinusoidal path

  // For MoveToPointBehaviour with easing
  moveToPointInitialX: number = 0
  moveToPointInitialY: number = 0
  moveToPointTotalDistance: number = 0
  moveToPointAccumulatedLinearDistance: number = 0

  /** FormPatternBehaviour: mutually exclusive with MoveToPointBehaviour for predictable motion */
  formPatternTargetX: number = 0
  formPatternTargetY: number = 0
  formPatternInitialX: number = 0
  formPatternInitialY: number = 0
  formPatternTotalDistance: number = 0
  formPatternAccumulatedLinearDistance: number = 0
  formPatternPathTime: number = 0
  formPatternAssigned: boolean = false
  /** Delay before motion along the chord starts (seconds remaining) */
  formPatternStaggerRemaining: number = 0
  /** Per-particle speed multiplier (Form Pattern) */
  formPatternSpeedMul: number = 1
  /** Sine path phase offset (radians) */
  formPatternSinPhase: number = 0
  /** Hold at target after arrival (seconds remaining) */
  formPatternLingerRemaining: number = 0
  /** Local-space pattern target (for liveFormationTransform) */
  formPatternLocalX: number = 0
  formPatternLocalY: number = 0
  /** Scales path deviations (arc, spiral, sine, noise) */
  formPatternPathMul: number = 1
  /** springSeek integration */
  formPatternSpringVx: number = 0
  formPatternSpringVy: number = 0
  /**
   * Snapshot before FormPattern image tint (for imageRestoreOriginalColorOnDeactivate).
   */
  formPatternColorBackup: {
    cr: number
    cg: number
    cb: number
    ca: number
    sr: number
    sg: number
    sb: number
    sa: number
    er: number
    eg: number
    eb: number
    ea: number
  } | null = null
  /** imageBitmap: lerp color from→to when imageColorBlendDurationMs > 0 */
  formPatternImageColorBlendActive = false
  formPatternImageColorBlendElapsed = 0
  formPatternImageBlendFr = 0
  formPatternImageBlendFg = 0
  formPatternImageBlendFb = 0
  formPatternImageBlendTr = 0
  formPatternImageBlendTg = 0
  formPatternImageBlendTb = 0

  /** Unit chord initial→target for overshoot */
  formPatternChordUx = 1
  formPatternChordUy = 0
  /** -1 = not overshooting; 0–1 = overshoot phase progress */
  formPatternOvershootT = -1

  formPatternVisBaseAlpha = 1
  formPatternVisBaseSizeX = 1
  formPatternVisBaseSizeY = 1
  formPatternVisualActive = false

  /**
   * Constructs a particle object
   */
  constructor() {
    this.reset()
  }

  /**
   * Resets the particle object
   */
  reset() {
    this.maxLifeTime = 0
    this.lifeTime = 0
    this.lifeProgress = 0
    this.x = 0
    this.y = 0
    this.z = 0

    this.timeline = []

    this.skipPositionBehaviour = false
    this.skipAngularVelocityBehaviour = false
    this.skipColorBehaviour = false
    this.skipAttractionRepulsionBehaviour = false
    this.skipEmitDirectionBehaviour = false
    this.skipRotationBehaviour = false
    this.skipSizeBehaviour = false

    this.movement.set(0, 0)
    this.acceleration.set(0, 0)
    this.velocity.set(0, 0)
    this.sinXVal.set(0, 0)
    this.sinYVal.set(0, 0)

    this.velocityAngle = 0
    this.radiansPerSecond = 0
    this.radius = 0
    this.radiusStart = 0
    this.radiusEnd = 0

    this.directionCos = 1
    this.directionSin = 0

    this.finishingTexture = 0
    this.textureVariantIndex = -1
    this.spawnTexturePool = null
    this.spriteDisplayKind = 'static'

    this.showVortices = false
    this.turbulence = false

    this.rotation = 0
    this.rotationDelta = 0

    this.size.set(1, 1)
    this.sizeStart.set(0, 0)
    this.warpSizeStart.set(0, 0)
    this.sizeEnd.set(0, 0)

    this.color.set(255, 255, 255, 1)
    this.colorStart.set(0, 0, 0, 1)
    this.colorEnd.set(0, 0, 0, 1)
    this.superColorAlphaEnd = 1

    this.cameraZ = 0
    this.cameraZConverter = 10
    this.warpSpeed = 0
    this.warpBaseSpeed = 0
    this.warpFov = 20
    this.warpStretch = 5
    this.warpDistanceScaleConverter = 2000

    this.sizeDifference = { x: 1, y: 1 }

    this.fromAtoB = false
    this.fromAtoBTwoWays = false
    this.pointA.set(0, 0)
    this.pointB.set(0, 0)
    this.there.set('', '', '')
    this.back.set('', '', '')
    this.thereDuration = 1
    this.backDuration = 1
    this.thereAmplitude = 10
    this.backAmplitude = 10
    this.progress = 0
    this.direction = 1
    this.time = 0
    this.xStart = 0
    this.yStart = 0
    this.xTarget = 0
    this.yTarget = 0

    this.noiseOffset = new Point()
    this.initialDirectionCos = 0
    this.initialDirectionSin = 0
    this.velocityScale = 1
    this.rotationAcceleration = 0
    this.pathTime = 0

    this.moveToPointInitialX = 0
    this.moveToPointInitialY = 0
    this.moveToPointTotalDistance = 0
    this.moveToPointAccumulatedLinearDistance = 0

    this.formPatternTargetX = 0
    this.formPatternTargetY = 0
    this.formPatternInitialX = 0
    this.formPatternInitialY = 0
    this.formPatternTotalDistance = 0
    this.formPatternAccumulatedLinearDistance = 0
    this.formPatternPathTime = 0
    this.formPatternAssigned = false
    this.formPatternStaggerRemaining = 0
    this.formPatternSpeedMul = 1
    this.formPatternSinPhase = 0
    this.formPatternLingerRemaining = 0
    this.formPatternLocalX = 0
    this.formPatternLocalY = 0
    this.formPatternPathMul = 1
    this.formPatternSpringVx = 0
    this.formPatternSpringVy = 0
    this.formPatternColorBackup = null
    this.formPatternImageColorBlendActive = false
    this.formPatternImageColorBlendElapsed = 0
    this.formPatternImageBlendFr = 0
    this.formPatternImageBlendFg = 0
    this.formPatternImageBlendFb = 0
    this.formPatternImageBlendTr = 0
    this.formPatternImageBlendTg = 0
    this.formPatternImageBlendTb = 0
    this.formPatternChordUx = 1
    this.formPatternChordUy = 0
    this.formPatternOvershootT = -1
    this.formPatternVisBaseAlpha = 1
    this.formPatternVisBaseSizeX = 1
    this.formPatternVisBaseSizeY = 1
    this.formPatternVisualActive = false
  }

  /**
   * Checks if the particle is almost dead
   *
   * @return {boolean} True if the particle is almost dead, otherwise false
   */
  isAlmostDead() {
    return this.lifeTime >= this.maxLifeTime - 0.1
  }

  /**
   * Checks if the particle is dead
   *
   * @return {boolean} True if the particle is dead, otherwise false
   */
  isDead() {
    return this.lifeTime >= this.maxLifeTime
  }

  /**
   * Hides the particle
   */
  hide() {
    if (!this.sprite) return
    if (!this.sprite.visible) return
    this.sprite.visible = false
  }
}
