import { createNoise2D } from 'simplex-noise'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'
import { Point } from '../util'
import Behaviour from './Behaviour'

export default class NoiseBasedMotionBehaviour extends Behaviour {
  enabled = true
  priority = 50

  noiseScale = 0.01
  noiseIntensity = 10
  noiseSpeed = 0.1
  noiseDirection = new Point(1, 1)
  mode: 'vector' | 'curl' = 'vector'
  octaves = 3
  lacunarity = 2
  gain = 0.5
  warpStrength = 0
  warpScale = 0.02
  warpSpeed = 0.5
  curlEpsilon = 0.01
  drag = 0
  maxNoiseSpeed = -1

  noise2D: any

  constructor() {
    super()
    this.noise2D = createNoise2D()
  }

  init = (particle: Particle) => {
    if (!this.enabled) return
    particle.noiseOffset = new Point(Math.random() * 1000, Math.random() * 1000)
  }

  private sampleFbm(x: number, y: number) {
    const octaves = Math.max(1, Math.floor(this.octaves))
    let total = 0
    let amplitude = 1
    let frequency = 1
    let ampSum = 0
    const lacunarity = Math.max(1e-4, this.lacunarity)
    const gain = Math.max(1e-4, this.gain)

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude
      ampSum += amplitude
      amplitude *= gain
      frequency *= lacunarity
    }
    return ampSum > 0 ? total / ampSum : total
  }

  private sampleDomainWarpedNoise(x: number, y: number, time: number) {
    const warpScale = Math.max(1e-6, this.warpScale)
    const warpStrength = this.warpStrength
    if (warpStrength === 0) {
      return this.sampleFbm(x, y)
    }

    const wx = this.sampleFbm((x + time) * warpScale, (y - time) * warpScale)
    const wy = this.sampleFbm((x - time) * warpScale, (y + time) * warpScale)
    return this.sampleFbm(x + wx * warpStrength, y + wy * warpStrength)
  }

  private clampNoiseVelocity(particle: Particle) {
    if (this.maxNoiseSpeed <= 0) return
    const vx = particle.velocity.x
    const vy = particle.velocity.y
    const speedSq = vx * vx + vy * vy
    const maxSq = this.maxNoiseSpeed * this.maxNoiseSpeed
    if (speedSq <= maxSq || speedSq <= 1e-12) return
    const scale = this.maxNoiseSpeed / Math.sqrt(speedSq)
    particle.velocity.x *= scale
    particle.velocity.y *= scale
  }

  apply = (particle: Particle, deltaTime: number) => {
    if (!this.enabled || particle.skipPositionBehaviour) return

    const { noiseOffset } = particle

    noiseOffset.x += this.noiseSpeed * deltaTime * this.noiseDirection.x
    noiseOffset.y += this.noiseSpeed * deltaTime * this.noiseDirection.y

    const sx = noiseOffset.x * this.noiseScale
    const sy = noiseOffset.y * this.noiseScale
    const t = noiseOffset.x * this.warpSpeed

    let fx = 0
    let fy = 0

    if (this.mode === 'curl') {
      const eps = Math.max(1e-5, this.curlEpsilon)
      const nX1 = this.sampleDomainWarpedNoise(sx + eps, sy, t)
      const nX2 = this.sampleDomainWarpedNoise(sx - eps, sy, t)
      const nY1 = this.sampleDomainWarpedNoise(sx, sy + eps, t)
      const nY2 = this.sampleDomainWarpedNoise(sx, sy - eps, t)
      const dNdx = (nX1 - nX2) / (2 * eps)
      const dNdy = (nY1 - nY2) / (2 * eps)
      fx = dNdy
      fy = -dNdx
    } else {
      fx = this.sampleDomainWarpedNoise(sx + 17.31, sy + 91.07, t)
      fy = this.sampleDomainWarpedNoise(sx - 63.11, sy + 27.49, t + 7.13)
    }

    const dragFactor = Math.max(0, 1 - this.drag * Math.max(0, deltaTime))
    particle.velocity.x *= dragFactor
    particle.velocity.y *= dragFactor
    particle.velocity.x += fx * this.noiseIntensity * deltaTime * this.noiseDirection.x
    particle.velocity.y += fy * this.noiseIntensity * deltaTime * this.noiseDirection.y
    this.clampNoiseVelocity(particle)
  }

  getName() {
    return BehaviourNames.NOISE_BASED_MOTION_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      noiseScale: this.noiseScale,
      noiseIntensity: this.noiseIntensity,
      noiseSpeed: this.noiseSpeed,
      noiseDirection: {
        x: this.noiseDirection.x,
        y: this.noiseDirection.y,
      },
      mode: this.mode,
      octaves: this.octaves,
      lacunarity: this.lacunarity,
      gain: this.gain,
      warpStrength: this.warpStrength,
      warpScale: this.warpScale,
      warpSpeed: this.warpSpeed,
      curlEpsilon: this.curlEpsilon,
      drag: this.drag,
      maxNoiseSpeed: this.maxNoiseSpeed,
      name: this.getName(),
    }
  }
}
