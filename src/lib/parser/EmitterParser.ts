// tslint:disable:prefer-for-of
import CompatibilityHelper from './CompatibilityHelper'
import * as emissions from '../emission'
import * as behaviours from '../behaviour'
import { BehaviourRegistry } from '../behaviour/BehaviourRegistry'
import PlaceholderBehaviour from '../behaviour/PlaceholderBehaviour'
import BehaviourNames from '../behaviour/BehaviourNames'
import { EmissionRegistry } from '../emission/EmissionRegistry'
import type Emitter from '../emitter/Emitter'
import Model from '../Model'
import { resolveBlendMode } from '../util/resolveBlendMode'

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
    if (typeof this.emitter.textureVariants !== 'undefined') {
      config.textureVariants = this.emitter.textureVariants
    }
    if (typeof this.emitter.variantWeights !== 'undefined') {
      config.variantWeights = this.emitter.variantWeights
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
    const behavioursConfig = this.sanitizeBehaviours(config.behaviours)
    const existingBehaviours = this.emitter.behaviours.getAll()
    const alwaysCreate = this.emitter.behaviours.isEmpty()

    this.emitter.behaviours.clear()
    for (let i = 0; i < behavioursConfig.length; i++) {
      const name = behavioursConfig[i].name
      const behaviour = alwaysCreate ? this.createBehaviour(name) : this.getExistingOrCreate(name, existingBehaviours)
      behaviour.getParser().read(behavioursConfig[i])
      this.emitter.behaviours.add(behaviour)

    }

    this.wireBoidsParticleList()

    this.emitter.emitController = this.createEmitController(
      config.emitController.name || emissions.EmissionTypes.DEFAULT,
    )
    this.emitter.emitController.getParser().read(config.emitController)
    if (this.emitter.emitController.validate) {
      this.emitter.emitController.validate()
    }
    this.emitter.duration.maxTime = CompatibilityHelper.readDuration(config)
    if (typeof config.alpha !== 'undefined') {
      this.emitter.alpha = config.alpha
    }
    if (typeof config.anchor !== 'undefined') {
      this.emitter.anchor = config.anchor
    }
    if (typeof config.blendMode !== 'undefined') {
      this.emitter.blendMode = resolveBlendMode(config.blendMode)
    }
    if (typeof config.animatedSprite !== 'undefined') {
      this.emitter.animatedSprite = config.animatedSprite
    }
    if (typeof config.textureVariants !== 'undefined') {
      this.emitter.textureVariants = config.textureVariants
    } else {
      this.emitter.textureVariants = undefined
    }
    if (typeof config.variantWeights !== 'undefined') {
      this.emitter.variantWeights = config.variantWeights
    } else {
      this.emitter.variantWeights = undefined
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
    const behavioursConfig = this.sanitizeBehaviours(config.behaviours)
    const existingBehaviours = this.emitter.behaviours.getAll()
    const alwaysCreate = this.emitter.behaviours.isEmpty()

    this.emitter.behaviours.clear()
    for (let i = 0; i < behavioursConfig.length; i++) {
      const name = behavioursConfig[i].name
      const behaviour = alwaysCreate ? this.createBehaviour(name) : this.getExistingOrCreate(name, existingBehaviours)
      behaviour.getParser().read(behavioursConfig[i])
      this.emitter.behaviours.add(behaviour)

    }

    this.wireBoidsParticleList()

    const requestedName = (config.emitController && config.emitController.name) || emissions.EmissionTypes.DEFAULT
    const currentName = this.emitter.emitController.getName()
    if (requestedName !== currentName) {
      this.emitter.emitController = this.createEmitController(requestedName)
    }

    this.emitter.emitController.getParser().read(config.emitController)
    if (this.emitter.emitController.validate) {
      this.emitter.emitController.validate()
    }
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
      this.emitter.blendMode = resolveBlendMode(config.blendMode)
    }
    if (typeof config.animatedSprite !== 'undefined') {
      this.emitter.animatedSprite = config.animatedSprite
    }
    if (typeof config.textureVariants !== 'undefined') {
      this.emitter.textureVariants = config.textureVariants
    } else {
      this.emitter.textureVariants = undefined
    }
    if (typeof config.variantWeights !== 'undefined') {
      this.emitter.variantWeights = config.variantWeights
    } else {
      this.emitter.variantWeights = undefined
    }

    return this.emitter
  }

  private sanitizeBehaviours = (behavioursConfig: any) => {
    if (!Array.isArray(behavioursConfig)) return []
    const migrated = this.migrateLegacyPointToPoint(behavioursConfig)
    const seen = new Set<string>()
    const out: any[] = []
    for (let i = 0; i < migrated.length; i++) {
      const entry = migrated[i]
      const name = entry && entry.name
      if (!name || seen.has(name)) continue
      seen.add(name)
      out.push(entry)
    }
    return out
  }

  private migrateLegacyPointToPoint = (behavioursConfig: any[]) => {
    const migrated = behavioursConfig.map((entry) => (entry && typeof entry === 'object' ? { ...entry } : entry))
    const hasPointToPoint = migrated.some((entry: any) => entry?.name === BehaviourNames.POINT_TO_POINT_BEHAVIOUR)
    let shouldInjectPointToPoint = false
    let extractedConfig: any = null

    for (let i = 0; i < migrated.length; i++) {
      const entry = migrated[i]
      if (!entry || entry.name !== BehaviourNames.POSITION_BEHAVIOUR) continue

      const hasLegacyPointToPointConfig =
        entry.fromAtoB === true ||
        typeof entry.fromAtoBTwoWays !== 'undefined' ||
        typeof entry.pointA !== 'undefined' ||
        typeof entry.pointB !== 'undefined' ||
        typeof entry.thereDuration !== 'undefined' ||
        typeof entry.thereAmplitude !== 'undefined' ||
        typeof entry.backDuration !== 'undefined' ||
        typeof entry.backAmplitude !== 'undefined' ||
        typeof entry.there !== 'undefined' ||
        typeof entry.back !== 'undefined'

      if (hasLegacyPointToPointConfig && !hasPointToPoint) {
        shouldInjectPointToPoint = true
        extractedConfig = {
          name: BehaviourNames.POINT_TO_POINT_BEHAVIOUR,
          enabled: true,
          fromAtoBTwoWays: entry.fromAtoBTwoWays ?? false,
          pointA: entry.pointA ?? { x: -300, y: 0 },
          pointB: entry.pointB ?? { x: 300, y: 0 },
          thereDuration: entry.thereDuration ?? { min: 7, max: 7 },
          thereAmplitude: entry.thereAmplitude ?? { min: 220, max: 330 },
          backDuration: entry.backDuration ?? { min: 7, max: 7 },
          backAmplitude: entry.backAmplitude ?? { min: -220, max: -320 },
          there: entry.there ?? { x: 'Sin', y: 'Tan', ease: 'power1.inOut' },
          back: entry.back ?? { x: 'Sin', y: 'Tan', ease: 'power1.inOut' },
        }
      }

      delete entry.fromAtoB
      delete entry.fromAtoBTwoWays
      delete entry.pointA
      delete entry.pointB
      delete entry.thereDuration
      delete entry.thereAmplitude
      delete entry.backDuration
      delete entry.backAmplitude
      delete entry.there
      delete entry.back
    }

    if (shouldInjectPointToPoint && extractedConfig) {
      migrated.push(extractedConfig)
    }

    return migrated
  }

  /**
   * Wires neighbour-based behaviours to use this emitter's particle list.
   */
  private wireBoidsParticleList = () => {
    const boids = this.emitter.behaviours.getByName(BehaviourNames.BOIDS_FLOCKING_BEHAVIOUR) as any
    if (boids && typeof boids.particleListGetter !== 'undefined') {
      boids.particleListGetter = () => this.emitter.list
    }
    const phaseCoherence = this.emitter.behaviours.getByName(BehaviourNames.PHASE_COHERENCE_BEHAVIOUR) as any
    if (phaseCoherence && typeof phaseCoherence.particleListGetter !== 'undefined') {
      phaseCoherence.particleListGetter = () => this.emitter.list
    }
    const curvatureFlow = this.emitter.behaviours.getByName(BehaviourNames.CURVATURE_FLOW_BEHAVIOUR) as any
    if (curvatureFlow && typeof curvatureFlow.particleListGetter !== 'undefined') {
      curvatureFlow.particleListGetter = () => this.emitter.list
    }
    const rvo = this.emitter.behaviours.getByName(BehaviourNames.RVO_AVOIDANCE_BEHAVIOUR) as any
    if (rvo && typeof rvo.particleListGetter !== 'undefined') {
      rvo.particleListGetter = () => this.emitter.list
    }
    const flocking = this.emitter.behaviours.getByName(BehaviourNames.FLOCKING_BEHAVIOUR) as any
    if (flocking && typeof flocking.particleListGetter !== 'undefined') {
      flocking.particleListGetter = () => this.emitter.list
    }
    const predatorPrey = this.emitter.behaviours.getByName(BehaviourNames.PREDATOR_PREY_BEHAVIOUR) as any
    if (predatorPrey && typeof predatorPrey.particleListGetter !== 'undefined') {
      predatorPrey.particleListGetter = () => this.emitter.list
    }
    const formPattern = this.emitter.behaviours.getByName(BehaviourNames.FORM_PATTERN_BEHAVIOUR) as any
    // Always wire: optional getter was never set, so the old undefined-check skipped assignment.
    if (formPattern) {
      formPattern.particleListGetter = () => this.emitter.list
      formPattern.positionBehaviourGetter = () =>
        this.emitter.behaviours.getByName(BehaviourNames.POSITION_BEHAVIOUR)
      formPattern.emitterWorldPositionGetter = () => {
        const wp = this.emitter.worldPosition
        return wp && typeof wp.x === 'number' && typeof wp.y === 'number' ? wp : null
      }
    }
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
   * Creates a new behaviour by name. Uses BehaviourRegistry first (custom behaviours),
   * then falls back to built-in behaviours.
   * @param {string} name - The name of the behaviour to create
   * @return {any} The new behaviour
   */
  createBehaviour = (name: string) => {
    const CustomBehaviour = BehaviourRegistry.get(name)
    if (CustomBehaviour) {
      return new CustomBehaviour()
    }
    const BuiltIn = (behaviours as any)[name]
    if (BuiltIn && typeof BuiltIn === 'function') {
      return new BuiltIn()
    }
    return new PlaceholderBehaviour(name)
  }

  /**
   * Creates a new behaviour properties (for config schema / editor).
   * Uses BehaviourRegistry first for custom behaviours.
   * @param {string} name - The name of the behaviour to create
   * @return {any} The new behaviour properties
   */
  createBehaviourProps = (name: string) => {
    const CustomBehaviour = BehaviourRegistry.get(name)
    if (CustomBehaviour) {
      return new CustomBehaviour().getProps()
    }
    const BuiltIn = (behaviours as any)[name]
    if (BuiltIn && typeof BuiltIn === 'function') {
      return new BuiltIn().getProps()
    }
    return new PlaceholderBehaviour(name).getProps()
  }

  /**
   * Creates a new emission controller
   * @param {string} name - The name of the emission controller to create
   * @return {any} The new emission controller
   */
  createEmitController = (name: string) => {
    const CustomEmission = EmissionRegistry.get(name)
    if (CustomEmission) {
      return new CustomEmission()
    }

    const BuiltIn = (emissions as any)[name]
    if (BuiltIn && typeof BuiltIn === 'function') {
      return new BuiltIn()
    }

    const DefaultEmission = (emissions as any)[emissions.EmissionTypes.DEFAULT]
    if (DefaultEmission && typeof DefaultEmission === 'function') {
      return new DefaultEmission()
    }

    throw new Error(`Unable to create emit controller: ${name}`)
  }
}
