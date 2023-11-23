const DEGREES_MULTIPLIER = Math.PI / 180.0

export default {
  EPSILON: 2.220446049250313e-16,

  /**
   * Converts degrees to radians
   * @param {number} degrees - the number of degrees
   * @returns {number} - the number of radians
   */
  degreesToRadians: (degrees: number) => {
    return degrees * DEGREES_MULTIPLIER
  },
}
