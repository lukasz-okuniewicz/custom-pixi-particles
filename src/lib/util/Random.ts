/**
 * @class Random
 *
 * @description This class provides methods to generate random numbers.
 */
export default class Random {
  /**
   * @static
   * @method get
   * @returns {number} A random number between 0 and 1
   *
   * @description Generates a random number between 0 and 1.
   */
  static get = () => {
    return Random.uniform(0, 1)
  }

  /**
   * Returns a random number between a specified range
   *
   * @param {number} min - The lowest number in the range
   * @param {number} max - The highest number in the range
   *
   * @returns {number} A random number between min and max
   */
  static uniform = (min: number, max: number) => {
    return Math.random() * (max - min) + min
  }
}
