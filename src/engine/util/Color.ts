// tslint:disable:no-bitwise
import math from './math'

export default class Color {
  private _r: number
  private _g: number
  private _b: number
  private _alpha: number

  constructor(r?: number, g?: number, b?: number, alpha?: number) {
    this.r = r || 0
    this.g = g || 0
    this.b = b || 0
    this.alpha = alpha || 1
  }

  get r() {
    return this._r
  }

  set r(value: number) {
    this._r = math.clamp(value, 0, 255)
  }

  get g() {
    return this._g
  }

  set g(value: number) {
    this._g = math.clamp(value, 0, 255)
  }

  get b() {
    return this._b
  }

  set b(value: number) {
    this._b = math.clamp(value, 0, 255)
  }

  get alpha() {
    return this._alpha
  }

  set alpha(value: number) {
    const newValue = value === undefined ? 1 : value
    this._alpha = math.clamp(newValue, 0, 1)
  }

  get hex() {
    let hex = this.r << 16
    hex = hex | (this.g << 8)
    hex = hex | this.b
    return hex
  }

  set hex(value: number) {
    this.r = (value & 0xff0000) >> 16
    this.g = (value & 0xff00) >> 8
    this.b = value & 0xff
  }

  copyFrom = (color: IColor) => {
    this.r = color.r
    this.g = color.g
    this.b = color.b
    this.alpha = color.alpha
  }

  copyFromRawData = (data: { _r: number; _g: number; _b: number; _alpha: number }) => {
    this.r = data._r
    this.g = data._g
    this.b = data._b
    this.alpha = data._alpha
  }

  add = (color: IColor) => {
    this.r += color.r
    this.g += color.g
    this.b += color.b
    this.alpha += color.alpha
  }

  set = (r: number, g: number, b: number, alpha: number) => {
    this.r = r || 0
    this.g = g || 0
    this.b = b || 0
    this.alpha = alpha
  }
}

export interface IColor {
  r: number
  g: number
  b: number
  alpha: number
}
