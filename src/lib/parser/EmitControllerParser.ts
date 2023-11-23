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
   * @param {object} config The configuration object.
   */
  read = (config: any) => {
    for (const key in config) {
      if (!(this._controller[key] instanceof Object)) {
        this._controller[key] = config[key]
      }
    }
  }
}
