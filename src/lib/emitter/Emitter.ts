import Duration from './Duration'
import { EmitterBehaviours } from '../behaviour'
import eventemitter3 from 'eventemitter3'
import ParticlePool from '../ParticlePool'
import { EmitterParser } from '../parser'
import List from '../util/List'
import * as emission from '../emission'
import Particle from '../Particle'
import { AnimatedSprite, BLEND_MODES } from 'pixi.js-legacy'
import Model from '../Model'
import TurbulencePool from '../util/turbulencePool'

export default class Emitter extends eventemitter3 {
  static STOP = 'emitter/stop'
  static RESET = 'emitter/reset'
  static CREATE = 'emitter/create'
  static UPDATE = 'emitter/update'
  static REMOVE = 'emitter/remove'
  static FINISHING = 'emitter/finishing'
  static COMPLETE = 'emitter/complete'
  list: List = new List()
  duration: Duration = new Duration()
  animatedSprite: { loop: boolean; frameRate: number; randomFrameStart: number }
  alpha: number = 1
  anchor: { x: number; y: number } = { x: 0.5, y: 0.5 }
  blendMode: BLEND_MODES = BLEND_MODES.NORMAL
  behaviours: EmitterBehaviours = new EmitterBehaviours()
  emitController: any
  turbulencePool: TurbulencePool = new TurbulencePool()
  private _play: boolean
  private _model: Model

  constructor(model: Model) {
    super()
    this._model = model

    // @ts-ignore
    this.emitController = new emission[emission.EmissionTypes.DEFAULT]()
  }

  /**
   * Updates the emitter, emits particles and updates the particles.
   * Triggers the COMPLETE event when the duration is elapsed and the list is empty.
   * @param {number} deltaTime - Time elapsed since the last update
   */
  async update(deltaTime: number) {
    if (!this._play) return

    this.behaviours.update(deltaTime)
    this.emitParticles(deltaTime)
    this.updateParticles(deltaTime)
    this.duration.update(deltaTime)

    if (this.duration.isTimeElapsed() && this.list.isEmpty()) {
      this.stop()
      setTimeout(() => {
        this.emit(Emitter.COMPLETE)
      })
    }
  }

  /**
   * Emits particles if the duration is not elapsed.
   * @param {number} deltaTime - Time elapsed since the last update
   */
  emitParticles(deltaTime: number) {
    if (!this.duration.isTimeElapsed()) {
      this.createParticles(deltaTime)
    }
  }

  /**
   * Creates the particles to be emitted.
   * Triggers the CREATE event when a particle is created.
   * @param {number} deltaTime - Time elapsed since the last update
   */
  createParticles(deltaTime: number) {
    const particlesToEmit = this.emitController.howMany(deltaTime, this.list.length)
    for (let i = 0; i < particlesToEmit; ++i) {
      const particle: Particle = this.list.add(ParticlePool.global.pop())
      this.behaviours.init(particle, this._model, this.turbulencePool)
      this.emit(Emitter.CREATE, particle)
    }
  }

  /**
   * Updates the list of particles
   * @param {number} deltaTime - The amount of time that has passed since the last update
   */
  updateParticles(deltaTime: number) {
    this.list.forEach((particle: Particle) => {
      this.updateParticle(particle, deltaTime)
    })
  }

  /**
   * Updates a single particle
   * @param {Particle} particle - The particle to update
   * @param {number} deltaTime - The amount of time that has passed since the last update
   */
  updateParticle(particle: Particle, deltaTime: number) {
    if (particle.isDead()) {
      this.removeParticle(particle)
    } else if (particle.isAlmostDead()) {
      this.behaviours.apply(particle, deltaTime, this._model)
      this.emit(Emitter.FINISHING, particle)
      this.emit(Emitter.UPDATE, particle)
    } else {
      this.behaviours.apply(particle, deltaTime, this._model)
      this.emit(Emitter.UPDATE, particle)
    }
  }

  /**
   * Removes a particle from the list and reset it
   * @param {Particle} particle - The particle to remove
   */
  removeParticle(particle: Particle) {
    this.emit(Emitter.REMOVE, particle)
    this.list.remove(particle)
    particle.reset()
    ParticlePool.global.push(particle)
    this.turbulencePool.list.remove(particle)
  }

  /**
   * Gets a parser to parse the emitter and it's particles
   * @returns {EmitterParser} - The parser for this emitter
   */
  getParser() {
    return new EmitterParser(this)
  }

  /**
   * Creates props for a behaviour
   * @param {string} name - The name of the behaviour
   * @returns {Object} - The props for the behaviour
   */
  createBehaviourProps(name: string) {
    return this.getParser().createBehaviourProps(name)
  }

  /**
   * Starts the emitter playing
   */
  play() {
    this.duration.start()
    this._play = true
  }

  /**
   * Resets the emitter and starts playing
   */
  resetAndPlay() {
    this.reset()
    this.play()
  }

  /**
   * Resets the emitter without removing the particles and starts playing
   */
  resetWithoutRemovingAndPlay() {
    this.resetWithoutRemoving()
    this.play()
  }

  /**
   * Resets the emitter and removes all the particles
   */
  reset() {
    this.emitController.reset()
    this.duration.reset()
    this.removeParticles()
    this.emit(Emitter.RESET)
  }

  /**
   * Resets the emitter without removing the particles
   */
  resetWithoutRemoving() {
    this.emitController.reset()
    this.duration.reset()
    this.emit(Emitter.RESET)
  }

  /**
   * Stops the emitter and removes all the particles
   */
  stop() {
    this._play = false
    this.removeParticles()
    this.emit(Emitter.STOP)
  }

  /**
   * Stops the emitter without killing the particles
   */
  stopWithoutKilling() {
    this.duration.stop()
  }

  /**
   * Removes all the particles from the list
   */
  removeParticles() {
    this.list.forEach((particle: Particle) => {
      this.removeParticle(particle)
    })
    this.turbulencePool.list.forEach((particle: Particle) => {
      this.removeParticle(particle)
    })
  }

  pause() {
    this.list.forEach((particle: Particle) => {
      if (particle.sprite instanceof AnimatedSprite) {
        particle.sprite.stop()
      }
    })
  }

  resume() {
    this.list.forEach((particle: Particle) => {
      if (particle.sprite instanceof AnimatedSprite) {
        particle.sprite.play()
      }
    })
  }

  destroy() {
    this.list.reset()
    // @ts-ignore
    this.list = undefined
    this.turbulencePool.list.reset()
    // @ts-ignore
    this.turbulencePool.list = undefined
    // @ts-ignore
    this.turbulencePool = undefined
    // @ts-ignore
    this.duration = undefined
    // @ts-ignore
    this.animatedSprite = undefined
    this.behaviours?.clear()
    // @ts-ignore
    this.behaviours = undefined
    if (this.emitController && this.emitController.reset) {
      this.emitController.reset()
    }
    this.emitController = undefined
    // @ts-ignore
    this._model = undefined
  }
}
