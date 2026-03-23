/**
 * EmitControllerParser is used to write and read configuration data.
 *
 * @class EmitControllerParser
 */
export default class EmitControllerParser {
  private readonly _controller: any

  /**
   * The constructor of the class.
   *
   * @constructor
   * @param {any} controller The controller object.
   */
  constructor(controller: any) {
    this._controller = controller
  }

  /**
   * Writes the configuration data to a JSON format.
   *
   * @returns {object} The configuration object.
   */
  write = () => {
    const config = JSON.parse(JSON.stringify(this._controller))
    config.name = this._controller.getName()
    return config
  }

  /**
   * Reads the configuration data from a JSON format.
   *
   * Assigns primitives and arrays from JSON onto the controller. Skips plain
   * objects so we do not overwrite methods or nested structures incorrectly.
   * (The previous `!(value instanceof Object)` check was fragile for `undefined`
   * vs prototype fields and could leave `_emitPerSecond` / `_maxParticles` stale.)
   *
   * @param {object} config The configuration object.
   */
  read = (config: any) => {
    for (const key in config) {
      if (key === 'name') {
        continue
      }
      const incoming = config[key]
      if (incoming === undefined) {
        continue
      }
      if (incoming !== null && typeof incoming === 'object' && !Array.isArray(incoming)) {
        continue
      }
      this._controller[key] = incoming
    }
  }
}
