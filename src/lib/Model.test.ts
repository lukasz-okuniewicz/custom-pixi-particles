import { describe, expect, it } from 'vitest'
import Model from './Model'

describe('Model', () => {
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
