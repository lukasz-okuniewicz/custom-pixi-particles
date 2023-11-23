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
    const config = JSON.parse(JSON.stringify(this._behaviour))
    config.name = this._behaviour.getName()
    return config
  }

  /**
   * Reads a config object and sets the behaviour appropriately.
   * @param {object} config The config object to be read.
   */
  read = (config: any) => {
    for (const key in config) {
      if (this._behaviour[key] instanceof Object) {
        this._behaviour[key].copyFromRawData(config[key])
      } else {
        this._behaviour[key] = config[key]
      }
    }
  }
}
