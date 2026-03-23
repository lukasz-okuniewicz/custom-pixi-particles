// tslint:disable:prefer-for-of
import engine from '../index'
import { Emitter } from '../emitter'
import Particle from '../Particle'
import BehaviourNames from '../behaviour/BehaviourNames'
import List from '../util/List'
import ParticlePool from '../ParticlePool'
import { ICustomPixiParticlesSettings } from '../customPixiParticlesSettingsInterface'
import { EmitterParser } from '../parser'
import { AnimatedSprite, Assets, Container, Graphics, Sprite, Texture, Ticker } from 'pixi.js'
import Model from '../Model'
import {
  pickVariantIndex,
  resolveTextureVariants,
  type TextureVariantFrames,
} from '../textureVariants'
import {
  drawParticleLinks,
  mergeParticleLinkSettings,
  type IParticleLinkSettings,
} from './particleLinkLayer'

/**
 * Renderer is a class used to render particles in the Pixi library.
 *
 * @class Renderer
 */
export default class TestRenderer extends Container {
  emitter: Emitter
  turbulenceEmitter: Emitter | undefined
  private static readonly BASE_TICKER_SPEED = 0.02
  private _paused: boolean = false
  private _internalPaused: boolean = false
  private textures: string[]
  private zeroPad: number = 2
  private indexToStart: number = 0
  private finishingTextureNames: string[]
  private unusedStaticSprites: Sprite[] = []
  private unusedAnimatedSprites: AnimatedSprite[] = []
  private emitterParser: EmitterParser
  private turbulenceParser: EmitterParser | undefined
  private config: any
  private anchor: { x: number; y: number } = { x: 0.5, y: 0.5 }
  private _model: Model = new Model()
  private _canvasSizeProvider?: () => { width: number; height: number }
  private _ticker: Ticker | undefined
  private _visibilitychangeBinding: any
  private _firstParticleHasBeenDestroyed = false
  wireframeGraphics: Graphics | null = null

  particleLinkGraphics: Graphics | null = null
  formPatternPreviewGraphics: Graphics | null = null
  private _particleLinkSettings: IParticleLinkSettings | null = null
  private _particleLinkFrameCounter = 0

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
      particleLinks,
      canvasSizeProvider,
    } = settings

    super()

    this._canvasSizeProvider = canvasSizeProvider
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

    if (particleLinks != null) {
      const merged = mergeParticleLinkSettings(particleLinks)
      if (merged.enabled) {
        this._particleLinkSettings = merged
        const linkG = new Graphics()
        if (merged.blendMode != null) {
          linkG.blendMode = merged.blendMode
        }
        this.particleLinkGraphics = linkG
        this.addChildAt(linkG, 0)
      }
    }

    const wireframeConfigIndex = this.getConfigIndexByName(BehaviourNames.WIREFRAME_3D_BEHAVIOUR, emitterConfig)
    if (wireframeConfigIndex !== -1) {
      const wireframeGraphics = new Graphics()
      this.addChildAt(wireframeGraphics, this.particleLinkGraphics ? 1 : 0)
      this.wireframeGraphics = wireframeGraphics
    }

    this._visibilitychangeBinding = () => this.internalPause(document.hidden)
    document.addEventListener('visibilitychange', this._visibilitychangeBinding)

    const ticker = new Ticker()
    ticker.maxFPS = maxFPS || 60
    ticker.minFPS = minFPS || 60
    ticker.speed = tickerSpeed || TestRenderer.BASE_TICKER_SPEED
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

  public onFirstParticleDestroy: any = () => {
    /**/
  }

  setTickerSpeed = (speedMultiplier: number) => {
    if (speedMultiplier < 0) {
      console.warn('Speed multiplier cannot be negative. Using 0.')
      speedMultiplier = 0
    }

    if (this._ticker) {
      this._ticker.speed = TestRenderer.BASE_TICKER_SPEED * speedMultiplier
    }
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
   * Feeds {@link Model.toroidalCanvasBounds} when ToroidalWrapBehaviour.useCanvasBounds is on.
   */
  private syncToroidalCanvasBoundsOnModel(): void {
    const wrap = this.emitter?.behaviours?.getByName(BehaviourNames.TOROIDAL_WRAP_BEHAVIOUR) as
      | { enabled?: boolean; useCanvasBounds?: boolean }
      | null
    if (!wrap?.enabled || !wrap.useCanvasBounds) {
      this._model.clearToroidalCanvasBounds()
      return
    }
    if (this._canvasSizeProvider) {
      try {
        const { width, height } = this._canvasSizeProvider()
        if (width > 0 && height > 0) {
          this._model.setToroidalCanvasBoundsFromSize(width, height)
          return
        }
      } catch {
        //
      }
    }
    this._model.clearToroidalCanvasBounds()
  }

  /**
   * Updates the transform of the ParticleContainer and updates the emitters.
   */
  _updateTransform(ticker: Ticker): void {
    if (this._paused) return

    this.syncToroidalCanvasBoundsOnModel()

    this.emitter?.update(ticker.deltaTime)
    if (this.turbulenceEmitter) {
      this.turbulenceEmitter.update(ticker.deltaTime)
    }
    const wireframeBehaviour = this.emitter?.behaviours?.getByName(BehaviourNames.WIREFRAME_3D_BEHAVIOUR) as any
    if (wireframeBehaviour?.enabled && this.wireframeGraphics && typeof wireframeBehaviour.draw === 'function') {
      wireframeBehaviour.draw(this.wireframeGraphics, ticker.deltaTime)
    }

    const formPatternBehaviour = this.emitter?.behaviours?.getByName(BehaviourNames.FORM_PATTERN_BEHAVIOUR) as
      | {
          enabled?: boolean
          active?: boolean
          showTargetsPreview?: boolean
          showPathPreview?: boolean
          draw?: (g: Graphics, dt: number) => void
        }
      | null
    if (
      formPatternBehaviour?.enabled &&
      formPatternBehaviour.active &&
      (formPatternBehaviour.showTargetsPreview || formPatternBehaviour.showPathPreview) &&
      typeof formPatternBehaviour.draw === 'function'
    ) {
      if (!this.formPatternPreviewGraphics) {
        const g = new Graphics()
        this.formPatternPreviewGraphics = g
        this.addChildAt(g, 0)
      }
      formPatternBehaviour.draw(this.formPatternPreviewGraphics, ticker.deltaTime)
    } else if (this.formPatternPreviewGraphics) {
      this.formPatternPreviewGraphics.clear()
    }

    if (this.particleLinkGraphics && this._particleLinkSettings?.enabled && this.emitter?.list) {
      const every = Math.max(1, this._particleLinkSettings.updateEveryNFrames | 0)
      if (this._particleLinkFrameCounter % every === 0) {
        drawParticleLinks(this.particleLinkGraphics, this.emitter.list, this._particleLinkSettings)
      }
      this._particleLinkFrameCounter = (this._particleLinkFrameCounter + 1) % 4096
    }
  }

  setParticleLinks(partial: Partial<IParticleLinkSettings> | null | undefined): void {
    if (partial == null) return
    const merged = mergeParticleLinkSettings({
      ...(this._particleLinkSettings || undefined),
      ...partial,
    })
    this._particleLinkSettings = merged
    if (merged.enabled) {
      if (!this.particleLinkGraphics) {
        const linkG = new Graphics()
        if (merged.blendMode != null) {
          linkG.blendMode = merged.blendMode
        }
        this.particleLinkGraphics = linkG
        this.addChildAt(linkG, 0)
        if (this.wireframeGraphics) {
          this.setChildIndex(this.wireframeGraphics, 1)
        }
      } else if (merged.blendMode != null) {
        this.particleLinkGraphics.blendMode = merged.blendMode
      }
    } else if (this.particleLinkGraphics) {
      this.particleLinkGraphics.clear()
    }
  }

  /**
   *
   * @method updateTexture
   * @description This method updates the texture of the unused sprites and children to a randomly generated texture.
   */
  updateTexture() {
    const ids = this.getStaticTextureIdsForPreview()
    const pick = () => ids[Math.floor(Math.random() * Math.max(1, ids.length))] || this.getRandomLegacyTexture()
    for (let i = 0; i < this.unusedStaticSprites.length; ++i) {
      const id = pick()
      const t = Assets.get(id) ?? Texture.from(id)
      this.unusedStaticSprites[i].texture = t
    }
  }

  /**
   * This method is used to start the emitter and turbulenceEmitter if available.
   * @function start
   */
  start() {
    this._firstParticleHasBeenDestroyed = false
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
    this._firstParticleHasBeenDestroyed = false
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
    if (this.particleLinkGraphics) {
      this.particleLinkGraphics.destroy()
      this.particleLinkGraphics = null
    }
    this._particleLinkSettings = null
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
    this.unusedStaticSprites = undefined
    // @ts-ignore
    this.unusedAnimatedSprites = undefined
    // @ts-ignore
    this._model = undefined
    this.onComplete = undefined
    this.onCompleteFN = undefined
    this.onFirstParticleDestroy = undefined
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
   * Keeps Pixi container state in sync with emitter config after hot reloads.
   * Sprites read blendMode from this container on create (not from emitter.blendMode).
   */
  private syncContainerFromEmitterConfig(config: any) {
    this.config = config
    if (typeof config.alpha !== 'undefined') {
      this.alpha = config.alpha
    }
    if (typeof config.blendMode !== 'undefined') {
      this.blendMode = config.blendMode
    }
    if (typeof config.anchor !== 'undefined') {
      this.anchor = config.anchor
    }
  }

  /**
   * Updates the configuration of the emitter
   * @param {any} config - Configuration object to be used to update the emitter
   * @param {boolean} resetDuration - should duration be reset
   */
  updateConfig(config: any, resetDuration = false) {
    this.emitterParser?.update(config, this._model, resetDuration)
    this.syncContainerFromEmitterConfig(config)
    const wireframeConfigIndex = this.getConfigIndexByName(BehaviourNames.WIREFRAME_3D_BEHAVIOUR, config)
    if (wireframeConfigIndex !== -1 && !this.wireframeGraphics) {
      const wireframeGraphics = new Graphics()
      this.addChildAt(wireframeGraphics, this.particleLinkGraphics ? 1 : 0)
      this.wireframeGraphics = wireframeGraphics
    }
    const turbulenceConfigIndex = this.getConfigIndexByName(BehaviourNames.TURBULENCE_BEHAVIOUR, config)
    if (turbulenceConfigIndex === -1) return
    const turbulenceConfig = config.behaviours[turbulenceConfigIndex]
    if (turbulenceConfig.enabled === true) {
      if (!this.turbulenceEmitter) {
        this.turbulenceEmitter = new engine.Emitter(this._model)
        this.turbulenceParser = this.turbulenceEmitter.getParser()
        this.turbulenceParser.read(this.buildTurbulenceConfig(turbulenceConfig), this._model)
        this.turbulenceEmitter.on(Emitter.CREATE, this.onCreateTurbulence, this)
        this.turbulenceEmitter.on(Emitter.UPDATE, this.onUpdateTurbulence, this)
        this.turbulenceEmitter.on(Emitter.REMOVE, this.onRemoveTurbulence, this)
        if (this.turbulenceEmitter.list) {
          this.emitter.turbulencePool.list = this.turbulenceEmitter.list
        }
        this.turbulenceEmitter.resetAndPlay()
      } else {
        this.turbulenceParser!.update(this.buildTurbulenceConfig(turbulenceConfig), this._model, resetDuration)
      }
    } else if (this.turbulenceEmitter) {
      this.turbulenceEmitter.stop()
      if (this.emitter.turbulencePool.list) {
        this.emitter.turbulencePool.list.reset()
        this.emitter.turbulencePool.list = new List()
      }
      this.turbulenceEmitter.off(Emitter.CREATE, this.onCreateTurbulence, this)
      this.turbulenceEmitter.off(Emitter.UPDATE, this.onUpdateTurbulence, this)
      this.turbulenceEmitter.off(Emitter.REMOVE, this.onRemoveTurbulence, this)
      this.turbulenceEmitter = undefined
      this.turbulenceParser = undefined
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
    const hadLinks = this.particleLinkGraphics != null
    const linkSettings = this._particleLinkSettings
    const hadWireframe = this.wireframeGraphics != null
    this.removeChildren()
    if (hadLinks && linkSettings?.enabled) {
      const linkG = new Graphics()
      if (linkSettings.blendMode != null) {
        linkG.blendMode = linkSettings.blendMode
      }
      this.particleLinkGraphics = linkG
      this.addChildAt(linkG, 0)
    } else {
      this.particleLinkGraphics = null
    }
    if (hadWireframe) {
      const wf = new Graphics()
      this.wireframeGraphics = wf
      this.addChildAt(wf, this.particleLinkGraphics ? 1 : 0)
    }
    this.unusedStaticSprites = []
    this.unusedAnimatedSprites = []
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

  private textureFromAssetId(assetId: string): Texture {
    return Assets.get(assetId) ?? Texture.from(assetId)
  }

  private getStaticTextureIdsForPreview(): string[] {
    const { variants } = resolveTextureVariants(this.textures, this.emitter)
    const ids: string[] = []
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i]
      if (v.type === 'staticRandom') {
        for (let j = 0; j < v.textures.length; j++) {
          ids.push(v.textures[j])
        }
      }
    }
    if (ids.length) return ids
    return this.textures
  }

  private acquireStaticSprite(assetId: string): Sprite {
    let sprite = this.unusedStaticSprites.pop()
    if (sprite) {
      if (this.finishingTextureNames && this.finishingTextureNames.length) {
        sprite.texture = Assets.get(this.getRandomLegacyTexture()) ?? Texture.from(this.getRandomLegacyTexture())
      } else {
        sprite.texture = this.textureFromAssetId(assetId)
      }
      return sprite
    }

    sprite = new Sprite(this.textureFromAssetId(assetId))
    sprite.anchor.set(this.anchor.x, this.anchor.y)
    return this.addChild(sprite)
  }

  private acquireAnimatedSprite(
    frameTextures: Texture[],
    loop: boolean,
    frameRate: number,
  ): AnimatedSprite {
    let anim = this.unusedAnimatedSprites.pop()
    if (anim && frameTextures.length) {
      anim.textures = frameTextures
      anim.loop = loop
      anim.animationSpeed = frameRate
      anim.gotoAndStop(0)
      return anim
    }

    const animation: AnimatedSprite = new AnimatedSprite(frameTextures)
    animation.anchor.set(this.anchor.x, this.anchor.y)
    animation.loop = loop
    animation.animationSpeed = frameRate
    return this.addChild(animation)
  }

  private createFrameAnimationByName(
    prefix: string,
    imageFileExtension: string = 'png',
    zeroPad: number = this.zeroPad,
    indexFrameStart: number = this.indexToStart,
  ): Texture[] {
    const zeroPadLocal = zeroPad
    const textures: Texture[] = []
    let frame: string = ''
    let indexFrame: number = indexFrameStart
    let padding: number = 0
    let texture: any

    do {
      frame = indexFrame.toString()
      padding = zeroPadLocal - frame.length
      if (padding > 0) {
        frame = '0'.repeat(padding) + frame
      }
      try {
        const fileName = `${prefix}${frame}.${imageFileExtension}`
        const file = Assets.get(fileName)
        if (file) {
          texture = file
          textures.push(texture)
          indexFrame += 1
        } else {
          texture = null
        }
      } catch (e) {
        texture = null
      }
    } while (texture)
    return textures
  }

  private onCreate(particle: Particle) {
    const { variants, weights } = resolveTextureVariants(this.textures, this.emitter)
    const idx = pickVariantIndex(weights)
    const variant = variants[idx]
    particle.textureVariantIndex = idx

    const animDefaults = this.emitter?.animatedSprite as any

    if (variant.type === 'staticRandom') {
      particle.spriteDisplayKind = 'static'
      const pool = variant.textures.length ? variant.textures : this.textures
      const assetId = pool[Math.floor(Math.random() * pool.length)]
      const sprite = this.acquireStaticSprite(assetId)
      sprite.visible = true
      sprite.alpha = 1
      if (this.blendMode) {
        sprite.blendMode = this.blendMode
      }
      particle.sprite = sprite
      return
    }

    const v = variant as TextureVariantFrames
    particle.spriteDisplayKind = 'animated'
    const frameTextures = this.createFrameAnimationByName(
      v.prefix,
      'png',
      v.animatedSpriteZeroPad ?? this.zeroPad,
      v.animatedSpriteIndexToStart ?? this.indexToStart,
    )
    const loop = v.loop ?? animDefaults?.loop ?? true
    const frameRate = v.frameRate ?? animDefaults?.frameRate ?? 0.25
    if (!frameTextures.length) {
      const assetId = this.getRandomLegacyTexture()
      particle.spriteDisplayKind = 'static'
      const sprite = this.acquireStaticSprite(assetId)
      sprite.visible = true
      sprite.alpha = 1
      if (this.blendMode) {
        sprite.blendMode = this.blendMode
      }
      particle.sprite = sprite
      return
    }

    const sprite = this.acquireAnimatedSprite(frameTextures, loop, frameRate)
    sprite.visible = true
    sprite.alpha = 1
    if (this.blendMode) {
      sprite.blendMode = this.blendMode
    }
    const randomStart = v.randomFrameStart ?? animDefaults?.randomFrameStart
    if (randomStart) {
      sprite.gotoAndPlay(this.getRandomFrameNumber(frameTextures.length))
    } else {
      sprite.play()
    }
    particle.sprite = sprite
  }

  private onCreateTurbulence(particle: Particle) {
    let sprite
    if (particle.showVortices) {
      sprite = new Sprite(Texture.from('vortex.png'))
    } else {
      sprite = new Sprite(Texture.WHITE)
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
    if (sprite instanceof AnimatedSprite) return
    if (particle.finishingTexture <= this.finishingTextureNames.length - 1) {
      sprite.texture = Texture.from(this.getRandomFinishingTexture())
      particle.finishingTexture++
    }
  }

  private onRemove(particle: Particle) {
    if (!this._firstParticleHasBeenDestroyed) {
      if (this.onFirstParticleDestroy) this.onFirstParticleDestroy()
      this._firstParticleHasBeenDestroyed = true
    }

    const sprite = particle.sprite
    if (sprite) {
      if (!particle.showVortices) {
        sprite.visible = false
        sprite.alpha = 0
      }
      if (sprite instanceof AnimatedSprite) {
        sprite.stop()
        this.unusedAnimatedSprites.push(sprite)
      } else {
        this.unusedStaticSprites.push(sprite as Sprite)
      }
      ;(particle as any).sprite = null
    }

    particle.finishingTexture = 0
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

  private getRandomLegacyTexture(): string {
    if (!this.textures.length) return ''
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
            x: typeof turbulenceConfig.sizeStart?.x === 'number' ? turbulenceConfig.sizeStart.x : 1,
            y: typeof turbulenceConfig.sizeStart?.y === 'number' ? turbulenceConfig.sizeStart.y : 1,
          },
          sizeEnd: {
            x: typeof turbulenceConfig.sizeEnd?.x === 'number' ? turbulenceConfig.sizeEnd.x : 1,
            y: typeof turbulenceConfig.sizeEnd?.y === 'number' ? turbulenceConfig.sizeEnd.y : 1,
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
        _maxParticles: 100,
        _maxLife: 1,
        _emitPerSecond: turbulenceConfig.emitPerSecond || 2,
        _frames: 1.0,
        name: 'UniformEmission',
      },
      duration: turbulenceConfig.duration || -1,
    }
  }
}
