export default class Duration {
  maxTime: number = -1
  private _elapsedTime: number = 0

  isTimeElapsed = () => {
    return this.maxTime > 0 && this._elapsedTime >= this.maxTime
  }

  update = (deltaTime: number) => {
    this._elapsedTime += deltaTime
  }

  reset = () => {
    this._elapsedTime = 0
  }
}
