// tslint:disable:prefer-for-of
import CompatibilityHelper from './CompatibilityHelper'
import * as emissions from '../emission'
import * as behaviours from '../behaviour'
import { Emitter } from '../emitter'
import Model from '../Model'

/**
 * @class EmitterParser
 * @description This class parses an Emitter object
 * @param {Emitter} emitter - the emitter object to be parsed
 */
export default class EmitterParser {
  /**
   * @memberof EmitterParser
   * @property {Emitter} emitter - the emitter object to be parsed
   */
  private readonly emitter: Emitter

  /**
   * @constructor
   * @param {Emitter} emitter - the emitter object to be parsed
   */
  constructor(emitter: any) {
    this.emitter = emitter
  }

  /**
   * @function write
   * @description Writes the emitter configuration to a json object
   * @returns {Object} - the emitter configuration
   */
  write = () => {
    const config: any = { behaviours: [] }
    const emitterBehaviours = this.emitter.behaviours.getAll()

    for (let i = 0; i < emitterBehaviours.length; i++) {
      const behaviourConfig = emitterBehaviours[i].getParser().write()
      config.behaviours.push(behaviourConfig)
    }

    config.emitController = this.emitter.emitController.getParser().write()
    delete config.emitController._frames
    config.duration = this.emitter.duration.maxTime
    if (typeof this.emitter.alpha !== 'undefined') {
      config.alpha = this.emitter.alpha
    }
    if (typeof this.emitter.anchor !== 'undefined') {
      config.anchor = this.emitter.anchor
    }
    if (typeof this.emitter.blendMode !== 'undefined') {
      config.blendMode = this.emitter.blendMode
    }
    if (typeof this.emitter.animatedSprite !== 'undefined') {
      config.animatedSprite = this.emitter.animatedSprite
    }
    return config
  }

  /**
   * @function read
   * @description Reads the emitter configuration from a json object
   * @param {Object} config - the emitter configuration
   * @param {Model} model - the model to be updated
   * @returns {Emitter} - the emitter
   */
  read = (config: any, model: Model) => {
    const behavioursConfig = config.behaviours
    const existingBehaviours = this.emitter.behaviours.getAll()
    const alwaysCreate = this.emitter.behaviours.isEmpty()

    this.emitter.behaviours.clear()
    for (let i = 0; i < behavioursConfig.length; i++) {
      const name = behavioursConfig[i].name
      const behaviour = alwaysCreate ? this.createBehaviour(name) : this.getExistingOrCreate(name, existingBehaviours)
      behaviour.getParser().read(behavioursConfig[i])
      this.emitter.behaviours.add(behaviour)

      if (behaviour.name === 'PositionBehaviour') {
        model.update(behaviour)
      }
    }

    this.emitter.emitController = this.createEmitController(
      config.emitController.name || emissions.EmissionTypes.DEFAULT,
    )
    this.emitter.emitController.getParser().read(config.emitController)
    this.emitter.duration.maxTime = CompatibilityHelper.readDuration(config)
    if (typeof config.alpha !== 'undefined') {
      this.emitter.alpha = config.alpha
    }
    if (typeof config.anchor !== 'undefined') {
      this.emitter.anchor = config.anchor
    }
    if (typeof config.blendMode !== 'undefined') {
      this.emitter.blendMode = config.blendMode
    }
    if (typeof config.animatedSprite !== 'undefined') {
      this.emitter.animatedSprite = config.animatedSprite
    }

    return this.emitter
  }

  /**
   * @function update
   * @description Updates the emitter configuration from a json object
   * @param {Object} config - the emitter configuration
   * @param {Model} model - the model to be updated
   * @param {boolean} resetDuration - should duration be reset
   * @returns {Emitter} - the emitter
   */
  update = (config: any, model: Model, resetDuration: boolean) => {
    const behavioursConfig = config.behaviours
    const existingBehaviours = this.emitter.behaviours.getAll()
    const alwaysCreate = this.emitter.behaviours.isEmpty()

    this.emitter.behaviours.clear()
    for (let i = 0; i < behavioursConfig.length; i++) {
      const name = behavioursConfig[i].name
      const behaviour = alwaysCreate ? this.createBehaviour(name) : this.getExistingOrCreate(name, existingBehaviours)
      behaviour.getParser().read(behavioursConfig[i])
      this.emitter.behaviours.add(behaviour)

      if (behaviour.name === 'PositionBehaviour') {
        model.update(behaviour)
      }
    }

    this.emitter.emitController.getParser().read(config.emitController)
    this.emitter.duration.maxTime = CompatibilityHelper.readDuration(config)
    if (resetDuration) {
      this.emitter.duration.reset()
    }

    if (typeof config.alpha !== 'undefined') {
      this.emitter.alpha = config.alpha
    }
    if (typeof config.anchor !== 'undefined') {
      this.emitter.anchor = config.anchor
    }
    if (typeof config.blendMode !== 'undefined') {
      this.emitter.blendMode = config.blendMode
    }
    if (typeof config.animatedSprite !== 'undefined') {
      this.emitter.animatedSprite = config.animatedSprite
    }

    return this.emitter
  }

  /**
   * Retrieves an existing behaviour or creates a new behaviour
   * @param {string} name - The name of the behaviour to retreive or create
   * @param {any[]} existingBehaviours - An array of existing behaviours
   * @return {any} The existing behaviour or a new behaviour
   */
  getExistingOrCreate = (name: string, existingBehaviours: any) => {
    for (let i = 0; i < existingBehaviours.length; i++) {
      if (existingBehaviours[i].getName() === name) {
        return existingBehaviours[i]
      }
    }

    return this.createBehaviour(name)
  }

  /**
   * Creates a new behaviour
   * @param {string} name - The name of the behaviour to create
   * @return {any} The new behaviour
   */
  createBehaviour = (name: string) => {
    // @ts-ignore
    return new behaviours[name]()
  }

  /**
   * Creates a new behaviour properties
   * @param {string} name - The name of the behaviour to create
   * @return {any} The new behaviour properties
   */
  createBehaviourProps = (name: string) => {
    // @ts-ignore
    return new behaviours[name]().getProps()
  }

  /**
   * Creates a new emission controller
   * @param {string} name - The name of the emission controller to create
   * @return {any} The new emission controller
   */
  createEmitController = (name: string) => {
    // @ts-ignore
    return new emissions[name]()
  }
}
