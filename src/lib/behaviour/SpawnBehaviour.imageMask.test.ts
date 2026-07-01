import { describe, expect, it } from 'vitest'
import SpawnBehaviour from './SpawnBehaviour'
import LifeBehaviour from './LifeBehaviour'
import Particle from '../Particle'
import Point from '../util/Point'

describe('SpawnBehaviour ImageMask', () => {
  it('skips spawn while mask pool is not ready instead of using emitter center', () => {
    const spawn = new SpawnBehaviour()
    spawn.customPoints = [
      {
        spawnType: 'ImageMask',
        position: { x: 400, y: 300 },
        positionVariance: { x: 0, y: 0 },
        imageDataUrl: 'data:image/png;base64,not-loaded',
        particleDensity: 1,
      },
    ]

    const life = new LifeBehaviour()
    life.maxLifeTime = 2

    const particle = new Particle()
    life.init(particle)
    spawn.init(particle)

    expect(particle.maxLifeTime).toBe(0)
    expect(particle.isDead()).toBe(true)
  })

  it('spawns on mask pixels when pool is ready', () => {
    const spawn = new SpawnBehaviour()
    const point = {
      spawnType: 'ImageMask',
      position: { x: 400, y: 300 },
      positionVariance: { x: 0, y: 0 },
      imageDataUrl: 'data:image/png;base64,ready',
      particleDensity: 1,
    }
    spawn.customPoints = [point]

    const cacheKey = (spawn as any).getImageMaskPoolKey(point, 0)
    ;(spawn as any).sampleCache.set(cacheKey, {
      pixelPositions: [new Point(10, -5), new Point(-20, 8)],
      particleCount: 2,
    })

    const life = new LifeBehaviour()
    life.maxLifeTime = 2

    const particle = new Particle()
    life.init(particle)
    spawn.init(particle)

    expect(particle.maxLifeTime).toBe(2)
    expect(particle.movement.x).not.toBe(400)
    expect(particle.movement.y).not.toBe(300)
  })
})
