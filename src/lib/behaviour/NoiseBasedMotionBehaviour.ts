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

  gradients = new Map<string, Point>()
  gridSize = 256

  constructor() {
    super()
    this.initializeGradients()
  }

  initializeGradients() {
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        const angle = Math.random() * Math.PI * 2
        this.gradients.set(this._gridKey(i, j), new Point(Math.cos(angle), Math.sin(angle)))
      }
    }
  }

  getGradient(ix: number, iy: number): Point {
    return this.gradients.get(this._gridKey(ix, iy)) || new Point(0, 0)
  }

  _gridKey(x: number, y: number): string {
    return `${x % this.gridSize},${y % this.gridSize}`
  }

  lerp(a: number, b: number, t: number): number {
    return a + t * (b - a)
  }

  fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10)
  }

  perlinNoise(x: number, y: number): number {
    const x0 = Math.floor(x)
    const x1 = x0 + 1
    const y0 = Math.floor(y)
    const y1 = y0 + 1

    const sx = x - x0
    const sy = y - y0

    const g00 = this.getGradient(x0, y0)
    const g10 = this.getGradient(x1, y0)
    const g01 = this.getGradient(x0, y1)
    const g11 = this.getGradient(x1, y1)

    const dot00 = g00.x * (x - x0) + g00.y * (y - y0)
    const dot10 = g10.x * (x - x1) + g10.y * (y - y0)
    const dot01 = g01.x * (x - x0) + g01.y * (y - y1)
    const dot11 = g11.x * (x - x1) + g11.y * (y - y1)

    const u = this.fade(sx)
    const v = this.fade(sy)

    const nx0 = this.lerp(dot00, dot10, u)
    const nx1 = this.lerp(dot01, dot11, u)

    return this.lerp(nx0, nx1, v)
  }

  init = (particle: Particle) => {
    particle.noiseOffset = new Point(Math.random() * this.gridSize, Math.random() * this.gridSize)
  }

  apply = (particle: Particle, deltaTime: number) => {
    if (!this.enabled || particle.skipPositionBehaviour) return

    const { noiseOffset } = particle

    noiseOffset.x += this.noiseSpeed * deltaTime * this.noiseDirection.x
    noiseOffset.y += this.noiseSpeed * deltaTime * this.noiseDirection.y

    const noiseX = this.perlinNoise(noiseOffset.x * this.noiseScale, noiseOffset.y * this.noiseScale)
    const noiseY = this.perlinNoise(noiseOffset.y * this.noiseScale, noiseOffset.x * this.noiseScale)

    // Adjust movement instead of x, y directly
    particle.movement.x += noiseX * this.noiseIntensity * deltaTime
    particle.movement.y += noiseY * this.noiseIntensity * deltaTime
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
      name: this.getName(),
    }
  }
}
