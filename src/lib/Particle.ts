import { Sprite } from 'pixi.js-legacy'
import { Color, Point } from './util'

export default class Particle {
  static _UID: { value: number } = { value: 0 }
  next = null
  prev = null
  uid = Particle._UID.value++
  movement = new Point()
  acceleration = new Point()
  velocity = new Point()
  size = new Point()
  sizeStart = new Point()
  sizeEnd = new Point()
  sinXVal = new Point()
  sinYVal = new Point()
  color = new Color()
  colorStart = new Color()
  colorEnd = new Color()
  maxLifeTime: number
  lifeTime: number
  lifeProgress: number
  x: number
  y: number
  velocityAngle: number
  radiansPerSecond: number
  radius: number
  radiusStart: number
  radiusEnd: number
  directionCos: number
  directionSin: number
  rotation: number
  rotationDelta: number
  angle: number
  sprite: Sprite
  showVortices: boolean
  turbulence: boolean
  finishingTexture: number

  constructor() {
    this.reset()
  }

  reset() {
    this.maxLifeTime = 0
    this.lifeTime = 0
    this.lifeProgress = 0
    this.x = 0
    this.y = 0

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

    this.showVortices = false
    this.turbulence = false

    this.rotation = 0
    this.rotationDelta = 0

    this.size.set(1, 1)
    this.sizeStart.set(0, 0)
    this.sizeEnd.set(0, 0)

    this.color.set(255, 255, 255, 1)
    this.colorStart.set(0, 0, 0, 1)
    this.colorEnd.set(0, 0, 0, 1)
  }

  isAlmostDead() {
    return this.lifeTime >= this.maxLifeTime - 0.1
  }

  isDead() {
    return this.lifeTime >= this.maxLifeTime
  }

  hide() {
    if (!this.sprite) return
    if (!this.sprite.visible) return
    this.sprite.visible = false
  }
}
