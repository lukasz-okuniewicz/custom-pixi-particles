// tslint:disable:prefer-for-of
import engine from '../index'
import { Emitter } from '../emitter'
import turbulencePool from '../util/turbulencePool'
import Particle from '../Particle'
import BehaviourNames from '../behaviour/BehaviourNames'
import List from '../util/List'
import ParticlePool from '../ParticlePool'
import { ICustomPixiParticlesSettings } from '../customPixiParticlesSettingsInterface'
import { EmitterParser } from '../parser'

export default class Renderer {
  blendMode: any
  emitter: Emitter
  turbulenceEmitter: Emitter
  onComplete: any = () => {}
  particlesContainer: any;
  private _paused: boolean = false
  private currentTime: number = 0
  private lastTime: number = 0
  private textures: any[]
  private finishingTextureNames: any[]
  private pausedTime: number = 0
  private unusedSprites: any[] = []
  private emitterParser: EmitterParser
  private turbulenceParser: EmitterParser
  private config: any
  private PIXI: any;

  constructor(settings: ICustomPixiParticlesSettings) {
    const { textures, emitterConfig, finishingTextures, PIXI } = settings

    this.particlesContainer = new PIXI.ParticleContainer(100000, {
      vertices: true,
      position: true,
      rotation: true,
      uvs: !!(
        settings.emitterConfig.animatedSprite ||
        (settings.finishingTextures && settings.finishingTextures.length)
      ),
      tint: true,
    })

    this.PIXI = PIXI
    this.config = emitterConfig
    this.textures = textures
    this.finishingTextureNames = finishingTextures!

    const turbulenceConfigIndex = this.getConfigIndexByName(BehaviourNames.TURBULENCE_BEHAVIOUR, emitterConfig)
    if (turbulenceConfigIndex !== -1) {
      const turbulenceConfig = emitterConfig.behaviours[turbulenceConfigIndex]
      if (turbulenceConfig.enabled === true) {
        this.turbulenceEmitter = new engine.Emitter()
        this.turbulenceParser = this.turbulenceEmitter.getParser()
        this.turbulenceParser.read(this.buildTurbulenceConfig(turbulenceConfig))
        this.turbulenceEmitter.on(Emitter.CREATE, this.onCreateTurbulence, this)
        this.turbulenceEmitter.on(Emitter.UPDATE, this.onUpdateTurbulence, this)
        this.turbulenceEmitter.on(Emitter.REMOVE, this.onRemoveTurbulence, this)
      }
    }

    if (typeof emitterConfig.alpha !== 'undefined') {
      this.particlesContainer.alpha = emitterConfig.alpha
    }

    if (typeof emitterConfig.blendMode !== 'undefined') {
      this.blendMode = emitterConfig.blendMode
    }

    this.emitter = new engine.Emitter()
    this.emitterParser = this.emitter.getParser()
    this.emitterParser.read(emitterConfig)
    this.emitter.on(Emitter.CREATE, this.onCreate, this)
    this.emitter.on(Emitter.UPDATE, this.onUpdate, this)
    this.emitter.on(Emitter.FINISHING, this.onFinishing, this)
    this.emitter.on(Emitter.REMOVE, this.onRemove, this)
    this.emitter.on(Emitter.PLAY, this.onPlay, this)
    this.emitter.on(Emitter.COMPLETE, () => {
      this.onComplete()
    })
    if (this.turbulenceEmitter && this.turbulenceEmitter.list) {
      turbulencePool.list = this.turbulenceEmitter.list
    }

    document.addEventListener('visibilitychange', () => this.paused(document.hidden))

    const ticker = this.PIXI.Ticker.shared
    ticker.add(() => {
      this.updateTransform()
    })
  }

  updateTransform() {
    if (this._paused) return
    this.currentTime = performance.now()

    if (this.lastTime === 0) {
      this.lastTime = this.currentTime
    }

    this.emitter.update((this.currentTime - this.lastTime) / 1000)
    if (this.turbulenceEmitter) {
      this.turbulenceEmitter.update((this.currentTime - this.lastTime) / 1000)
    }

    this.lastTime = this.currentTime
  }

  updateTexture() {
    for (let i = 0; i < this.unusedSprites.length; ++i) {
      this.unusedSprites[i].texture = this.PIXI.Texture.from(this.getRandomTexture())
    }

    for (let i = 0; i < this.particlesContainer.children.length; ++i) {
      // @ts-ignore
      this.children[i].texture = this.PIXI.Texture.from(this.getRandomTexture())
    }
  }

  start() {
    this.emitter.resetAndPlay()
    if (this.turbulenceEmitter) {
      this.turbulenceEmitter.resetAndPlay()
    }
  }

  play() {
    this.emitter.resetWithoutRemovingAndPlay()
    if (this.turbulenceEmitter) {
      this.turbulenceEmitter.resetWithoutRemovingAndPlay()
    }
  }

  stopImmediately() {
    this.emitter.stop()
    if (this.turbulenceEmitter) {
      this.turbulenceEmitter.stop()
    }
    this.emitter.emit(Emitter.COMPLETE)
  }

  stop() {
    this.emitter.stopWithoutKilling()
    if (this.turbulenceEmitter) {
      this.turbulenceEmitter.stop()
    }
  }

  resetEmitter() {
    this.emitter.reset()
    if (this.turbulenceEmitter) {
      this.turbulenceEmitter.reset()
    }
  }

  setTextures(textures: any[]) {
    this.textures = textures
    this.updateTexture()
  }

  updateConfig(config: any) {
    this.emitterParser.update(config)
    if (this.turbulenceEmitter) {
      const turbulenceConfigIndex = this.getConfigIndexByName(BehaviourNames.TURBULENCE_BEHAVIOUR, config)
      if (turbulenceConfigIndex !== -1) {
        const turbulenceConfig = config.behaviours[turbulenceConfigIndex]
        if (turbulenceConfig.enabled === true) {
          this.turbulenceParser.update(this.buildTurbulenceConfig(turbulenceConfig))
        }
      }
    }
  }

  updatePosition(position: { x: number, y: number }) {
    const positionBehaviour = this.getByName(BehaviourNames.POSITION_BEHAVIOUR)
    positionBehaviour.position.x = position.x
    positionBehaviour.position.y = position.y
    this.emitterParser.update(this.config)
  }

  clearPool() {
    this.particlesContainer.removeChildren()
    this.unusedSprites = []
    if (this.turbulenceEmitter && this.turbulenceEmitter.list) {
      turbulencePool.list.reset()
      turbulencePool.list = new List()
    }
    this.emitter.list.reset()
    this.emitter.list = new List()
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
        sprite.texture = this.PIXI.Texture.from(this.getRandomTexture())
      }
      return sprite
    }

    if (this.emitter.animatedSprite) {
      const textures: any[] = this.createFrameAnimationByName(this.getRandomTexture(), 2)
      if (textures.length) {
        const animation: any = new this.PIXI.AnimatedSprite(textures)
        animation.anchor.set(0.5)
        animation.loop = this.emitter.animatedSprite.loop
        animation.play()
        animation.animationSpeed = this.emitter.animatedSprite.frameRate
        return this.particlesContainer.addChild(animation)
      }
    }

    const sprite = new this.PIXI.Sprite(this.PIXI.Texture.from(this.getRandomTexture()))
    sprite.anchor.set(0.5)
    return this.particlesContainer.addChild(sprite)
  }

  private createFrameAnimationByName(
    prefix: any,
    zeroPad: number = 0,
    imageFileExtension: string = 'png',
  ): any[] {
    const textures: any[] = []
    let frame: string = ''
    let indexFrame: number = 0
    let padding: number = 0
    let texture: any | null
    const sheets = []
    const resources = this.PIXI.Loader.shared.resources
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
          if (sheet && sheet.textures[`${prefix}_${frame}.${imageFileExtension}`]) {
            found = true
          }
        }
        if (found) {
          texture = this.PIXI.Texture.from(`${prefix}_${frame}.${imageFileExtension}`)
          textures.push(texture)
          indexFrame += 1
        } else {
          texture = null
          for (const key in resources) {
            if (key === `${prefix}_${frame}.${imageFileExtension}`) {
              texture = this.PIXI.Texture.from(`${prefix}_${frame}.${imageFileExtension}`)
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

  private onPlay() {
    this.currentTime = 0
    this.lastTime = 0
  }

  private onCreate(particle: Particle) {
    const sprite = this.getOrCreateSprite()
    sprite.visible = true
    sprite.alpha = 1
    if (this.blendMode) {
      sprite.blendMode = this.blendMode
    }
    particle.sprite = sprite
  }

  private onCreateTurbulence(particle: Particle) {
    const vortexTexture = this.PIXI.Texture.from('vortex.png')
    if (!vortexTexture) return
    const sprite = new this.PIXI.Sprite(vortexTexture)
    sprite.anchor.set(0.5)
    this.particlesContainer.addChild(sprite)
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
      sprite.texture = this.PIXI.Texture.from(this.finishingTextureNames[particle.finishingTexture])
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
    // this.removeChild(sprite)
    // delete particle.sprite
  }

  private onRemoveTurbulence(particle: Particle) {
    const sprite = particle.sprite
    if (!particle.showVortices && sprite) {
      sprite.visible = false
      sprite.alpha = 0
    }
    this.particlesContainer.removeChild(sprite)
    delete (particle as any).sprite
  }

  private getRandomTexture(): any {
    return this.textures[Math.floor(Math.random() * this.textures.length)]
  }

  private paused(paused: boolean) {
    if (paused === this._paused) return

    if (paused) {
      this.pausedTime = performance.now()
    } else {
      this.pausedTime = 0
      this.lastTime = performance.now() - this.pausedTime
    }
    this._paused = paused
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
    const config = {
      behaviours: [
        {
          enabled: true,
          priority: 10000,
          maxLifeTime: turbulenceConfig.maxLifeTime || 2,
          timeVariance: turbulenceConfig.maxLifeTimeVariance || 0,
          name: 'LifeBehaviour',
        },
        {
          enabled: true,
          priority: 100,
          position: {
            x: turbulenceConfig.position.x || 0,
            y: turbulenceConfig.position.y || 0,
          },
          positionVariance: {
            x: turbulenceConfig.positionVariance.x || 0,
            y: turbulenceConfig.positionVariance.y || 0,
          },
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
    return config
  }
}
