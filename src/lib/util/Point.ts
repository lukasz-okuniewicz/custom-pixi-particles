export default class Point {
  x: number
  y: number

  constructor(x?: number, y?: number) {
    this.x = x || 0
    this.y = y || 0
  }

  /**
   * Sets the x and y coordinates of a Point
   * @param {number} x - The x coordinate
   * @param {number} y - The y coordinate
   * @return {Point} - The Point instance
   */
  set = (x: number, y: number) => {
    this.x = x
    this.y = y === undefined ? this.y : y
    return this
  }

  /**
   * Copies the x and y coordinates from another Point
   * @param {IPoint} point - The Point instance to copy from
   * @return {Point} - The Point instance
   */
  copyFrom = (point: IPoint) => {
    this.x = point.x
    this.y = point.y
    return this
  }

  /**
   * Copies the x and y coordinates from an object with numeric x and y properties
   * @param {IPoint} data - The object to copy from
   * @return {Point} - The Point instance
   */
  copyFromRawData = (data: IPoint) => {
    this.copyFrom(data)
  }

  /**
   * Adds the x and y coordinates of another Point to this Point
   * @param {IPoint} point - The other Point instance
   * @return {Point} - The Point instance
   */
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
