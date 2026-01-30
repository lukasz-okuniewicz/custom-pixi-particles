import EmitControllerParser from '../parser/EmitControllerParser'

/**
 * Abstract class representing a particle emitter.
 * @abstract
 */
export default class AbstractEmission {
  /**
   * Calculate number of particles emitted after given time deltas
   * @param {number} deltaTime - number of seconds passed
   * @param {number} particlesCount - current number of particles
   * @return {number} - the number of particles emitted
   * @abstract
   */
  howMany(deltaTime: number, particlesCount: number) {
    throw new Error('Abstract method')
  }

  /**
   * Reset the emission
   */
  reset() {
    //
  }

  /**
   * Get the name of the emission
   * @return {string} - the name of the emission
   * @throws {Error} - when the method is not overridden in subclass
   */
  getName() {
    throw new Error('This method has to be overridden in subclass')
  }

  /**
   * Get the parser for the emitter
   * @return {EmitControllerParser} - parser for the emitter
   */
  getParser() {
    return new EmitControllerParser(this)
  }
}
