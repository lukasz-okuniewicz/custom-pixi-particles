import { describe, expect, it } from 'vitest'
import WarpBehaviour from './WarpBehaviour'
import Particle from '../Particle'
import Model from '../Model'

describe('WarpBehaviour', () => {
  it('updates camera state and projects particle in warp mode', () => {
    const b = new WarpBehaviour()
    b.enabled = true
    b.warpSpeed = 1
    b.warpBaseSpeed = 2
    b.cameraZConverter = 3
    b.warpFov = 13
    b.warpStretch = 2
    b.warpDistanceScaleConverter = 100
    b.positionVariance = { x: 120, y: 120 }

    const p = new Particle()
    p.sizeStart.set(1, 1)
    p.movement.set(10, 5)
    b.init(p, new Model())

    b.update(1)
    b.apply(p, 1, new Model())

    expect(Number.isFinite(p.x)).toBe(true)
    expect(Number.isFinite(p.y)).toBe(true)
    expect(Number.isFinite(p.rotation)).toBe(true)
    expect(p.size.y).toBeGreaterThanOrEqual(0)
  })
})
