import { Color, Point } from '../util'

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

  /**
   * Writes a Point object to a config object.
   * @param {Point} point The Point object to be written.
   * @returns {object} The config object.
   */
  private writePoint = (point: Point) => {
    return { x: point.x, y: point.y }
  }

  /**
   * Reads a Point config object and sets the Point appropriately.
   * @param {object} rawData The config object to be read.
   * @returns {Point} The Point object.
   */
  private readPoint = (rawData: Point) => {
    const point = new Point()
    if (rawData) {
      point.x = rawData.x || 0
      point.y = rawData.y || 0
    }
    return point
  }

  /**
   * Writes a Color object to a config object.
   * @param {Color} color The Color object to be written.
   * @returns {object} The config object.
   */
  private writeColor = (color: Color) => {
    return { hex: color.hex, alpha: color.alpha }
  }

  /**
   * Reads a Color config object and sets the Color appropriately.
   * @param {object} rawData The config object to be read.
   * @returns {Color} The Color object.
   */
  private readColor = (rawData: Color) => {
    const color = new Color()
    if (rawData) {
      color.hex = rawData.hex || 0
      color.alpha = rawData.alpha || 0
    }
    return color
  }
}
