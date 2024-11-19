const deepClone = (obj: any, hash = new WeakMap()) => {
  if (Object(obj) !== obj || obj instanceof Function) return obj // Primitives or functions
  if (hash.has(obj)) return hash.get(obj) // Circular reference

  let result: any
  try {
    result = new obj.constructor()
  } catch {
    result = Object.create(Object.getPrototypeOf(obj))
  }

  hash.set(obj, result)

  if (obj instanceof Map) {
    obj.forEach((value, key) => {
      result.set(deepClone(key, hash), deepClone(value, hash))
    })
  } else if (obj instanceof Set) {
    obj.forEach((value) => {
      result.add(deepClone(value, hash))
    })
  } else {
    for (const key of Reflect.ownKeys(obj)) {
      // Skip cloning functions
      if (typeof obj[key] === 'function') {
        result[key] = obj[key]
      } else {
        result[key] = deepClone(obj[key], hash)
      }
    }
  }
  return result
}

/**
 * Class used to parse a behaviour object into a JSON config object and vice versa
 */
export default class BehaviourParser {
  private readonly _behaviour: any

  /**
   * Constructs a BehaviourParser object.
   * @param {any} behaviour The behaviour to be parsed.
   */
  constructor(behaviour: any) {
    this._behaviour = behaviour
  }

  /**
   * Writes the behaviour to a config object.
   * @returns {object} The config object.
   */
  write = () => {
    const config = deepClone(this._behaviour.getProps())
    config.name = this._behaviour.getName()
    return config
  }

  /**
   * Reads a config object and sets the behaviour appropriately.
   * @param {object} config The config object to be read.
   */
  read = (config: any) => {
    for (const key in config) {
      if (this._behaviour[key] instanceof Object && typeof this._behaviour[key].copyFromRawData === 'function') {
        this._behaviour[key].copyFromRawData(config[key])
      } else {
        this._behaviour[key] = config[key]
      }
    }
  }
}
