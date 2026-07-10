import { describe, expect, it } from 'vitest'
import Model from '../Model'
import ToroidalWrapBehaviour from '../behaviour/ToroidalWrapBehaviour'
import Particle from '../Particle'

describe('ToroidalWrapBehaviour', () => {
  it('uses canvas bounds for unchanged manual defaults when canvas bounds are available', () => {
    const behaviour = new ToroidalWrapBehaviour()
    behaviour.enabled = true
    behaviour.useCanvasBounds = false

    const model = new Model()
    model.setToroidalCanvasBoundsFromSize(800, 600)

    const particle = new Particle()
    particle.movement.x = 0
    particle.movement.y = 0
    particle.x = 0
    particle.y = 0
    particle.velocity.x = 1
    particle.velocity.y = 1
    particle.size.set(1, 1)

    behaviour.init(particle, model, null as any)
    behaviour.apply(particle, 16, model)

    expect(particle.x).toBe(0)
    expect(particle.y).toBe(0)
  })

  it('wraps movement and visual position together', () => {
    const behaviour = new ToroidalWrapBehaviour()
    behaviour.enabled = true
    behaviour.useCanvasBounds = true
    behaviour.inset = 0

    const model = new Model()
    model.setToroidalCanvasBoundsFromSize(200, 200)

    const particle = new Particle()
    particle.movement.x = 0
    particle.movement.y = 170
    particle.x = 0
    particle.y = 180
    particle.velocity.y = 1
    particle.size.set(4, 4)

    behaviour.init(particle, model, null as any)
    behaviour.apply(particle, 16, model)

    expect(particle.movement.y).toBeLessThan(-100)
    expect(particle.y).toBe(particle.movement.y + 10)
    expect((particle as any)._toroidalJustWrapped).toBe(true)
  })

  it('defers wrap until fade completes when wrapFadeEnabled', () => {
    const behaviour = new ToroidalWrapBehaviour()
    behaviour.enabled = true
    behaviour.useCanvasBounds = true
    behaviour.wrapFadeEnabled = true
    behaviour.wrapFadeDuration = 0.5
    behaviour.inset = 0

    const model = new Model()
    model.setToroidalCanvasBoundsFromSize(200, 200)

    const particle = new Particle()
    particle.movement.x = 0
    particle.movement.y = 170
    particle.x = 0
    particle.y = 180
    particle.velocity.y = 60
    particle.size.set(4, 4)

    behaviour.init(particle, model, null as any)

    const yBefore = particle.y
    behaviour.apply(particle, 1 / 60, model)

    expect(particle.y).toBe(yBefore)
    expect((particle as any)._toroidalJustWrapped).toBeFalsy()
    expect(behaviour.isWrapFadeActive(particle)).toBe(true)

    let frames = 0
    while (!(particle as any)._toroidalJustWrapped && frames < 120) {
      behaviour.apply(particle, 1 / 60, model)
      frames++
    }

    expect(particle.movement.y).toBeLessThan(-100)
    expect((particle as any)._toroidalJustWrapped).toBe(true)
    expect(behaviour.getWrapFadeMultiplier(particle)).toBe(0)

    frames = 0
    while (behaviour.isWrapFadeActive(particle) && frames < 120) {
      behaviour.apply(particle, 1 / 60, model)
      frames++
    }

    expect(behaviour.getWrapFadeMultiplier(particle)).toBe(1)
    expect(behaviour.isWrapFadeActive(particle)).toBe(false)
  })
})
