export default class Random {
  static get = () => {
    return Random.uniform(0, 1)
  }

  static uniform = (min: number, max: number) => {
    return Math.random() * (max - min) + min
  }
}
