export default class Duration {
  maxTime: number = -1
  private _stop: boolean = false
  private _elapsedTime: number = 0

  /**
   * Checks if the time has elapsed.
   * @returns {boolean} Returns true if the time is elapsed, false otherwise.
   */
  isTimeElapsed = () => {
    return this._stop || (this.maxTime > 0 && this._elapsedTime >= this.maxTime)
  }

  /**
   * Updates the elapsed time.
   * @param {number} deltaTime - The amount of time that has passed since the last update.
   */
  update = (deltaTime: number) => {
    this._elapsedTime += deltaTime
  }

  /**
   * Resets the elapsed time.
   */
  reset = () => {
    this._stop = false
    this._elapsedTime = 0
  }

  /**
   * Stops the elapsed time.
   */
  stop = () => {
    this._stop = true
  }

  /**
   * Starts the elapsed time.
   */
  start = () => {
    this._stop = false
  }
}
