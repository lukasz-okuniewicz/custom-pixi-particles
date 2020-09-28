import Duration from './Duration'
import { EmitterBehaviours } from '../behaviour'
import eventemitter3 = require('eventemitter3')
import ParticlePool from '../ParticlePool'
import { EmitterParser } from '../parser'
import List from '../util/List'
import * as emission from '../emission'
import Particle from '../Particle'
import turbulencePool from '../util/turbulencePool'

export default class Emitter extends eventemitter3 {
  static PLAY = 'emitter/play'
  static STOP = 'emitter/stop'
  static RESET = 'emitter/reset'
  static CREATE = 'emitter/create'
  static UPDATE = 'emitter/update'
  static REMOVE = 'emitter/remove'
  static COMPLETE = 'emitter/complete'
  list: List = new List()
  duration: Duration = new Duration()
  behaviours: EmitterBehaviours = new EmitterBehaviours()
  emitController: any
  private _play: boolean

  constructor() {
    super()

    // @ts-ignore
    this.emitController = new emission[emission.EmissionTypes.DEFAULT]()

    this.play()
  }

  async update(deltaTime: number) {
    if (!this._play) return

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

  emitParticles(deltaTime: number) {
    if (!this.duration.isTimeElapsed()) {
      this.createParticles(deltaTime)
    }
  }

  createParticles(deltaTime: number) {
    const particlesToEmit = this.emitController.howMany(deltaTime, this.list.length)
    for (let i = 0; i < particlesToEmit; ++i) {
      const particle: Particle = this.list.add(ParticlePool.global.pop())
      this.behaviours.init(particle)
      this.emit(Emitter.CREATE, particle)
    }
  }

  updateParticles(deltaTime: number) {
    this.list.forEach((particle: Particle) => {
      this.updateParticle(particle, deltaTime)
    })
  }

  updateParticle(particle: Particle, deltaTime: number) {
    if (particle.isDead()) {
      this.removeParticle(particle)
    } else {
      this.behaviours.apply(particle, deltaTime)
      this.emit(Emitter.UPDATE, particle)
    }
  }

  removeParticle(particle: Particle) {
    this.emit(Emitter.REMOVE, particle)
    this.list.remove(particle)
    particle.reset()
    ParticlePool.global.push(particle)
    turbulencePool.list.remove(particle)
  }

  getParser() {
    return new EmitterParser(this)
  }

  createBehaviourProps(name: string) {
    return this.getParser().createBehaviourProps(name)
  }

  play() {
    this._play = true
    this.emit(Emitter.PLAY)
  }

  resetAndPlay() {
    this.reset()
    this.play()
  }

  reset() {
    this.emitController.reset()
    this.duration.reset()
    this.removeParticles()
    this.emit(Emitter.RESET)
  }

  stop() {
    this._play = false
    this.removeParticles()
    this.emit(Emitter.STOP)
  }

  removeParticles() {
    this.list.forEach((particle: Particle) => {
      this.removeParticle(particle)
    })
    turbulencePool.list.forEach((particle: Particle) => {
      this.removeParticle(particle)
    })
  }
}
