import { EmitControllerParser } from '../parser'

export default class AbstractEmission {
  howMany(deltaTime: number, particlesCount: number) {
    throw new Error('Abstract method')
  }

  reset() {
    //
  }

  getName() {
    throw new Error('This method has to be overridden in subclass')
  }

  getParser() {
    return new EmitControllerParser(this)
  }
}
