import BehaviourParser from '../parser/BehaviourParser'
import { Random } from '../util'

export default class Behaviour {
  protected priority = 0

  varianceFrom = (value: number) => {
    if (value === 0) return 0
    return Random.uniform(-1.0, 1.0) * value
  }

  getName() {
    throw new Error('This method has to be overridden in subclass')
  }

  getParser = () => {
    return new BehaviourParser(this)
  }
}
