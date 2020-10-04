// tslint:disable:prefer-for-of
import engine from '../index'
import { Emitter } from '../emitter'
import turbulencePool from '../util/turbulencePool'
import Particle from '../Particle'
import BehaviourNames from '../behaviour/BehaviourNames'

export default class Renderer extends PIXI.ParticleContainer {
  blendMode: any
  emitter: Emitter
  turbulenceEmitter: Emitter
  onComplete: any = () => {}
  private _paused: boolean = false
  private currentTime: number = 0
  private lastTime: number = 0
  private textures: string[]
  private finishingTextureNames: string[]
  private pausedTime: number = 0
  private unusedSprites: any[] = []
  private animatedSprite: boolean = false

  constructor(textures: string[], config: any, animatedSprite: boolean = false, finishingTextureNames: string[]) {
    super(100000, {
      vertices: true,
      position: true,
      rotation: true,
      uvs: (!!(animatedSprite || (finishingTextureNames && finishingTextureNames.length))),
      tint: true,
    })
    this.animatedSprite = animatedSprite
    this.textures = textures
    this.finishingTextureNames = finishingTextureNames

    const turbulenceConfigIndex = this.getConfigIndexByName(BehaviourNames.TURBULENCE_BEHAVIOUR, config)
    if (turbulenceConfigIndex !== -1) {
      const turbulenceConfig = config.behaviours[turbulenceConfigIndex]
      if (turbulenceConfig.enabled === true) {
        this.turbulenceEmitter = new engine.Emitter()
        this.turbulenceEmitter.getParser().read(this.buildTurbulenceConfig(turbulenceConfig))
        this.turbulenceEmitter.on(Emitter.CREATE, this.onCreateTurbulence, this)
        this.turbulenceEmitter.on(Emitter.UPDATE, this.onUpdateTurbulence, this)
        this.turbulenceEmitter.on(Emitter.REMOVE, this.onRemoveTurbulence, this)
      }
    }

    this.emitter = new engine.Emitter()
    this.emitter.getParser().read(config)
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

    PIXI.ParticleContainer.prototype.updateTransform.call(this)

    this.lastTime = this.currentTime
  }

  updateTexture() {
    for (let i = 0; i < this.unusedSprites.length; ++i) {
      this.unusedSprites[i].texture = PIXI.Texture.from(this.getRandomTexture())
    }

    for (let i = 0; i < this.children.length; ++i) {
      // @ts-ignore
      this.children[i].texture = PIXI.Texture.from(this.getRandomTexture())
    }
  }

  playEmitter() {
    this.emitter.play()
    if (this.turbulenceEmitter) {
      this.turbulenceEmitter.play()
    }
  }

  stopEmitter() {
    this.emitter.stop()
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

  setTextures(textures: string[]) {
    this.textures = textures
    this.updateTexture()
  }

  updateConfig(config: any) {
    this.emitter.getParser().update(config)
    if (this.turbulenceEmitter) {
      const turbulenceConfigIndex = this.getConfigIndexByName(BehaviourNames.TURBULENCE_BEHAVIOUR, config)
      if (turbulenceConfigIndex !== -1) {
        const turbulenceConfig = config.behaviours[turbulenceConfigIndex]
        if (turbulenceConfig.enabled === true) {
          this.turbulenceEmitter.getParser().update(this.buildTurbulenceConfig(turbulenceConfig))
        }
      }
    }
  }

  private getOrCreateSprite() {
    if (this.unusedSprites.length > 0) {
      const sprite = this.unusedSprites.pop()
      if (this.finishingTextureNames && this.finishingTextureNames.length) {
        sprite.texture = PIXI.Texture.from(this.getRandomTexture())
      }
      return sprite
    }

    if (this.animatedSprite) {
      const textures: PIXI.Texture[] = this.createFrameAnimationByName(this.textures[0], 2)
      if (textures.length) {
        const animation: PIXI.AnimatedSprite = new PIXI.AnimatedSprite(textures)
        animation.anchor.set(0.5)
        animation.loop = true
        animation.play()
        animation.animationSpeed = 15 / 60
        return this.addChild(animation)
      }
    }

    const sprite = new PIXI.Sprite(PIXI.Texture.from(this.getRandomTexture()))
    sprite.anchor.set(0.5)
    return this.addChild(sprite)
  }

  private createFrameAnimationByName(
    prefix: string,
    zeroPad: number = 0,
    imageFileExtension: string = 'png',
  ): PIXI.Texture[] {
    const textures: PIXI.Texture[] = []
    let frame: string = ''
    let indexFrame: number = 0
    let padding: number = 0
    let texture: PIXI.Texture | null
    const sheets = []
    const resources = PIXI.Loader.shared.resources
    for (const key in resources) {
      if (resources[key].extension === 'json') {
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
          texture = PIXI.Texture.from(`${prefix}_${frame}.${imageFileExtension}`)
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
    const sprite = new PIXI.Sprite(PIXI.Texture.from('vortex.png'))
    sprite.anchor.set(0.5)
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
      sprite.texture = PIXI.Texture.from(this.finishingTextureNames[particle.finishingTexture])
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
    this.removeChild(sprite)
    delete particle.sprite
  }

  private getRandomTexture(): string {
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
