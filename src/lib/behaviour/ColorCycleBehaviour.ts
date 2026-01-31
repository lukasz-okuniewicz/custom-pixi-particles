import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'

export interface IColorStop {
  t: number
  r: number
  g: number
  b: number
}

/**
 * ColorCycleBehaviour cycles particle color through a gradient over life or time (rainbow / heat).
 */
export default class ColorCycleBehaviour extends Behaviour {
  enabled = true
  priority = 90

  /** Stops in [0,1], e.g. [{ t: 0, r: 255, g: 0, b: 0 }, { t: 0.5, r: 0, g: 255, b: 0 }, { t: 1, r: 0, g: 0, b: 255 }] */
  colorStops: IColorStop[] = [
    { t: 0, r: 255, g: 0, b: 0 },
    { t: 0.5, r: 0, g: 255, b: 0 },
    { t: 1, r: 0, g: 0, b: 255 },
  ]
  /** 'life' = over lifeProgress, 'time' = over global time */
  mode: 'life' | 'time' = 'life'
  cycleSpeed = 1
  _time = 0

  init = () => {
    //
  }

  update = (deltaTime: number) => {
    this._time += deltaTime
  }

  apply = (particle: Particle) => {
    if (!this.enabled || !this.colorStops || this.colorStops.length < 2) return

    let t: number
    if (this.mode === 'life') {
      t = particle.lifeProgress
    } else {
      t = ((this._time * 0.001 * this.cycleSpeed) % 1)
      if (t < 0) t += 1
    }

    const stops = this.colorStops.slice().sort((a, b) => a.t - b.t)
    let i = 0
    while (i < stops.length - 1 && stops[i + 1].t < t) i++
    const a = stops[i]
    const b = i + 1 < stops.length ? stops[i + 1] : a
    const localT = b.t > a.t ? (t - a.t) / (b.t - a.t) : 1

    particle.color.r = Math.round(a.r + (b.r - a.r) * localT)
    particle.color.g = Math.round(a.g + (b.g - a.g) * localT)
    particle.color.b = Math.round(a.b + (b.b - a.b) * localT)
  }

  getName() {
    return BehaviourNames.COLOR_CYCLE_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      colorStops: this.colorStops ? this.colorStops.map((s) => ({ ...s })) : [],
      mode: this.mode,
      cycleSpeed: this.cycleSpeed,
      name: this.getName(),
    }
  }
}
