import { Color } from '../util'
import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'

export default class ColorBehaviour extends Behaviour {
  enabled = false
  priority = 0
  start = new Color()
  end = new Color()
  startVariance = new Color(0, 0, 0, 0)
  endVariance = new Color(0, 0, 0, 0)
  sinus = false

  // New properties
  colorStops: Color[] = [] // Multi-gradient stops
  usePerlin = false // Enable Perlin noise-based color changes
  perParticlePhaseOffset = 0 // Randomized phase offset range [0..1]
  pulseSpeed = 0 // Speed of the pulse effect
  pulseIntensity = 0 // Intensity of the pulse effect
  mirrorTransition = false // Mirror the color transition midway
  fadeToGray = false // Desaturate color over time
  fadeToTransparent = false // Fade alpha over time
  flickerIntensity = 0 // Intensity of random flickering
  interpolationMode: 'rgb' | 'hsv' | 'hsl' = 'rgb'
  segmentEasing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'smoothstep' = 'linear'
  blendMode: 'override' | 'add' | 'multiply' | 'screen' | 'lerp' = 'override'
  blendStrength = 1
  private _sortedColorStops: Color[] = []
  private _colorStopsCacheKey = ''

  init = (particle: Particle) => {
    if (!this.enabled) return

    function clamp(val: number, min: number, max: number) {
      return Math.min(Math.max(val, min), max)
    }

    // Copy base color
    particle.colorStart.copyFrom(this.start)
    // Add random variance
    particle.colorStart.r += this.varianceFrom(this.startVariance.r)
    particle.colorStart.g += this.varianceFrom(this.startVariance.g)
    particle.colorStart.b += this.varianceFrom(this.startVariance.b)
    particle.colorStart.alpha += this.varianceFrom(this.startVariance.alpha)

    // Clamp color channels to [0..255]
    particle.colorStart.r = clamp(particle.colorStart.r, 0, 255)
    particle.colorStart.g = clamp(particle.colorStart.g, 0, 255)
    particle.colorStart.b = clamp(particle.colorStart.b, 0, 255)
    particle.colorStart.alpha = clamp(particle.colorStart.alpha, 0, 1)

    // Repeat for colorEnd
    particle.colorEnd.copyFrom(this.end)
    particle.colorEnd.r += this.varianceFrom(this.endVariance.r)
    particle.colorEnd.g += this.varianceFrom(this.endVariance.g)
    particle.colorEnd.b += this.varianceFrom(this.endVariance.b)
    particle.colorEnd.alpha += this.varianceFrom(this.endVariance.alpha)

    particle.colorEnd.r = clamp(particle.colorEnd.r, 0, 255)
    particle.colorEnd.g = clamp(particle.colorEnd.g, 0, 255)
    particle.colorEnd.b = clamp(particle.colorEnd.b, 0, 255)
    particle.colorEnd.alpha = clamp(particle.colorEnd.alpha, 0, 1)

    ;(particle as any)._colorPhaseOffset = this.varianceFrom(this.perParticlePhaseOffset)

    // Initialize particle color to start
    particle.color.copyFrom(particle.colorStart)
  }

  apply = (particle: Particle) => {
    if (!this.enabled) return
    if (particle.skipColorBehaviour) return

    const phaseOffset = ((particle as any)._colorPhaseOffset as number) || 0
    const lifeProgress = this.normalizePhase(particle.lifeProgress + phaseOffset)
    const base = {
      r: particle.color.r,
      g: particle.color.g,
      b: particle.color.b,
      alpha: particle.color.alpha,
    }
    const target = {
      r: particle.color.r,
      g: particle.color.g,
      b: particle.color.b,
      alpha: particle.color.alpha,
    }

    // Multi-gradient color transitions
    if (this.colorStops.length > 0) {
      this.applyColorStops(target, lifeProgress)

      if (this.sinus) {
        target.alpha = Math.sin(lifeProgress * 3.1)
      } else if (this.fadeToTransparent) {
        target.alpha = (1 - lifeProgress) * this.start.alpha
      }
      this.applyBlendResult(particle, base, target)
      return
    }

    // Perlin noise color changes
    if (this.usePerlin) {
      this.applyPerlinColor(target, lifeProgress)
      this.applyBlendResult(particle, base, target)
      return
    }

    // Default linear gradient behavior
    const { colorStart, colorEnd } = particle

    let effectiveProgress = lifeProgress

    // Mirror transition if enabled
    if (this.mirrorTransition) {
      effectiveProgress = lifeProgress < 0.5 ? lifeProgress * 2 : (1 - lifeProgress) * 2
    }

    this.interpolateColor(
      colorStart,
      colorEnd,
      this.applyEasing(effectiveProgress),
      target,
    )

    if (!this.sinus) {
      target.alpha = colorStart.alpha + (colorEnd.alpha - colorStart.alpha) * effectiveProgress
    } else {
      if (!this.fadeToTransparent) {
        target.alpha = Math.sin(effectiveProgress * 3.1)
        if (target.alpha > particle.superColorAlphaEnd) {
          target.alpha = particle.superColorAlphaEnd
        }
      }
    }

    // Apply pulse effect if enabled
    if (this.pulseIntensity > 0) {
      this.applyPulseEffect(target, lifeProgress)
    }

    // Desaturation (fade to gray)
    if (this.fadeToGray) {
      this.applyFadeToGray(target)
    }

    // Alpha fading (fade to transparent)
    if (this.fadeToTransparent && !this.sinus) {
      target.alpha = (1 - lifeProgress) * this.start.alpha
    }

    // Flickering effect
    if (this.flickerIntensity) {
      this.applyFlickering(target)
    }

    this.applyBlendResult(particle, base, target)
  }

  applyColorStops = (target: { r: number; g: number; b: number; alpha: number }, lifeProgress: number) => {
    const colorStops = this.getSortedColorStops()

    // Ensure at least two color stops exist
    if (colorStops.length < 2) {
      return
    }

    // Clamp segment to valid range
    const segment = Math.floor(lifeProgress * (colorStops.length - 1))
    const nextSegment = Math.min(segment + 1, colorStops.length - 1)
    const t = this.applyEasing(lifeProgress * (colorStops.length - 1) - segment)

    const startColor = colorStops[segment]
    const endColor = colorStops[nextSegment]

    this.interpolateColor(startColor, endColor, t, target)
    target.alpha = startColor.alpha + (endColor.alpha - startColor.alpha) * t
  }

  pseudoRandomNoise(seed: number): number {
    const x = Math.sin(seed) * 10000
    return x - Math.floor(x) // Returns a value between 0 and 1
  }

  applyPerlinColor = (target: { r: number; g: number; b: number; alpha: number }, lifeProgress: number) => {
    const time = lifeProgress * 10 // Scale time
    target.r = this.pseudoRandomNoise(time) * 255
    target.g = this.pseudoRandomNoise(time + 1) * 255
    target.b = this.pseudoRandomNoise(time + 2) * 255
    target.alpha = this.pseudoRandomNoise(time + 3)
  }

  applyPulseEffect = (target: { r: number; g: number; b: number; alpha: number }, lifeProgress: number) => {
    // Compute pulse value based on life progress, speed, and intensity
    const pulse = 1 + Math.sin(lifeProgress * this.pulseSpeed * Math.PI * 2) * this.pulseIntensity

    // Apply pulse effect to the color
    target.r = Math.max(0, Math.min(255, target.r * pulse))
    target.g = Math.max(0, Math.min(255, target.g * pulse))
    target.b = Math.max(0, Math.min(255, target.b * pulse))
  }

  applyFadeToGray = (target: { r: number; g: number; b: number; alpha: number }) => {
    const gray = (target.r + target.g + target.b) / 3
    target.r = gray
    target.g = gray
    target.b = gray
  }

  applyFlickering = (target: { r: number; g: number; b: number; alpha: number }) => {
    const flickerAmount = (Math.random() - 0.5) * this.flickerIntensity * 255

    target.r = Math.max(0, Math.min(255, target.r + flickerAmount))
    target.g = Math.max(0, Math.min(255, target.g + flickerAmount))
    target.b = Math.max(0, Math.min(255, target.b + flickerAmount))
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

  private getSortedColorStops(): Color[] {
    const key = this.colorStops
      .map((s) => `${s.r},${s.g},${s.b},${s.alpha}`)
      .join('|')
    if (key === this._colorStopsCacheKey) return this._sortedColorStops
    this._colorStopsCacheKey = key
    this._sortedColorStops = this.colorStops.slice()
    return this._sortedColorStops
  }

  private interpolateColor(
    start: { r: number; g: number; b: number; alpha: number },
    end: { r: number; g: number; b: number; alpha: number },
    t: number,
    out: { r: number; g: number; b: number; alpha: number },
  ) {
    if (this.interpolationMode === 'rgb') {
      out.r = start.r + (end.r - start.r) * t
      out.g = start.g + (end.g - start.g) * t
      out.b = start.b + (end.b - start.b) * t
      return
    }
    const from = this.interpolationMode === 'hsl' ? this.rgbToHsl(start.r, start.g, start.b) : this.rgbToHsv(start.r, start.g, start.b)
    const to = this.interpolationMode === 'hsl' ? this.rgbToHsl(end.r, end.g, end.b) : this.rgbToHsv(end.r, end.g, end.b)
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

  private applyBlendResult(
    particle: Particle,
    base: { r: number; g: number; b: number; alpha: number },
    target: { r: number; g: number; b: number; alpha: number },
  ) {
    const strength = Math.max(0, Math.min(1, this.blendStrength))
    const blend = this.blendMode
    let r = target.r
    let g = target.g
    let b = target.b
    let a = target.alpha
    if (blend === 'add') {
      r = base.r + target.r
      g = base.g + target.g
      b = base.b + target.b
      a = base.alpha + target.alpha
    } else if (blend === 'multiply') {
      r = (base.r * target.r) / 255
      g = (base.g * target.g) / 255
      b = (base.b * target.b) / 255
      a = base.alpha * target.alpha
    } else if (blend === 'screen') {
      r = 255 - ((255 - base.r) * (255 - target.r)) / 255
      g = 255 - ((255 - base.g) * (255 - target.g)) / 255
      b = 255 - ((255 - base.b) * (255 - target.b)) / 255
      a = 1 - (1 - base.alpha) * (1 - target.alpha)
    } else if (blend === 'lerp') {
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
    return BehaviourNames.COLOR_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      start: {
        _r: this.start.r,
        _g: this.start.g,
        _b: this.start.b,
        _alpha: this.start.alpha,
      },
      end: {
        _r: this.end.r,
        _g: this.end.g,
        _b: this.end.b,
        _alpha: this.end.alpha,
      },
      startVariance: {
        _r: this.startVariance.r,
        _g: this.startVariance.g,
        _b: this.startVariance.b,
        _alpha: this.startVariance.alpha,
      },
      endVariance: {
        _r: this.endVariance.r,
        _g: this.endVariance.g,
        _b: this.endVariance.b,
        _alpha: this.endVariance.alpha,
      },
      sinus: this.sinus,
      colorStops: this.colorStops,
      usePerlin: this.usePerlin,
      perParticlePhaseOffset: this.perParticlePhaseOffset,
      pulseSpeed: this.pulseSpeed,
      pulseIntensity: this.pulseIntensity,
      mirrorTransition: this.mirrorTransition,
      fadeToGray: this.fadeToGray,
      fadeToTransparent: this.fadeToTransparent,
      flickerIntensity: this.flickerIntensity,
      interpolationMode: this.interpolationMode,
      segmentEasing: this.segmentEasing,
      blendMode: this.blendMode,
      blendStrength: this.blendStrength,
      name: this.getName(),
    }
  }
}
