import { Color, Point } from '../util'

export default class BehaviourParser {
  private readonly _behaviour: any

  constructor(behaviour: any) {
    this._behaviour = behaviour
  }

  write = () => {
    const config = JSON.parse(JSON.stringify(this._behaviour))
    config.name = this._behaviour.getName()
    return config
  }

  read = (config: any) => {
    for (const key in config) {
      if (this._behaviour[key] instanceof Object) {
        this._behaviour[key].copyFromRawData(config[key])
      } else {
        this._behaviour[key] = config[key]
      }
    }
  }

  private writePoint = (point: Point) => {
    return { x: point.x, y: point.y }
  }

  private readPoint = (rawData: Point) => {
    const point = new Point()
    if (rawData) {
      point.x = rawData.x || 0
      point.y = rawData.y || 0
    }
    return point
  }

  private writeColor = (color: Color) => {
    return { hex: color.hex, alpha: color.alpha }
  }

  private readColor = (rawData: Color) => {
    const color = new Color()
    if (rawData) {
      color.hex = rawData.hex || 0
      color.alpha = rawData.alpha || 0
    }
    return color
  }
}
