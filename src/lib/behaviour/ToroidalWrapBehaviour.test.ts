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
})
