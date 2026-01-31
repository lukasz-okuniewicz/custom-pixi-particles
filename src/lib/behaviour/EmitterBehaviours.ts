// src/lib/behaviour/EmitterBehaviours.ts
// tslint:disable:prefer-for-of

import type { IBehaviour } from './IBehaviour'
import Particle from '../Particle'
import Model from '../Model'
import TurbulencePool from '../util/turbulencePool'

/**
 * EmitterBehaviours class manages the behaviour of particles.
 * Accepts built-in behaviours and custom behaviours that implement IBehaviour.
 */
export default class EmitterBehaviours {
  behaviours: IBehaviour[] = []

  /**
   * Gets all the enabled behaviours
   *
   * @return {any[]} The enabled behaviours
   */
  getAll = () => {
    return this.behaviours.filter((behaviour: IBehaviour) => {
      return behaviour.enabled
    })
  }

  /**
   * Clears all the stored behaviours
   */
  clear = () => {
    this.behaviours = []
  }

  /**
   * Adds a behaviour (built-in or custom implementing IBehaviour).
   *
   * @param {IBehaviour} behaviour The behaviour to add
   *
   * @return {IBehaviour} The added behaviour
   */
  add = (behaviour: IBehaviour) => {
    if (this.getByName(behaviour.getName()) !== null) {
      throw new Error('Emitter duplicate')
    }

    this.behaviours.push(behaviour)
    this.behaviours.sort((a: IBehaviour, b: IBehaviour) => {
      return b.priority - a.priority
    })

    return behaviour
  }

  /**
   * Checks if there are no behaviours stored
   *
   * @return {boolean} True if there are no behaviours stored, false otherwise
   */
  isEmpty = () => {
    return this.getAll().length === 0
  }

  /**
   * Gets a behaviour by name
   *
   * @param {string} name The name of the behaviour to get
   *
   * @return {any | null} The behaviour with the given name or null if not found
   */
  getByName = (name: string): IBehaviour | null => {
    for (let i = 0; i < this.behaviours.length; ++i) {
      if (this.behaviours[i].getName() === name) {
        return this.behaviours[i]
      }
    }

    return null
  }

  /**
   * Removes a behaviour by name
   *
   * @param {string} name The name of the behaviour to remove
   */
  removeByName = (name: string) => {
    const behaviours: IBehaviour[] = []
    for (let i = 0; i < this.behaviours.length; ++i) {
      if (this.behaviours[i].getName() !== name) {
        behaviours.push(this.behaviours[i])
      }
    }

    this.behaviours = behaviours
  }

  /**
   * Initialises the behaviours
   *
   * @param {Particle} particle The particle
   * @param {Model} model The model
   * @param {Model} turbulencePool The turbulencePool
   */
  init = (particle: Particle, model: Model, turbulencePool: TurbulencePool) => {
    for (let i = 0; i < this.behaviours.length; ++i) {
      this.behaviours[i].init(particle, model, turbulencePool)
    }
  }

  /**
   * Applies the behaviours
   *
   * @param {Particle} particle The particle
   * @param {number} deltaTime The delta time
   * @param {Model} model The model
   */
  apply = (particle: Particle, deltaTime: number, model: Model) => {
    for (let i = 0; i < this.behaviours.length; ++i) {
      model.updateCamera(deltaTime)
      this.behaviours[i].apply(particle, deltaTime, model)
    }
  }

  /**
   * Update once per frame
   *
   * @param {number} deltaTime The delta time
   */
  update = (deltaTime: number) => {
    for (let i = 0; i < this.behaviours.length; ++i) {
      const updateFn = this.behaviours[i].update
      if (updateFn) updateFn.call(this.behaviours[i], deltaTime)
    }
  }

  /**
   * Called when a particle is removed from the emitter.
   * Allows behaviours to clean up any per-particle state.
   * @param {Particle} particle The particle being removed.
   */
  onParticleRemoved = (particle: Particle) => {
    for (let i = 0; i < this.behaviours.length; ++i) {
      const onRemoved = this.behaviours[i].onParticleRemoved
      if (onRemoved) onRemoved.call(this.behaviours[i], particle)
    }
  }
}
