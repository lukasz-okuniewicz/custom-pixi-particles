import { describe, expect, it } from 'vitest'
import Model from './Model'

describe('Model', () => {
  it('update copies warp and camera fields from behaviour', () => {
    const m = new Model()
    m.update({
      warp: true,
      cameraZConverter: 2,
      warpSpeed: 3,
      warpBaseSpeed: 4,
    })
    expect(m.warp).toBe(true)
    expect(m.cameraZConverter).toBe(2)
    expect(m.warpSpeed).toBe(3)
    expect(m.warpBaseSpeed).toBe(4)
  })

  it('update treats missing warp as false', () => {
    const m = new Model()
    m.warp = true
    m.update({ cameraZConverter: 1, warpSpeed: 1, warpBaseSpeed: 1 })
    expect(m.warp).toBe(false)
  })

  it('updateCamera no-ops when warp is false', () => {
    const m = new Model()
    m.warp = false
    m.cameraZ = 5
    m.updateCamera(100)
    expect(m.cameraZ).toBe(5)
  })

  it('updateCamera advances cameraZ when warp is enabled', () => {
    const m = new Model()
    m.warp = true
    m.cameraZConverter = 2
    m.warpSpeed = 3
    m.warpBaseSpeed = 4
    m.updateCamera(10)
    expect(m.cameraZ).toBe(10 * 2 * 3 * 4)
  })

  it('setToroidalCanvasBoundsFromSize centers bounds on origin', () => {
    const m = new Model()
    m.setToroidalCanvasBoundsFromSize(200, 100)
    expect(m.toroidalCanvasBounds).toEqual({
      minX: -100,
      maxX: 100,
      minY: -50,
      maxY: 50,
    })
  })

  it('clearToroidalCanvasBounds sets null', () => {
    const m = new Model()
    m.setToroidalCanvasBoundsFromSize(10, 10)
    m.clearToroidalCanvasBounds()
    expect(m.toroidalCanvasBounds).toBeNull()
  })

  it('resetReactiveSignals zeros bands and clears debug', () => {
    const m = new Model()
    m.reactiveSignals.beat = 9
    m.reactiveSignals.energy = 9
    m.reactiveSignals.source = 'pulse'
    m.reactiveSignals.raw.soundReactive.beat = 7
    m.reactiveSignals.debug = { foo: 1 }
    m.resetReactiveSignals()
    expect(m.reactiveSignals.beat).toBe(0)
    expect(m.reactiveSignals.energy).toBe(0)
    expect(m.reactiveSignals.source).toBe('none')
    expect(m.reactiveSignals.raw.soundReactive.beat).toBe(0)
    expect(m.reactiveSignals.debug).toBeNull()
  })
})
