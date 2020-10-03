export default class CompatibilityHelper {
  static readDuration = (config: any) => {
    if (config.duration) {
      return config.duration
    }

    return -1
  }
}
