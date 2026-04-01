// tslint:disable:prefer-for-of
import engine from '../index'
import { Emitter } from '../emitter'
import Particle from '../Particle'
import BehaviourNames from '../behaviour/BehaviourNames'
import List from '../util/List'
import ParticlePool from '../ParticlePool'
import { ICustomPixiParticlesSettings } from '../customPixiParticlesSettingsInterface'
import { EmitterParser } from '../parser'
import { AnimatedSprite, Container, Graphics, Loader, Sprite, Texture, Ticker } from 'pixi.js-legacy'
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
import { resolveBlendMode } from '../util/resolveBlendMode'
import { resolveLoaderAssetId } from '../util/resolveLoaderAssetId'

/**
 * Editor preview only: plain Pixi `Container` + `Sprite` draw path (correct with mixed textures).
 * Games should use `Renderer` (`ParticleContainer` batching) via `customPixiParticles.create`.
 */
export default class TestRenderer extends Container {
  blendMode: any
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
  private unusedTurbulencePlainSprites: Sprite[] = []
  private unusedTurbulenceVortexSprites: Sprite[] = []
  private emitterParser: EmitterParser
  private turbulenceParser: EmitterParser | undefined
  private config: any
  private anchor: { x: number; y: number } = { x: 0.5, y: 0.5 }
  private _model: Model = new Model()
  private _canvasSizeProvider?: () => { width: number; height: number }
  private _ticker: Ticker | undefined
  private _visibilitychangeBinding: any
  private _firstParticleHasBeenDestroyed = false

  particleLinkGraphics: Graphics | null = null
  formPatternPreviewGraphics: Graphics | null = null
  private _particleLinkSettings: IParticleLinkSettings | null = null
  private _particleLinkFrameCounter = 0
  private _cachedBehavioursRevision = -1
  private _cachedToroidalWrapBehaviour: {
    enabled?: boolean
    useCanvasBounds?: boolean
  } | null = null
  private _cachedFormPatternBehaviour: {
    enabled?: boolean
    active?: boolean
    showTargetsPreview?: boolean
    showPathPreview?: boolean
    draw?: (g: Graphics, dt: number) => void
  } | null = null

  /**
   * Creates an instance of the editor preview renderer.
   */
  constructor(settings: ICustomPixiParticlesSettings) {
    const {
      textures,
      emitterConfig,
      finishingTextures,
      animatedSpriteZeroPad,
      animatedSpriteIndexToStart,
      vertices,
      position,
      rotation,
      uvs,
      tint,
      maxParticles: _maxParticles,
      maxFPS,
      minFPS,
      tickerSpeed,
      particleLinks,
      canvasSizeProvider,
    } = settings

    void _maxParticles
    void vertices
    void position
    void rotation
    void uvs
    void tint
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
        this.turbulenceEmitter.enablePerParticleUpdateEvents = false
        this.turbulenceEmitter.particleSpriteSync = (p: Particle) => this.onUpdateTurbulence(p)
        this.turbulenceEmitter.on(Emitter.CREATE, this.onCreateTurbulence, this)
        this.turbulenceEmitter.on(Emitter.REMOVE, this.onRemoveTurbulence, this)
      }
    }

    if (typeof emitterConfig.alpha !== 'undefined') {
      this.alpha = emitterConfig.alpha
    }

    if (typeof emitterConfig.blendMode !== 'undefined') {
      this.blendMode = resolveBlendMode(emitterConfig.blendMode)
    }

    if (typeof emitterConfig.anchor !== 'undefined') {
      this.anchor = emitterConfig.anchor
    }

    this.emitter = new engine.Emitter(this._model)
    this.emitter.enablePerParticleUpdateEvents = false
    this.emitterParser = this.emitter.getParser()
    this.emitterParser.read(emitterConfig, this._model)
    this.emitter.on(Emitter.CREATE, this.onCreate, this)
    this.emitter.on(Emitter.FINISHING, this.onFinishing, this)
    this.emitter.on(Emitter.REMOVE, this.onRemove, this)
    this.onCompleteFN = () => this.onComplete()
    this.emitter.on(Emitter.COMPLETE, this.onCompleteFN, this)
    this.emitter.particleSpriteSync = (p: Particle) => this.onUpdate(p)
    if (this.turbulenceEmitter && this.turbulenceEmitter.list) {
      this.emitter.turbulencePool.list = this.turbulenceEmitter.list
    }

    if (particleLinks != null) {
      const merged = mergeParticleLinkSettings(particleLinks)
      if (merged.enabled) {
        this._particleLinkSettings = merged
        const linkG = new Graphics()
        if (merged.blendMode != null && merged.blendMode !== '') {
          linkG.blendMode = resolveBlendMode(merged.blendMode)
        }
        this.particleLinkGraphics = linkG
        ;(this as any).addChildAt(linkG, 0)
      }
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

  private syncRendererBehaviourLookupsCache(): void {
    const eb = this.emitter?.behaviours as { structureRevision?: number; getByName?: (n: string) => unknown } | undefined
    if (!eb || typeof eb.structureRevision !== 'number' || typeof eb.getByName !== 'function') {
      this._cachedBehavioursRevision = -1
      this._cachedToroidalWrapBehaviour = null
      this._cachedFormPatternBehaviour = null
      return
    }
    if (this._cachedBehavioursRevision === eb.structureRevision) return
    this._cachedBehavioursRevision = eb.structureRevision
    this._cachedToroidalWrapBehaviour = eb.getByName(BehaviourNames.TOROIDAL_WRAP_BEHAVIOUR) as typeof this._cachedToroidalWrapBehaviour
    this._cachedFormPatternBehaviour = eb.getByName(BehaviourNames.FORM_PATTERN_BEHAVIOUR) as typeof this._cachedFormPatternBehaviour
  }

  /**
   * Feeds {@link Model.toroidalCanvasBounds} when ToroidalWrapBehaviour.useCanvasBounds is on.
   */
  private syncToroidalCanvasBoundsOnModel(): void {
    const wrap = this._cachedToroidalWrapBehaviour
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
   * Updates transforms and emitters (editor `Container` + sprites path).
   */
  _updateTransform(deltaTime: number) {
    if (this._paused) return

    this.syncRendererBehaviourLookupsCache()
    this.syncToroidalCanvasBoundsOnModel()

    this.emitter?.update(deltaTime)
    this.syncEmitterSpritesAfterUpdate(this.emitter, false)
    if (this.turbulenceEmitter) {
      this.turbulenceEmitter.update(deltaTime)
      this.syncEmitterSpritesAfterUpdate(this.turbulenceEmitter, true)
    }

    const formPatternBehaviour = this._cachedFormPatternBehaviour
    if (
      formPatternBehaviour?.enabled &&
      formPatternBehaviour.active &&
      (formPatternBehaviour.showTargetsPreview || formPatternBehaviour.showPathPreview) &&
      typeof formPatternBehaviour.draw === 'function'
    ) {
      if (!this.formPatternPreviewGraphics) {
        const g = new Graphics()
        this.formPatternPreviewGraphics = g
        ;(this as any).addChildAt(g, 0)
      }
      formPatternBehaviour.draw(this.formPatternPreviewGraphics, deltaTime)
    } else if (this.formPatternPreviewGraphics) {
      this.formPatternPreviewGraphics.clear()
    }
    if (this.formPatternPreviewGraphics && this.emitter?.behaviours) {
      const behaviours = this.emitter.behaviours.getAll() as any[]
      for (let i = 0; i < behaviours.length; i++) {
        const behaviour = behaviours[i]
        if (
          behaviour &&
          behaviour !== formPatternBehaviour &&
          behaviour.enabled &&
          typeof behaviour.draw === 'function'
        ) {
          behaviour.draw(this.formPatternPreviewGraphics, deltaTime)
        }
      }
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
        if (merged.blendMode != null && merged.blendMode !== '') {
          linkG.blendMode = resolveBlendMode(merged.blendMode)
        }
        this.particleLinkGraphics = linkG
        ;(this as any).addChildAt(linkG, 0)
      } else if (merged.blendMode != null && merged.blendMode !== '') {
        this.particleLinkGraphics.blendMode = resolveBlendMode(merged.blendMode)
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
      this.unusedStaticSprites[i].texture = Texture.from(id)
    }

    for (let i = 0; i < this.children.length; ++i) {
      const ch = this.children[i] as Sprite
      if (ch && (ch as any).texture) {
        ch.texture = Texture.from(pick())
      }
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
    this.unusedTurbulencePlainSprites = undefined
    // @ts-ignore
    this.unusedTurbulenceVortexSprites = undefined
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
      this.blendMode = resolveBlendMode(config.blendMode)
    }
    if (typeof config.anchor !== 'undefined') {
      this.anchor = config.anchor
    }
  }

  /** Defensive cleanup: editor/hot updates can briefly duplicate behaviour names. */
  private dedupeBehaviourNames(config: any) {
    if (!config || !Array.isArray(config.behaviours)) return config
    const seen = new Set<string>()
    config.behaviours = config.behaviours.filter((b: any) => {
      const name = b && b.name
      if (!name) return false
      if (seen.has(name)) return false
      seen.add(name)
      return true
    })
    return config
  }

  /**
   * Updates the configuration of the emitter
   * @param {any} config - Configuration object to be used to update the emitter
   * @param {boolean} resetDuration - should duration be reset
   */
  updateConfig(config: any, resetDuration = false) {
    this.dedupeBehaviourNames(config)
    this.emitterParser?.update(config, this._model, resetDuration)
    this.syncContainerFromEmitterConfig(config)
    const turbulenceConfigIndex = this.getConfigIndexByName(BehaviourNames.TURBULENCE_BEHAVIOUR, config)
    if (turbulenceConfigIndex === -1) return
    const turbulenceConfig = config.behaviours[turbulenceConfigIndex]
    if (turbulenceConfig.enabled === true) {
      if (!this.turbulenceEmitter) {
        this.turbulenceEmitter = new engine.Emitter(this._model)
        this.turbulenceParser = this.turbulenceEmitter.getParser()
        this.turbulenceParser.read(this.buildTurbulenceConfig(turbulenceConfig), this._model)
        this.turbulenceEmitter.enablePerParticleUpdateEvents = false
        this.turbulenceEmitter.on(Emitter.CREATE, this.onCreateTurbulence, this)
        this.turbulenceEmitter.on(Emitter.REMOVE, this.onRemoveTurbulence, this)
        if (this.turbulenceEmitter.list) {
          this.emitter.turbulencePool.list = this.turbulenceEmitter.list
        }
        // Secondary emitter must not own model.emitter — RecursiveFireworkBehaviour etc. use it as the primary emitter.
        this._model.emitter = this.emitter
        this.turbulenceEmitter.resetAndPlay()
      } else {
        this.turbulenceParser!.update(this.buildTurbulenceConfig(turbulenceConfig), this._model, resetDuration)
      }
    } else if (this.turbulenceEmitter) {
      this.turbulenceEmitter.stop()
      if (this._model.emitter === this.turbulenceEmitter) {
        this._model.emitter = this.emitter
      }
      if (this.emitter.turbulencePool.list) {
        this.emitter.turbulencePool.list.reset()
        this.emitter.turbulencePool.list = new List()
      }
      this.turbulenceEmitter.off(Emitter.CREATE, this.onCreateTurbulence, this)
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
    this._model.pointerWorld = { x: position.x, y: position.y }
    const behaviour = this.getByName(BehaviourNames.SPAWN_BEHAVIOUR)
    behaviour.customPoints[0].position.x = position.x
    behaviour.customPoints[0].position.y = position.y
    this.dedupeBehaviourNames(this.config)
    this.emitterParser?.update(this.config, this._model, resetDuration)
  }

  /**
   * Clears the sprite pool, the unused sprites list and the turbulence and particle pools.
   */
  clearPool() {
    const hadLinks = this.particleLinkGraphics != null
    const linkSettings = this._particleLinkSettings
    this.removeChildren()
    if (hadLinks && linkSettings?.enabled) {
      const linkG = new Graphics()
      if (linkSettings.blendMode != null && linkSettings.blendMode !== '') {
        linkG.blendMode = resolveBlendMode(linkSettings.blendMode)
      }
      this.particleLinkGraphics = linkG
      ;(this as any).addChildAt(linkG, 0)
    } else {
      this.particleLinkGraphics = null
    }
    this.unusedStaticSprites = []
    this.unusedAnimatedSprites = []
    this.unusedTurbulencePlainSprites = []
    this.unusedTurbulenceVortexSprites = []
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
    return Texture.from(assetId)
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
        const rnd = this.getRandomLegacyTexture()
        sprite.texture = Texture.from(rnd)
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
      padding = zeroPadLocal - frame.length
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
    const pool = particle.spawnTexturePool
    if (pool && pool.length > 0) {
      particle.textureVariantIndex = -1
      particle.spriteDisplayKind = 'static'
      const assetId = pool[Math.floor(Math.random() * pool.length)]
      const sprite = this.acquireStaticSprite(assetId)
      sprite.visible = true
      sprite.alpha = particle.color.alpha
      sprite.blendMode = resolveBlendMode(this.blendMode)
      sprite.x = particle.x
      sprite.y = particle.y
      sprite.scale.x = particle.size.x
      sprite.scale.y = particle.size.y
      sprite.tint = particle.color.hex
      sprite.rotation = particle.rotation
      particle.sprite = sprite
      particle.spawnTexturePool = null
      return
    }

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
      sprite.alpha = particle.color.alpha
      sprite.blendMode = resolveBlendMode(this.blendMode)
      sprite.x = particle.x
      sprite.y = particle.y
      sprite.scale.x = particle.size.x
      sprite.scale.y = particle.size.y
      sprite.tint = particle.color.hex
      sprite.rotation = particle.rotation
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
      sprite.alpha = particle.color.alpha
      sprite.blendMode = resolveBlendMode(this.blendMode)
      sprite.x = particle.x
      sprite.y = particle.y
      sprite.scale.x = particle.size.x
      sprite.scale.y = particle.size.y
      sprite.tint = particle.color.hex
      sprite.rotation = particle.rotation
      particle.sprite = sprite
      return
    }

    const sprite = this.acquireAnimatedSprite(frameTextures, loop, frameRate)
    sprite.visible = true
    sprite.alpha = particle.color.alpha
    sprite.blendMode = resolveBlendMode(this.blendMode)
    sprite.x = particle.x
    sprite.y = particle.y
    sprite.scale.x = particle.size.x
    sprite.scale.y = particle.size.y
    sprite.tint = particle.color.hex
    sprite.rotation = particle.rotation
    const randomStart = v.randomFrameStart ?? animDefaults?.randomFrameStart
    if (randomStart) {
      sprite.gotoAndPlay(this.getRandomFrameNumber(frameTextures.length))
    } else {
      sprite.play()
    }
    particle.sprite = sprite
  }

  private syncEmitterSpritesAfterUpdate(emitter: Emitter | undefined, turbulence: boolean) {
    if (!emitter) return
    if (emitter.particleSpriteSync) return
    if (turbulence) {
      emitter.list.forEach((p: Particle) => this.onUpdateTurbulence(p))
    } else {
      emitter.list.forEach((p: Particle) => this.onUpdate(p))
    }
  }

  private onCreateTurbulence(particle: Particle) {
    let sprite: Sprite
    if (particle.showVortices) {
      sprite = this.unusedTurbulenceVortexSprites.pop() ?? new Sprite(Texture.from('vortex.png'))
    } else {
      sprite = this.unusedTurbulencePlainSprites.pop() ?? new Sprite(Texture.WHITE)
    }
    sprite.anchor.set(this.anchor.x, this.anchor.y)
    if (!sprite.parent) this.addChild(sprite)
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
    if (!sprite) return

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
    if (!sprite) return

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
      const assetId = this.getRandomFinishingTexture()
      if (assetId) {
        sprite.texture = Texture.from(assetId)
      }
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
    if (!sprite) return
    if (!particle.showVortices) {
      sprite.visible = false
      sprite.alpha = 0
    }
    this.removeChild(sprite)
    if (particle.showVortices) this.unusedTurbulenceVortexSprites.push(sprite)
    else this.unusedTurbulencePlainSprites.push(sprite)
    delete (particle as any).sprite
  }

  private getRandomLegacyTexture(): string {
    if (!this.textures.length) return ''
    return this.textures[Math.floor(Math.random() * this.textures.length)]
  }

  private getRandomFinishingTexture(): string {
    const raw =
      this.finishingTextureNames[Math.floor(Math.random() * this.finishingTextureNames.length)]
    return resolveLoaderAssetId(raw)
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
          enabled: false,
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
