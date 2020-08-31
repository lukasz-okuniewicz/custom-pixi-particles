// tslint:disable:prefer-for-of
import engine from '../index'
import { Emitter } from '../emitter'
import Particle from '../Particle'

export default class Renderer extends PIXI.Container {
  blendMode: any
  emitter: Emitter
  onComplete: any = () => {}
  private _paused: boolean = false
  private currentTime: number = 0
  private lastTime: number = 0
  private textures: string[]
  private pausedTime: number = 0

  constructor(textures: string[], config: any) {
    super()
    PIXI.Container.call(this)

    this.emitter = new engine.Emitter()
    this.emitter.getParser().read(config)

    this.textures = textures

    this.emitter.on('emitter/create', this.onCreate, this)
    this.emitter.on('emitter/update', this.onUpdate, this)
    this.emitter.on('emitter/remove', this.onRemove, this)
    this.emitter.on('emitter/play', this.onPlay, this)
    this.emitter.on(Emitter.COMPLETE, this.onComplete, this)
  }

  set paused(paused: boolean) {
    if (paused) {
      this.pausedTime = performance.now()
    } else {
      this.pausedTime = 0
      this.lastTime = performance.now() - this.pausedTime
    }
    this._paused = paused
  }

  updateTransform() {
    if (this._paused) return
    this.currentTime = performance.now()

    if (this.lastTime === 0) {
      this.lastTime = this.currentTime
    }

    this.emitter.update((this.currentTime - this.lastTime) / 1000)
    PIXI.Container.prototype.updateTransform.call(this)

    this.lastTime = this.currentTime
  }

  onPlay() {
    this.currentTime = 0
    this.lastTime = 0
  }

  onCreate(particle: Particle) {
    const sprite = this.createSprite()
    sprite.visible = true
    if (this.blendMode) {
      sprite.blendMode = this.blendMode
    }
    particle.sprite = sprite
  }

  createSprite() {
    const sprite = new PIXI.Sprite(PIXI.Texture.from(this.getRandomTexture()))
    sprite.anchor.set(0.5)
    return this.addChild(sprite)
  }

  onUpdate(particle: Particle) {
    const sprite = particle.sprite

    sprite.x = particle.x
    sprite.y = particle.y

    sprite.scale.x = particle.size.x
    sprite.scale.y = particle.size.y

    sprite.tint = particle.color.hex
    sprite.alpha = particle.color.alpha
    sprite.rotation = particle.rotation
  }

  onRemove(particle: Particle) {
    const sprite = particle.sprite
    sprite.visible = false
    this.removeChild(sprite)
    delete particle.sprite
  }

  updateTexture() {
    for (let i = 0; i < this.children.length; ++i) {
      // @ts-ignore
      this.children[i].texture = PIXI.Texture.from(this.getRandomTexture())
    }
  }

  playEmitter() {
    this.emitter.play()
  }

  stopEmitter() {
    this.emitter.stop()
  }

  resetEmitter() {
    this.emitter.reset()
  }

  setTextures(textures: string[]) {
    this.textures = textures
    this.updateTexture()
  }

  private getRandomTexture(): string {
    return this.textures[Math.floor(Math.random() * this.textures.length)]
  }
}
