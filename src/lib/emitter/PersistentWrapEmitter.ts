import Model from '../Model'
import { PersistentFillEmission } from '../emission'
import Emitter from './Emitter'

/**
 * Emitter preset: PersistentFillEmission, duration maxTime -1, optional ToroidalWrapBehaviour in config.
 * `stop()` halts updates without recycling particles; call `removeParticles()` on the base Emitter to clear.
 */
export default class PersistentWrapEmitter extends Emitter {
  constructor(model: Model) {
    super(model)
    this.emitController = new PersistentFillEmission()
    this.duration.maxTime = -1
  }

  /**
   * Stops simulation without recycling particles (unlike {@link Emitter.stop}).
   */
  stop() {
    this._play = false
    this.emit(Emitter.STOP)
  }
}
