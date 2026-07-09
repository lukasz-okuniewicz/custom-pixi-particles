import { describe, expect, it } from 'vitest'
import ColorBehaviour from './ColorBehaviour'
import EmitterBehaviours from './EmitterBehaviours'
import TemperatureBehaviour from './TemperatureBehaviour'
import ToroidalWrapBehaviour from './ToroidalWrapBehaviour'
import Model from '../Model'
import Particle from '../Particle'

function buildBehaviours() {
  const behaviours = new EmitterBehaviours()

  const color = new ColorBehaviour()
  color.enabled = true
  color.priority = 80
  color.start.set(0, 255, 255, 1)
  color.end.set(0, 255, 255, 1)

  const wrap = new ToroidalWrapBehaviour()
  wrap.enabled = true
  wrap.priority = 45
  wrap.useCanvasBounds = true
  wrap.inset = 0

  const temperature = new TemperatureBehaviour()
  temperature.enabled = true
  temperature.priority = 40
  temperature.zones = [
    {
      center: { x: 0, y: 0 },
      radius: 60,
      color: { r: 255, g: 0, b: 0, alpha: 1 },
      velocity: { x: 1, y: 1 },
    },
  ]

  behaviours.add(color)
  behaviours.add(wrap)
  behaviours.add(temperature)

  return { behaviours, temperature }
}

describe('TemperatureBehaviour with ToroidalWrapBehaviour', () => {
  it('restores outside color when wrap teleports a tinted particle out of a zone', () => {
    const { behaviours, temperature } = buildBehaviours()
    const model = new Model()
    model.setToroidalCanvasBoundsFromSize(200, 200)

    const particle = new Particle()
    particle.movement.x = 55
    particle.movement.y = 0
    particle.x = particle.movement.x
    particle.y = particle.movement.y
    particle.size.set(4, 4)
    particle.lifeProgress = 0

    behaviours.init(particle, model, null as any)
    behaviours.apply(particle, 1 / 60, model)

    expect(temperature.isInZone(particle, temperature.zones[0])).toBe(true)
    expect(particle.color.r).toBe(255)

    particle.movement.x = 105
    particle.x = 105
    behaviours.apply(particle, 1 / 60, model)

    expect(temperature.isInZone(particle, temperature.zones[0])).toBe(false)
    expect(particle.color.r).toBe(0)
    expect(particle.color.g).toBe(255)
    expect(particle.color.b).toBe(255)
    expect(particle.skipColorBehaviour).toBe(false)
  })

  it('keeps a valid outside color when wrap moves a particle within the same zone', () => {
    const { behaviours, temperature } = buildBehaviours()
    const model = new Model()
    model.setToroidalCanvasBoundsFromSize(200, 200)

    const particle = new Particle()
    particle.movement.x = 0
    particle.movement.y = 0
    particle.x = 0
    particle.y = 0
    particle.size.set(4, 4)
    particle.lifeProgress = 0

    behaviours.init(particle, model, null as any)
    behaviours.apply(particle, 1 / 60, model)
    expect(particle.color.r).toBe(255)

    particle.movement.x = 55
    particle.x = 55
    ;(particle as any)._toroidalJustWrapped = true
    behaviours.apply(particle, 1 / 60, model)

    expect(temperature.isInZone(particle, temperature.zones[0])).toBe(true)
    expect((particle as any)._temperatureOutsideColor.r).toBe(0)
    expect((particle as any)._temperatureOutsideColor.g).toBe(255)
    expect((particle as any)._temperatureOutsideColor.b).toBe(255)

    particle.movement.x = 300
    particle.x = 300
    behaviours.apply(particle, 1 / 60, model)

    expect(particle.color.r).toBe(0)
    expect(particle.color.g).toBe(255)
    expect(particle.color.b).toBe(255)
  })
})
