// tslint:disable:prefer-for-of

import Particle from '../Particle'
import Model from "../Model";

export default class EmitterBehaviours {
  behaviours: any = []

  getAll = () => {
    return this.behaviours.filter((behaviour: any) => {
      return behaviour.enabled
    })
  }

  isEmpty = () => {
    return this.getAll().length === 0
  }

  clear = () => {
    this.behaviours = []
  }

  add = (behaviour: any) => {
    if (this.getByName(behaviour.getName()) !== null) {
      throw new Error('Emitter duplicate')
    }

    this.behaviours.push(behaviour)
    this.behaviours.sort((a: any, b: any) => {
      return b.priority - a.priority
    })

    return behaviour
  }

  getByName = (name: string) => {
    for (let i = 0; i < this.behaviours.length; ++i) {
      if (this.behaviours[i].getName() === name) {
        return this.behaviours[i]
      }
    }

    return null
  }

  removeByName = (name: string) => {
    const behaviours = []
    for (let i = 0; i < this.behaviours.length; ++i) {
      if (this.behaviours[i].getName() !== name) {
        behaviours.push(this.behaviours[i])
      }
    }

    this.behaviours = behaviours
  }

  init = (particle: Particle, model: Model) => {
    for (let i = 0; i < this.behaviours.length; ++i) {
      this.behaviours[i].init(particle, model)
    }
  }

  apply = (particle: Particle, deltaTime: number, model: Model) => {
    for (let i = 0; i < this.behaviours.length; ++i) {
      model.updateCamera(deltaTime);
      this.behaviours[i].apply(particle, deltaTime, model)
    }
  }
}
