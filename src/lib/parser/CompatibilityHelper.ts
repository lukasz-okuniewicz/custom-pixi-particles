export default class CompatibilityHelper {
  static readDuration = (config: any) => {
    if (config.duration) {
      return config.duration
    }

    if (config.emitController && config.emitController._durationGuard) {
      return config.emitController._durationGuard.maxTime
    }

    return -1
  }
}
