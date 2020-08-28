// tslint:disable:prefer-for-of
import CompatibilityHelper from './CompatibilityHelper'
import * as emissions from '../emission'
import * as behaviours from '../behaviour'

export default class EmitterParser {
  private readonly emitter: any

  constructor(emitter: any) {
    this.emitter = emitter
  }

  write = () => {
    const config: any = { behaviours: [] }
    const emitterBehavious = this.emitter.behaviours.getAll()

    for (let i = 0; i < emitterBehavious.length; i++) {
      const behaviourConfig = emitterBehavious[i].getParser().write()
      config.behaviours.push(behaviourConfig)
    }

    config.emitController = this.emitter.emitController.getParser().write()
    config.duration = this.emitter.duration.maxTime
    return config
  }

  read = (config: any) => {
    const behavioursConfig = config.behaviours
    const existingBehaviours = this.emitter.behaviours.getAll()
    const alwaysCreate = this.emitter.behaviours.isEmpty()

    this.emitter.behaviours.clear()
    for (let i = 0; i < behavioursConfig.length; i++) {
      const name = behavioursConfig[i].name
      const behaviour = alwaysCreate ? this.createBehaviour(name) : this.getExistingOrCreate(name, existingBehaviours)
      behaviour.getParser().read(behavioursConfig[i])
      this.emitter.behaviours.add(behaviour)
    }

    this.emitter.emitController = this.createEmitController(
      config.emitController.name || emissions.EmissionTypes.DEFAULT,
    )
    this.emitter.emitController.getParser().read(config.emitController)
    this.emitter.duration.maxTime = CompatibilityHelper.readDuration(config)

    return this.emitter
  }

  getExistingOrCreate = (name: string, existingBehaviours: any) => {
    for (let i = 0; i < existingBehaviours.length; i++) {
      if (existingBehaviours[i].getName() === name) {
        return existingBehaviours[i]
      }
    }

    return this.createBehaviour(name)
  }

  createBehaviour = (name: string) => {
    // @ts-ignore
    return new behaviours[name]()
  }

  createEmitController = (name: string) => {
    // @ts-ignore
    return new emissions[name]()
  }
}
