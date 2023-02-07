const DEGREES_MULTIPLIER = Math.PI / 180.0
const RADIANS_MULTIPLIER = 180 / Math.PI

export default {
  EPSILON: 2.220446049250313e-16,

  /**
   * Clamps a value between a minimum and maximum value
   * @param {number} value - the value to be clamped
   * @param {number} min - the minimum value
   * @param {number} max - the maximum value
   * @returns {number} - the clamped value
   */
  clamp: (value: number, min: number, max: number) => {
    return Math.max(min, Math.min(value, max))
  },

  /**
   * Converts degrees to radians
   * @param {number} degrees - the number of degrees
   * @returns {number} - the number of radians
   */
  degreesToRadians: (degrees: number) => {
    return degrees * DEGREES_MULTIPLIER
  },

  /**
   * Converts radians to degrees
   * @param {number} radians - the number of radians
   * @returns {number} - the number of degrees
   */
  radiansToDegrees: (radians: number) => {
    return radians * RADIANS_MULTIPLIER
  },
}
