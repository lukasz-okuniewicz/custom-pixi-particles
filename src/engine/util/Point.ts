export default class Point {
  x: number
  y: number

  constructor(x?: number, y?: number) {
    this.x = x || 0
    this.y = y || 0
  }

  set = (x: number, y: number) => {
    this.x = x
    this.y = y === undefined ? this.y : y
    return this
  }

  copyFrom = (point: IPoint) => {
    this.x = point.x
    this.y = point.y
    return this
  }

  copyFromRawData = (data: IPoint) => {
    this.copyFrom(data)
  }

  add = (point: IPoint) => {
    this.x += point.x
    this.y += point.y
    return this
  }
}

export interface IPoint {
  x: number
  y: number
}
