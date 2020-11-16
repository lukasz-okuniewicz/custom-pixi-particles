export default class Duration {
  maxTime: number = -1
  private _stop: boolean = false
  private _elapsedTime: number = 0

  isTimeElapsed = () => {
    return this._stop || (this.maxTime > 0 && this._elapsedTime >= this.maxTime)
  }

  update = (deltaTime: number) => {
    this._elapsedTime += deltaTime
  }

  reset = () => {
    this._elapsedTime = 0
    this._stop = false
  }

  stop = () => {
    this._stop = true
  }

  start = () => {
    this._stop = false
  }
}
