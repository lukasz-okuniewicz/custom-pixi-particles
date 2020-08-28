import MersenneTwister from './MersenneTwister'

export default class Random {
  private static marsenneTwister = new MersenneTwister()

  static get = () => {
    return Random.uniform(0.0, 1.0)
  }

  static uniform = (min: number, max: number) => {
    return Random.marsenneTwister.genrand_real1() * (max - min) + min
  }
}
