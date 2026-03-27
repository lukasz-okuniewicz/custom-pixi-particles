import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'

export interface IColorStop {
  t: number
  r: number
  g: number
  b: number
  alpha?: number
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
  interpolationMode: 'rgb' | 'hsv' | 'hsl' = 'rgb'
  segmentEasing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'smoothstep' = 'linear'
  blendMode: 'override' | 'add' | 'multiply' | 'screen' | 'lerp' = 'override'
  blendStrength = 1
  perParticlePhaseOffset = 0
  _time = 0
  private _sortedStops: IColorStop[] = []
  private _cacheKey = ''

  init = (particle: Particle) => {
    ;(particle as any)._colorCyclePhaseOffset = this.varianceFrom(this.perParticlePhaseOffset)
  }

  update = (deltaTime: number) => {
    this._time += deltaTime
  }

  apply = (particle: Particle) => {
    if (!this.enabled || !this.colorStops || this.colorStops.length < 2) return

    let t: number
    const phaseOffset = ((particle as any)._colorCyclePhaseOffset as number) || 0
    if (this.mode === 'life') {
      t = this.normalizePhase(particle.lifeProgress + phaseOffset)
    } else {
      t = this.normalizePhase((this._time * 0.001 * this.cycleSpeed) + phaseOffset)
    }

    const base = { r: particle.color.r, g: particle.color.g, b: particle.color.b, alpha: particle.color.alpha }
    const stops = this.getSortedStops()
    let i = 0
    while (i < stops.length - 1 && stops[i + 1].t < t) i++
    const a = stops[i]
    const b = i + 1 < stops.length ? stops[i + 1] : a
    const localT = b.t > a.t ? this.applyEasing((t - a.t) / (b.t - a.t)) : 1

    const out = { r: a.r, g: a.g, b: a.b, alpha: (a.alpha ?? base.alpha) + ((b.alpha ?? base.alpha) - (a.alpha ?? base.alpha)) * localT }
    this.interpolateColor(a, b, localT, out)
    this.applyBlend(particle, base, out)
  }

  private normalizePhase(value: number): number {
    const normalized = value % 1
    return normalized < 0 ? normalized + 1 : normalized
  }

  private applyEasing(t: number): number {
    const x = Math.max(0, Math.min(1, t))
    if (this.segmentEasing === 'easeIn') return x * x
    if (this.segmentEasing === 'easeOut') return 1 - (1 - x) * (1 - x)
    if (this.segmentEasing === 'easeInOut') return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2
    if (this.segmentEasing === 'smoothstep') return x * x * (3 - 2 * x)
    return x
  }

  private getSortedStops(): IColorStop[] {
    const key = this.colorStops.map((s) => `${s.t},${s.r},${s.g},${s.b},${s.alpha ?? ''}`).join('|')
    if (key === this._cacheKey) return this._sortedStops
    this._cacheKey = key
    this._sortedStops = this.colorStops.slice().sort((a, b) => a.t - b.t)
    return this._sortedStops
  }

  private interpolateColor(a: IColorStop, b: IColorStop, t: number, out: { r: number; g: number; b: number; alpha: number }) {
    if (this.interpolationMode === 'rgb') {
      out.r = a.r + (b.r - a.r) * t
      out.g = a.g + (b.g - a.g) * t
      out.b = a.b + (b.b - a.b) * t
      return
    }
    const from = this.interpolationMode === 'hsl' ? this.rgbToHsl(a.r, a.g, a.b) : this.rgbToHsv(a.r, a.g, a.b)
    const to = this.interpolationMode === 'hsl' ? this.rgbToHsl(b.r, b.g, b.b) : this.rgbToHsv(b.r, b.g, b.b)
    let dh = to.h - from.h
    if (dh > 0.5) dh -= 1
    if (dh < -0.5) dh += 1
    const h = this.normalizePhase(from.h + dh * t)
    const s = from.s + (to.s - from.s) * t
    const vOrL = from.v + (to.v - from.v) * t
    const rgb = this.interpolationMode === 'hsl' ? this.hslToRgb(h, s, vOrL) : this.hsvToRgb(h, s, vOrL)
    out.r = rgb.r
    out.g = rgb.g
    out.b = rgb.b
  }

  private applyBlend(
    particle: Particle,
    base: { r: number; g: number; b: number; alpha: number },
    target: { r: number; g: number; b: number; alpha: number },
  ) {
    const strength = Math.max(0, Math.min(1, this.blendStrength))
    let r = target.r
    let g = target.g
    let b = target.b
    let a = target.alpha
    if (this.blendMode === 'add') {
      r = base.r + target.r
      g = base.g + target.g
      b = base.b + target.b
      a = base.alpha + target.alpha
    } else if (this.blendMode === 'multiply') {
      r = (base.r * target.r) / 255
      g = (base.g * target.g) / 255
      b = (base.b * target.b) / 255
      a = base.alpha * target.alpha
    } else if (this.blendMode === 'screen') {
      r = 255 - ((255 - base.r) * (255 - target.r)) / 255
      g = 255 - ((255 - base.g) * (255 - target.g)) / 255
      b = 255 - ((255 - base.b) * (255 - target.b)) / 255
      a = 1 - (1 - base.alpha) * (1 - target.alpha)
    } else if (this.blendMode === 'lerp') {
      r = base.r + (target.r - base.r) * strength
      g = base.g + (target.g - base.g) * strength
      b = base.b + (target.b - base.b) * strength
      a = base.alpha + (target.alpha - base.alpha) * strength
      particle.color.r = Math.max(0, Math.min(255, r))
      particle.color.g = Math.max(0, Math.min(255, g))
      particle.color.b = Math.max(0, Math.min(255, b))
      particle.color.alpha = Math.max(0, Math.min(1, a))
      return
    }
    particle.color.r = Math.max(0, Math.min(255, base.r + (r - base.r) * strength))
    particle.color.g = Math.max(0, Math.min(255, base.g + (g - base.g) * strength))
    particle.color.b = Math.max(0, Math.min(255, base.b + (b - base.b) * strength))
    particle.color.alpha = Math.max(0, Math.min(1, base.alpha + (a - base.alpha) * strength))
  }

  private rgbToHsv(r: number, g: number, b: number) {
    const rn = r / 255
    const gn = g / 255
    const bn = b / 255
    const max = Math.max(rn, gn, bn)
    const min = Math.min(rn, gn, bn)
    const d = max - min
    let h = 0
    if (d !== 0) {
      if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
      else if (max === gn) h = ((bn - rn) / d + 2) / 6
      else h = ((rn - gn) / d + 4) / 6
    }
    const s = max === 0 ? 0 : d / max
    return { h, s, v: max }
  }

  private hsvToRgb(h: number, s: number, v: number) {
    const i = Math.floor(h * 6)
    const f = h * 6 - i
    const p = v * (1 - s)
    const q = v * (1 - f * s)
    const t = v * (1 - (1 - f) * s)
    const mod = i % 6
    const map =
      mod === 0
        ? [v, t, p]
        : mod === 1
          ? [q, v, p]
          : mod === 2
            ? [p, v, t]
            : mod === 3
              ? [p, q, v]
              : mod === 4
                ? [t, p, v]
                : [v, p, q]
    return { r: map[0] * 255, g: map[1] * 255, b: map[2] * 255 }
  }

  private rgbToHsl(r: number, g: number, b: number) {
    const rn = r / 255
    const gn = g / 255
    const bn = b / 255
    const max = Math.max(rn, gn, bn)
    const min = Math.min(rn, gn, bn)
    let h = 0
    let s = 0
    const l = (max + min) / 2
    const d = max - min
    if (d !== 0) {
      s = d / (1 - Math.abs(2 * l - 1))
      if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
      else if (max === gn) h = ((bn - rn) / d + 2) / 6
      else h = ((rn - gn) / d + 4) / 6
    }
    return { h, s, v: l }
  }

  private hslToRgb(h: number, s: number, l: number) {
    const c = (1 - Math.abs(2 * l - 1)) * s
    const hp = h * 6
    const x = c * (1 - Math.abs((hp % 2) - 1))
    let rgb: [number, number, number] = [0, 0, 0]
    if (hp < 1) rgb = [c, x, 0]
    else if (hp < 2) rgb = [x, c, 0]
    else if (hp < 3) rgb = [0, c, x]
    else if (hp < 4) rgb = [0, x, c]
    else if (hp < 5) rgb = [x, 0, c]
    else rgb = [c, 0, x]
    const m = l - c / 2
    return { r: (rgb[0] + m) * 255, g: (rgb[1] + m) * 255, b: (rgb[2] + m) * 255 }
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
      interpolationMode: this.interpolationMode,
      segmentEasing: this.segmentEasing,
      blendMode: this.blendMode,
      blendStrength: this.blendStrength,
      perParticlePhaseOffset: this.perParticlePhaseOffset,
      name: this.getName(),
    }
  }
}
