export default class ThereBack {
  x: string
  y: string
  ease: string

  constructor(x?: string, y?: string, ease?: string) {
    this.x = x || ''
    this.y = y || ''
    this.ease = ease || ''
  }

  set = (x: string, y: string, ease: string) => {
    this.x = x || ''
    this.y = y || ''
    this.ease = ease || ''
    return this
  }

  copyFrom = (data: IThereBack) => {
    this.x = data.x || ''
    this.y = data.y || ''
    this.ease = data.ease || ''
    return this
  }

  copyFromRawData = (data: IThereBack) => {
    this.copyFrom(data)
  }
}

export interface IThereBack {
  x: string
  y: string
  ease: string
}
