/**
 * Class that provides helper methods for checking compatibility.
 */
export default class CompatibilityHelper {
  /**
   * Reads the duration from the given configuration.
   *
   * @param {Object} config - The configuration object.
   * @return {Number} The duration from the given configuration, or -1 if not found.
   */
  static readDuration = (config: any) => {
    if (typeof config.duration === 'number') {
      return config.duration
    }

    return -1
  }
}
