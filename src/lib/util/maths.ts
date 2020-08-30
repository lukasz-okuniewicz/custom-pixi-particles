const DEGREES_MULTIPLIER = Math.PI / 180.0
const RADIANS_MULTIPLIER = 180 / Math.PI

export default {
  EPSILON: 2.220446049250313e-16,

  clamp: (value: number, min: number, max: number) => {
    return Math.max(min, Math.min(value, max))
  },

  degreesToRadians: (degrees: number) => {
    return degrees * DEGREES_MULTIPLIER
  },

  radiansToDegrees: (radians: number) => {
    return radians * RADIANS_MULTIPLIER
  },
}
