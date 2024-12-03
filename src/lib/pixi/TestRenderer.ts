// tslint:disable:prefer-for-of
import engine from '../index'
import { Emitter } from '../emitter'
import Particle from '../Particle'
import BehaviourNames from '../behaviour/BehaviourNames'
import List from '../util/List'
import ParticlePool from '../ParticlePool'
import { ICustomPixiParticlesSettings } from '../customPixiParticlesSettingsInterface'
import { EmitterParser } from '../parser'
import { AnimatedSprite, Container, Loader, Sprite, Texture, Ticker } from 'pixi.js-legacy'
import Model from '../Model'

/**
 * Renderer is a class used to render particles in the Pixi library.
 *
 * @class Renderer
 */
export default class TestRenderer extends Container {
  blendMode: any
  emitter: Emitter
  turbulenceEmitter: Emitter
  private _paused: boolean = false
  private _internalPaused: boolean = false
  private textures: string[]
  private zeroPad: number = 2
  private indexToStart: number = 0
  private finishingTextureNames: string[]
  private unusedSprites: any[] = []
  private emitterParser: EmitterParser
  private turbulenceParser: EmitterParser
  private config: any
  private anchor: { x: number; y: number } = { x: 0.5, y: 0.5 }
  private _model: Model = new Model()
  private _ticker: Ticker | undefined
  private _visibilitychangeBinding: any

  /**
   * Creates an instance of Renderer.
   *
   * @memberof Renderer
   */
  constructor(settings: ICustomPixiParticlesSettings) {
    const {
      textures,
      emitterConfig,
      finishingTextures,
      animatedSpriteZeroPad,
      animatedSpriteIndexToStart,
      maxFPS,
      minFPS,
      tickerSpeed,
    } = settings

    super()

    this.config = emitterConfig
    this.textures = textures
    this.finishingTextureNames = finishingTextures!
    this.zeroPad = animatedSpriteZeroPad!
    this.indexToStart = animatedSpriteIndexToStart!

    const turbulenceConfigIndex = this.getConfigIndexByName(BehaviourNames.TURBULENCE_BEHAVIOUR, emitterConfig)
    if (turbulenceConfigIndex !== -1) {
      const turbulenceConfig = emitterConfig.behaviours[turbulenceConfigIndex]
      if (turbulenceConfig.enabled === true) {
        this.turbulenceEmitter = new engine.Emitter(this._model)
        this.turbulenceParser = this.turbulenceEmitter.getParser()
        this.turbulenceParser.read(this.buildTurbulenceConfig(turbulenceConfig), this._model)
        this.turbulenceEmitter.on(Emitter.CREATE, this.onCreateTurbulence, this)
        this.turbulenceEmitter.on(Emitter.UPDATE, this.onUpdateTurbulence, this)
        this.turbulenceEmitter.on(Emitter.REMOVE, this.onRemoveTurbulence, this)
      }
    }

    if (typeof emitterConfig.alpha !== 'undefined') {
      this.alpha = emitterConfig.alpha
    }

    if (typeof emitterConfig.blendMode !== 'undefined') {
      this.blendMode = emitterConfig.blendMode
    }

    if (typeof emitterConfig.anchor !== 'undefined') {
      this.anchor = emitterConfig.anchor
    }

    this.emitter = new engine.Emitter(this._model)
    this.emitterParser = this.emitter.getParser()
    this.emitterParser.read(emitterConfig, this._model)
    this.emitter.on(Emitter.CREATE, this.onCreate, this)
    this.emitter.on(Emitter.UPDATE, this.onUpdate, this)
    this.emitter.on(Emitter.FINISHING, this.onFinishing, this)
    this.emitter.on(Emitter.REMOVE, this.onRemove, this)
    this.onCompleteFN = () => this.onComplete()
    this.emitter.on(Emitter.COMPLETE, this.onCompleteFN, this)
    if (this.turbulenceEmitter && this.turbulenceEmitter.list) {
      this.emitter.turbulencePool.list = this.turbulenceEmitter.list
    }

    this._visibilitychangeBinding = () => this.internalPause(document.hidden)
    document.addEventListener('visibilitychange', this._visibilitychangeBinding)

    const ticker = new Ticker()
    ticker.maxFPS = maxFPS
    ticker.minFPS = minFPS
    ticker.speed = tickerSpeed
    ticker.stop()
    // @ts-ignore
    ticker.add(this._updateTransform, this)
    ticker.start()
    this._ticker = ticker
  }

  onComplete: any = () => {
    /**/
  }

  onCompleteFN: any = () => {
    /**/
  }

  /**
   * Sets the paused state of the object.
   *
   * @param {boolean} [isPaused=true] - The new paused state of the object. Defaults to `true`.
   * @returns {void}
   */
  pause(isPaused: boolean = true): void {
    this.paused(isPaused)
  }

  /**
   * Resumes the object's operation by setting its paused state to false.
   *
   * @returns {void}
   */
  resume(): void {
    this.paused(false)
  }

  /**
   * Updates the transform of the ParticleContainer and updates the emitters.
   */
  _updateTransform(deltaTime: number) {
    if (this._paused) return

    this.emitter?.update(deltaTime)
    if (this.turbulenceEmitter) {
      this.turbulenceEmitter.update(deltaTime)
    }
  }

  /**
   *
   * @method updateTexture
   * @description This method updates the texture of the unused sprites and children to a randomly generated texture.
   */
  updateTexture() {
    for (let i = 0; i < this.unusedSprites.length; ++i) {
      this.unusedSprites[i].texture = Texture.from(this.getRandomTexture())
    }

    for (let i = 0; i < this.children.length; ++i) {
      // @ts-ignore
      this.children[i].texture = Texture.from(this.getRandomTexture())
    }
  }

  /**
   * This method is used to start the emitter and turbulenceEmitter if available.
   * @function start
   */
  start() {
    this.emitter?.resetAndPlay()
    if (this.turbulenceEmitter) {
      this.turbulenceEmitter.resetAndPlay()
    }
  }

  /**
   * Resets the particle emitters in this class without removing existing particles and plays them.
   * @function play
   */
  play() {
    this.emitter?.resetWithoutRemovingAndPlay()
    if (this.turbulenceEmitter) {
      this.turbulenceEmitter.resetWithoutRemovingAndPlay()
    }
  }

  /**
   * Immediately stops emitting particles
   */
  stopImmediately() {
    this._ticker?.destroy()
    this._ticker = undefined
    this.emitter?.stop()
    if (this.turbulenceEmitter) {
      this.turbulenceEmitter.stop()
    }
    this.emitter?.emit(Emitter.COMPLETE)
  }

  /**
   * Destroy particles
   */
  destroy() {
    this.stopImmediately()
    super.destroy()
    if (this.emitter) {
      this.emitter.destroy()
      this.emitter.off(Emitter.CREATE, this.onCreate, this)
      this.emitter.off(Emitter.UPDATE, this.onUpdate, this)
      this.emitter.off(Emitter.FINISHING, this.onFinishing, this)
      this.emitter.off(Emitter.REMOVE, this.onRemove, this)
      this.emitter.off(Emitter.COMPLETE, this.onCompleteFN, this)
      // @ts-ignore
      this.emitter = undefined
    }
    // @ts-ignore
    this.turbulenceEmitter = undefined
    // @ts-ignore
    this.turbulenceParser = undefined
    // @ts-ignore
    this.unusedSprites = undefined
    // @ts-ignore
    this._model = undefined
    this.onComplete = undefined
    this.onCompleteFN = undefined
    this.config = undefined
    // @ts-ignore
    this.textures = undefined
    // @ts-ignore
    this.finishingTextureNames = undefined
    // @ts-ignore
    this.emitterParser = undefined
    // @ts-ignore
    this.textures = undefined
    document.removeEventListener('visibilitychange', this._visibilitychangeBinding)
  }

  /**
   * Terminates the emitter and any turbulence emitter it is associated with
   */
  stop() {
    this.emitter?.stopWithoutKilling()
    if (this.turbulenceEmitter) {
      this.turbulenceEmitter.stop()
    }
  }

  /**
   * Resets the emitters to their initial state
   */
  resetEmitter() {
    this.emitter?.reset()
    if (this.turbulenceEmitter) {
      this.turbulenceEmitter.reset()
    }
  }

  /**
   * Sets the textures used by the emitter
   * @param {string[]} textures - Array of strings containing the textures to be used by the emitter
   */
  setTextures(textures: string[]) {
    this.textures = textures
    this.updateTexture()
  }

  /**
   * Updates the configuration of the emitter
   * @param {any} config - Configuration object to be used to update the emitter
   * @param {boolean} resetDuration - should duration be reset
   */
  updateConfig(config: any, resetDuration = false) {
    this.emitterParser?.update(config, this._model, resetDuration)
    if (this.turbulenceEmitter) {
      const turbulenceConfigIndex = this.getConfigIndexByName(BehaviourNames.TURBULENCE_BEHAVIOUR, config)
      if (turbulenceConfigIndex !== -1) {
        const turbulenceConfig = config.behaviours[turbulenceConfigIndex]
        if (turbulenceConfig.enabled === true) {
          this.turbulenceParser.update(this.buildTurbulenceConfig(turbulenceConfig), this._model, resetDuration)
        }
      }
    }
  }

  /**
   * Updates the position of the emitter
   * @param {Object} position - Object containing the x and y coordinates of the new position
   * @param {boolean} resetDuration - should duration be reset
   */
  updatePosition(position: { x: number; y: number }, resetDuration = true) {
    const behaviour = this.getByName(BehaviourNames.SPAWN_BEHAVIOUR)
    behaviour.customPoints[0].position.x = position.x
    behaviour.customPoints[0].position.y = position.y
    this.emitterParser?.update(this.config, this._model, resetDuration)
  }

  /**
   * Clears the sprite pool, the unused sprites list and the turbulence and particle pools.
   */
  clearPool() {
    this.removeChildren()
    this.unusedSprites = []
    if (this.turbulenceEmitter && this.turbulenceEmitter.list) {
      if (this.emitter) {
        this.emitter.turbulencePool.list.reset()
        this.emitter.turbulencePool.list = new List()
      }
    }
    if (this.emitter) {
      this.emitter.list.reset()
      this.emitter.list = new List()
    }
    ParticlePool.global.reset()
  }

  private getByName = (name: string) => {
    for (let i = 0; i < this.config.behaviours.length; ++i) {
      if (this.config.behaviours[i].name === name) {
        return this.config.behaviours[i]
      }
    }

    return null
  }

  private getOrCreateSprite() {
    if (this.unusedSprites.length > 0) {
      const sprite = this.unusedSprites.pop()
      if (this.finishingTextureNames && this.finishingTextureNames.length) {
        sprite.texture = Texture.from(this.getRandomTexture())
      }
      return sprite
    }

    if (this.emitter?.animatedSprite) {
      const textures: Texture[] = this.createFrameAnimationByName(this.getRandomTexture())
      if (textures.length) {
        const animation: AnimatedSprite = new AnimatedSprite(textures)
        animation.anchor.set(this.anchor.x, this.anchor.y)
        // @ts-ignore
        animation.loop = this.emitter?.animatedSprite.loop
        // @ts-ignore
        animation.animationSpeed = this.emitter?.animatedSprite.frameRate
        return this.addChild(animation)
      }
    }

    const sprite = new Sprite(Texture.from(this.getRandomTexture()))
    sprite.anchor.set(this.anchor.x, this.anchor.y)
    return this.addChild(sprite)
  }

  private createFrameAnimationByName(prefix: string, imageFileExtension: string = 'png'): Texture[] {
    const zeroPad = this.zeroPad
    const textures: Texture[] = []
    let frame: string = ''
    let indexFrame: number = this.indexToStart
    let padding: number = 0
    let texture: Texture | null
    const sheets = []
    const resources = Loader.shared.resources
    for (const key in resources) {
      if (resources[key].extension === 'json') {
        // @ts-ignore
        sheets.push(resources[key].spritesheet)
      }
    }

    do {
      frame = indexFrame.toString()
      padding = zeroPad - frame.length
      if (padding > 0) {
        frame = '0'.repeat(padding) + frame
      }

      try {
        let found = false
        for (const sheet of sheets) {
          if (sheet && sheet.textures[`${prefix}${frame}.${imageFileExtension}`]) {
            found = true
          }
        }
        if (found) {
          texture = Texture.from(`${prefix}${frame}.${imageFileExtension}`)
          textures.push(texture)
          indexFrame += 1
        } else {
          texture = null
          for (const key in resources) {
            if (key === `${prefix}${frame}.${imageFileExtension}`) {
              texture = Texture.from(`${prefix}${frame}.${imageFileExtension}`)
              textures.push(texture)
              indexFrame += 1
            }
          }
        }
      } catch (e) {
        texture = null
      }
    } while (texture)
    return textures
  }

  private onCreate(particle: Particle) {
    const sprite = this.getOrCreateSprite()
    sprite.visible = true
    sprite.alpha = 1
    if (this.blendMode) {
      sprite.blendMode = this.blendMode
    }
    if (sprite instanceof AnimatedSprite) {
      if (this.emitter?.animatedSprite.randomFrameStart) {
        const textures: Texture[] = this.createFrameAnimationByName(this.getRandomTexture())
        sprite.gotoAndPlay(this.getRandomFrameNumber(textures.length))
      } else {
        sprite.play()
      }
    }
    particle.sprite = sprite
  }

  private onCreateTurbulence(particle: Particle) {
    let sprite
    if (particle.showVortices) {
      sprite = new Sprite(Texture.from('vortex.png'))
    } else {
      sprite = new Sprite()
    }
    sprite.anchor.set(this.anchor.x, this.anchor.y)
    this.addChild(sprite)
    sprite.visible = false
    sprite.alpha = 0
    particle.sprite = sprite
    if (particle.showVortices && sprite) {
      sprite.visible = true
      sprite.alpha = 1
    }
  }

  private onUpdate(particle: Particle) {
    const sprite = particle.sprite

    sprite.x = particle.x
    sprite.y = particle.y

    sprite.scale.x = particle.size.x
    sprite.scale.y = particle.size.y

    sprite.tint = particle.color.hex
    sprite.alpha = particle.color.alpha
    sprite.rotation = particle.rotation
  }

  private onUpdateTurbulence(particle: Particle) {
    const sprite = particle.sprite

    sprite.x = particle.x
    sprite.y = particle.y

    if (particle.showVortices && sprite) {
      sprite.scale.x = particle.size.x
      sprite.scale.y = particle.size.y

      sprite.tint = particle.color.hex
      sprite.alpha = particle.color.alpha
      sprite.rotation = particle.rotation
    }
  }

  private onFinishing(particle: Particle) {
    if (!this.finishingTextureNames || !this.finishingTextureNames.length) return
    const sprite = particle.sprite
    if (particle.finishingTexture <= this.finishingTextureNames.length - 1) {
      sprite.texture = Texture.from(this.getRandomFinishingTexture())
      particle.finishingTexture++
    }
  }

  private onRemove(particle: Particle) {
    const sprite = particle.sprite
    if (!particle.showVortices && sprite) {
      sprite.visible = false
      sprite.alpha = 0
    }
    particle.finishingTexture = 0
    this.unusedSprites.push(sprite)
    if (sprite instanceof AnimatedSprite) {
      sprite.stop()
    }
  }

  private onRemoveTurbulence(particle: Particle) {
    const sprite = particle.sprite
    if (!particle.showVortices && sprite) {
      sprite.visible = false
      sprite.alpha = 0
    }
    this.removeChild(sprite)
    delete (particle as any).sprite
  }

  private getRandomTexture(): string {
    return this.textures[Math.floor(Math.random() * this.textures.length)]
  }

  private getRandomFinishingTexture(): string {
    return this.finishingTextureNames[Math.floor(Math.random() * this.finishingTextureNames.length)]
  }

  private getRandomFrameNumber(textures: number): number {
    return Math.floor(Math.random() * textures)
  }

  private paused(paused: boolean) {
    if (paused === this._paused) return
    this._paused = paused
    if (paused) {
      this._ticker?.stop()
      this.emitter?.pause()
    } else {
      this._ticker?.start()
      this.emitter?.resume()
    }
  }

  private internalPause(paused: boolean) {
    if (this._paused) return
    if (paused === this._internalPaused) return
    this._internalPaused = paused
  }

  private getConfigIndexByName(name: string, config: any) {
    let index = -1
    config.behaviours.forEach((behaviour: any, i: number) => {
      if (behaviour.name === name) {
        index = i
      }
    })
    return index
  }

  private buildTurbulenceConfig(turbulenceConfig: any) {
    return {
      behaviours: [
        {
          enabled: true,
          priority: 10000,
          maxLifeTime: turbulenceConfig.maxLifeTime || 2,
          timeVariance: turbulenceConfig.maxLifeTimeVariance || 0,
          name: 'LifeBehaviour',
        },
        {
          priority: 100,
          customPoints: [
            {
              spawnType: 'Ring',
              radius: 0,
              position: {
                x: turbulenceConfig.position.x || 0,
                y: turbulenceConfig.position.y || 0,
              },
              positionVariance: {
                x: turbulenceConfig.positionVariance.x || 0,
                y: turbulenceConfig.positionVariance.y || 0,
              },
            },
          ],
          name: 'SpawnBehaviour',
        },
        {
          enabled: true,
          priority: 100,
          velocity: {
            x: turbulenceConfig.velocity.x || 0,
            y: turbulenceConfig.velocity.y || 0,
          },
          velocityVariance: {
            x: turbulenceConfig.velocityVariance.x || 0,
            y: turbulenceConfig.velocityVariance.y || 0,
          },
          acceleration: {
            x: turbulenceConfig.acceleration.x || 0,
            y: turbulenceConfig.acceleration.y || 0,
          },
          accelerationVariance: {
            x: turbulenceConfig.accelerationVariance.x || 0,
            y: turbulenceConfig.accelerationVariance.y || 0,
          },
          name: 'PositionBehaviour',
        },
        {
          enabled: true,
          priority: 0,
          sizeStart: {
            x: turbulenceConfig.sizeStart.x || 1,
            y: turbulenceConfig.sizeStart.y || 1,
          },
          sizeEnd: {
            x: turbulenceConfig.sizeEnd.x || 1,
            y: turbulenceConfig.sizeEnd.y || 1,
          },
          startVariance: turbulenceConfig.startVariance || 0,
          endVariance: turbulenceConfig.endVariance || 0,
          name: 'SizeBehaviour',
        },
        {
          enabled: true,
          priority: 0,
          rotation: 12,
          variance: 0,
          name: 'RotationBehaviour',
        },
        {
          enabled: true,
          priority: 0,
          showVortices: turbulenceConfig.showVortices || false,
          turbulence: true,
          name: 'TurbulenceBehaviour',
        },
      ],
      emitController: {
        _maxParticles: 0,
        _maxLife: 1,
        _emitPerSecond: turbulenceConfig.emitPerSecond || 2,
        _frames: 0,
        name: 'UniformEmission',
      },
      duration: turbulenceConfig.duration || -1,
    }
  }
}
