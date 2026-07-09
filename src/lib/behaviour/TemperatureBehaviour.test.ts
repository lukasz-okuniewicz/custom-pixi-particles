import { describe, expect, it } from 'vitest'
import TemperatureBehaviour, { TemperatureZone } from './TemperatureBehaviour'
import Particle from '../Particle'
import Model from '../Model'

function particleAt(x: number, y: number) {
  const p = new Particle()
  p.movement.x = x
  p.movement.y = y
  return p
}

function baseZone(overrides: Partial<TemperatureZone> = {}): TemperatureZone {
  return {
    center: { x: 0, y: 0 },
    velocity: { x: 1, y: 1 },
    color: { r: 255, g: 0, b: 0, alpha: 1 },
    ...overrides,
  }
}

describe('TemperatureBehaviour zone shapes', () => {
  const behaviour = new TemperatureBehaviour()

  it('detects particles inside and outside a circle zone', () => {
    const zone = baseZone({ shapeType: 'circle', radius: 10 })

    expect(behaviour.isInZone(particleAt(5, 0), zone)).toBe(true)
    expect(behaviour.isInZone(particleAt(9, 0), zone)).toBe(true)
    expect(behaviour.isInZone(particleAt(10, 0), zone)).toBe(false)
    expect(behaviour.isInZone(particleAt(7, 7), zone)).toBe(true)
    expect(behaviour.isInZone(particleAt(8, 8), zone)).toBe(false)
  })

  it('detects particles inside and outside a square zone', () => {
    const zone = baseZone({ shapeType: 'square', halfSize: 10 })

    expect(behaviour.isInZone(particleAt(5, 5), zone)).toBe(true)
    expect(behaviour.isInZone(particleAt(9, -9), zone)).toBe(true)
    expect(behaviour.isInZone(particleAt(10, 0), zone)).toBe(false)
    expect(behaviour.isInZone(particleAt(0, 10), zone)).toBe(false)
  })

  it('detects particles inside and outside a rectangle zone', () => {
    const zone = baseZone({
      shapeType: 'rectangle',
      halfWidth: 20,
      halfHeight: 10,
    })

    expect(behaviour.isInZone(particleAt(15, 5), zone)).toBe(true)
    expect(behaviour.isInZone(particleAt(-19, -9), zone)).toBe(true)
    expect(behaviour.isInZone(particleAt(20, 0), zone)).toBe(false)
    expect(behaviour.isInZone(particleAt(0, 10), zone)).toBe(false)
  })

  it('treats legacy zones without shapeType as circles', () => {
    const zone = baseZone({ radius: 12 })

    expect(behaviour.isInZone(particleAt(0, 11), zone)).toBe(true)
    expect(behaviour.isInZone(particleAt(0, 12), zone)).toBe(false)
  })

  it('applies zone effects only when particle is inside the zone shape', () => {
    const b = new TemperatureBehaviour()
    b.zones = [
      baseZone({
        shapeType: 'rectangle',
        halfWidth: 10,
        halfHeight: 10,
        velocity: { x: 2, y: 2 },
        color: { r: 10, g: 20, b: 30, alpha: 1 },
      }),
    ]

    const inside = particleAt(5, 5)
    inside.velocity.x = 1
    inside.velocity.y = 1
    inside.color.r = 0
    inside.color.g = 0
    inside.color.b = 0

    const outside = particleAt(15, 0)
    outside.velocity.x = 1
    outside.velocity.y = 1
    outside.color.r = 0
    outside.color.g = 0
    outside.color.b = 0

    b.apply(inside)
    b.apply(outside)

    expect(inside.velocity.x).toBe(2)
    expect(inside.velocity.y).toBe(2)
    expect(inside.color.r).toBe(10)
    expect(inside.color.g).toBe(20)
    expect(inside.color.b).toBe(30)

    expect(outside.velocity.x).toBe(1)
    expect(outside.velocity.y).toBe(1)
    expect(outside.color.r).toBe(0)
    expect(outside.color.g).toBe(0)
    expect(outside.color.b).toBe(0)
  })

  it('restores the original color when a particle leaves a zone', () => {
    const b = new TemperatureBehaviour()
    b.zones = [
      baseZone({
        shapeType: 'circle',
        radius: 10,
        color: { r: 255, g: 0, b: 0, alpha: 1 },
      }),
    ]

    const particle = particleAt(0, 0)
    particle.color.r = 0
    particle.color.g = 255
    particle.color.b = 255
    particle.color.alpha = 0.8
    b.init(particle)

    b.apply(particle)
    expect(particle.color.r).toBe(255)
    expect(particle.color.g).toBe(0)
    expect(particle.color.b).toBe(0)

    particle.movement.x = 50
    b.apply(particle)
    expect(particle.color.r).toBe(0)
    expect(particle.color.g).toBe(255)
    expect(particle.color.b).toBe(255)
    expect(particle.color.alpha).toBe(0.8)
  })

  it('does not overwrite a color already updated by an earlier behaviour on exit', () => {
    const b = new TemperatureBehaviour()
    b.zones = [
      baseZone({
        shapeType: 'circle',
        radius: 10,
        color: { r: 255, g: 0, b: 0, alpha: 1 },
      }),
    ]

    const particle = particleAt(0, 0)
    particle.color.r = 0
    particle.color.g = 255
    particle.color.b = 255
    b.init(particle)

    b.apply(particle)
    particle.movement.x = 50
    particle.color.r = 10
    particle.color.g = 20
    particle.color.b = 30

    b.apply(particle)
    expect(particle.color.r).toBe(10)
    expect(particle.color.g).toBe(20)
    expect(particle.color.b).toBe(30)
  })

  it('eases toward zone color when gradual color transition is enabled', () => {
    const b = new TemperatureBehaviour()
    b.gradualColorTransition = true
    b.colorTransitionSpeed = 2
    b.zones = [
      baseZone({
        shapeType: 'circle',
        radius: 10,
        color: { r: 100, g: 0, b: 0, alpha: 1 },
      }),
    ]

    const particle = particleAt(0, 0)
    particle.color.r = 0
    particle.color.g = 0
    particle.color.b = 0
    particle.color.alpha = 1
    b.init(particle)

    b.apply(particle, 0.5)
    expect(particle.color.r).toBeCloseTo(63.21, 1)
    expect(particle.color.g).toBe(0)
    expect(particle.color.b).toBe(0)
    expect(particle.skipColorBehaviour).toBe(true)
    expect((particle as any)._temperatureBlend).toBeCloseTo(0.63, 2)
  })

  it('eases back to the live natural color when leaving a zone gradually', () => {
    const b = new TemperatureBehaviour()
    b.gradualColorTransition = true
    b.colorTransitionSpeed = 2
    b.zones = [
      baseZone({
        shapeType: 'circle',
        radius: 10,
        color: { r: 100, g: 0, b: 0, alpha: 1 },
      }),
    ]

    const particle = particleAt(50, 0)
    particle.color.r = 0
    particle.color.g = 200
    particle.color.b = 200
    b.init(particle)
    particle.movement.x = 50
    ;(particle as any)._temperatureInZone = true
    ;(particle as any)._temperatureBlend = 1
    ;(particle as any)._temperatureOutsideColor = { r: 0, g: 200, b: 200, alpha: 1 }
    ;(particle as any)._temperatureLastZoneColor = { r: 100, g: 0, b: 0, alpha: 1 }

    b.apply(particle, 0.25)
    expect(particle.color.r).toBeCloseTo(60.65, 1)
    expect(particle.color.g).toBeCloseTo(78.69, 1)
    expect(particle.color.b).toBeCloseTo(78.69, 1)
    expect(particle.skipColorBehaviour).toBe(true)
    expect((particle as any)._temperatureBlend).toBeCloseTo(0.61, 2)
  })

  it('restores saved outside color on exit when color behaviour was skipped in the zone', () => {
    const b = new TemperatureBehaviour()
    b.gradualColorTransition = true
    b.colorTransitionSpeed = 20
    b.zones = [
      baseZone({
        shapeType: 'circle',
        radius: 10,
        color: { r: 100, g: 0, b: 0, alpha: 1 },
      }),
    ]

    const particle = particleAt(50, 0)
    particle.color.r = 100
    particle.color.g = 0
    particle.color.b = 0
    particle.skipColorBehaviour = true
    b.init(particle)
    particle.movement.x = 50
    particle.skipColorBehaviour = true
    ;(particle as any)._temperatureInZone = true
    ;(particle as any)._temperatureBlend = 1
    ;(particle as any)._temperatureOutsideColor = { r: 0, g: 200, b: 200, alpha: 1 }
    ;(particle as any)._temperatureLastZoneColor = { r: 100, g: 0, b: 0, alpha: 1 }

    b.apply(particle, 0.5)
    expect(particle.color.r).toBeCloseTo(0, 1)
    expect(particle.color.g).toBeCloseTo(200, 0)
    expect(particle.color.b).toBeCloseTo(200, 0)
    expect(particle.skipColorBehaviour).toBe(false)
  })

  it('tracks the current natural color while easing out across multiple frames', () => {
    const b = new TemperatureBehaviour()
    b.gradualColorTransition = true
    b.colorTransitionSpeed = 2
    b.zones = [
      baseZone({
        shapeType: 'circle',
        radius: 10,
        color: { r: 100, g: 0, b: 0, alpha: 1 },
      }),
    ]

    const particle = particleAt(50, 0)
    b.init(particle)
    particle.movement.x = 50
    ;(particle as any)._temperatureInZone = true
    ;(particle as any)._temperatureBlend = 1
    ;(particle as any)._temperatureOutsideColor = { r: 0, g: 200, b: 200, alpha: 1 }
    ;(particle as any)._temperatureLastZoneColor = { r: 100, g: 0, b: 0, alpha: 1 }

    particle.color.r = 100
    particle.color.g = 0
    particle.color.b = 0
    particle.skipColorBehaviour = true
    b.apply(particle, 0.25)
    expect(particle.color.r).toBeCloseTo(60.65, 1)

    particle.color.r = 100
    particle.color.g = 0
    particle.color.b = 0
    particle.skipColorBehaviour = true
    b.apply(particle, 0.25)
    expect(particle.color.r).toBeCloseTo(36.8, 0)

    particle.color.r = 100
    particle.color.g = 0
    particle.color.b = 0
    particle.skipColorBehaviour = true
    b.apply(particle, 0.5)
    expect(particle.color.r).toBeCloseTo(13.5, 0)
    expect(particle.color.g).toBeCloseTo(173.0, 0)
    expect(particle.color.b).toBeCloseTo(173.0, 0)
  })

  it('stops tinting once the outside transition converges', () => {
    const b = new TemperatureBehaviour()
    b.gradualColorTransition = true
    b.colorTransitionSpeed = 20
    b.zones = [
      baseZone({
        shapeType: 'circle',
        radius: 10,
        color: { r: 100, g: 0, b: 0, alpha: 1 },
      }),
    ]

    const particle = particleAt(50, 0)
    particle.color.r = 0
    particle.color.g = 200
    particle.color.b = 200
    b.init(particle)
    particle.movement.x = 50
    ;(particle as any)._temperatureInZone = true
    ;(particle as any)._temperatureTransitioningOut = true
    ;(particle as any)._temperatureBlend = 0.001
    ;(particle as any)._temperatureOutsideColor = { r: 0, g: 200, b: 200, alpha: 1 }
    ;(particle as any)._temperatureLastZoneColor = { r: 100, g: 0, b: 0, alpha: 1 }

    b.apply(particle, 0.5)
    expect(particle.color.r).toBeCloseTo(0, 3)
    expect(particle.color.g).toBeCloseTo(200, 3)
    expect(particle.color.b).toBeCloseTo(200, 3)
    expect(particle.skipColorBehaviour).toBe(false)
    expect((particle as any)._temperatureBlend).toBe(0)
  })

  it('restores outside color after a toroidal wrap teleports the particle out of a zone', () => {
    const b = new TemperatureBehaviour()
    b.zones = [
      baseZone({
        shapeType: 'circle',
        radius: 10,
        color: { r: 255, g: 0, b: 0, alpha: 1 },
      }),
    ]

    const particle = particleAt(300, 0)
    particle.color.r = 255
    particle.color.g = 0
    particle.color.b = 0
    b.init(particle)
    ;(particle as any)._temperatureInZone = true
    ;(particle as any)._temperatureOutsideColor = { r: 0, g: 255, b: 255, alpha: 1 }
    ;(particle as any)._toroidalJustWrapped = true

    b.apply(particle)
    expect(particle.color.r).toBe(0)
    expect(particle.color.g).toBe(255)
    expect(particle.color.b).toBe(255)
    expect((particle as any)._temperatureInZone).toBe(false)
  })

  it('preserves outside color when a toroidal wrap keeps the particle inside a zone', () => {
    const b = new TemperatureBehaviour()
    b.zones = [
      baseZone({
        shapeType: 'circle',
        radius: 100,
        color: { r: 255, g: 0, b: 0, alpha: 1 },
      }),
    ]

    const particle = particleAt(0, 0)
    particle.color.r = 0
    particle.color.g = 255
    particle.color.b = 255
    b.init(particle)

    b.apply(particle)
    expect(particle.color.r).toBe(255)

    particle.movement.x = 50
    ;(particle as any)._toroidalJustWrapped = true
    b.apply(particle)

    expect((particle as any)._temperatureOutsideColor).toEqual({
      r: 0,
      g: 255,
      b: 255,
      alpha: 1,
    })

    particle.movement.x = 300
    b.apply(particle)
    expect(particle.color.r).toBe(0)
    expect(particle.color.g).toBe(255)
    expect(particle.color.b).toBe(255)
  })

  it('recovers from corrupted outside color after leaving a zone', () => {
    const b = new TemperatureBehaviour()
    b.zones = [
      baseZone({
        shapeType: 'circle',
        radius: 10,
        color: { r: 255, g: 0, b: 0, alpha: 1 },
      }),
    ]

    const particle = particleAt(50, 0)
    particle.color.r = 10
    particle.color.g = 20
    particle.color.b = 30
    b.init(particle)
    ;(particle as any)._temperatureOutsideColor = { r: 255, g: 0, b: 0, alpha: 1 }
    ;(particle as any)._temperatureLastZoneColor = { r: 255, g: 0, b: 0, alpha: 1 }
    ;(particle as any)._temperatureInZone = false

    b.apply(particle)
    expect(particle.color.r).toBe(10)
    expect(particle.color.g).toBe(20)
    expect(particle.color.b).toBe(30)
  })

  it('clears residual zone tint when outside even if in-zone state was lost', () => {
    const b = new TemperatureBehaviour()
    b.zones = [
      baseZone({
        shapeType: 'circle',
        radius: 10,
        color: { r: 255, g: 0, b: 0, alpha: 1 },
      }),
    ]

    const particle = particleAt(50, 0)
    particle.color.r = 255
    particle.color.g = 0
    particle.color.b = 0
    b.init(particle)
    ;(particle as any)._temperatureOutsideColor = { r: 0, g: 255, b: 255, alpha: 1 }
    ;(particle as any)._temperatureLastZoneColor = { r: 255, g: 0, b: 0, alpha: 1 }
    ;(particle as any)._temperatureInZone = false

    b.apply(particle)
    expect(particle.color.r).toBe(0)
    expect(particle.color.g).toBe(255)
    expect(particle.color.b).toBe(255)
  })

  it('clears near-matching residual zone tint when last zone color was cleared', () => {
    const b = new TemperatureBehaviour()
    b.zones = [
      baseZone({
        shapeType: 'circle',
        radius: 10,
        color: { r: 255, g: 0, b: 0, alpha: 1 },
      }),
    ]

    const particle = particleAt(50, 0)
    particle.color.r = 252
    particle.color.g = 2
    particle.color.b = 2
    b.init(particle)
    ;(particle as any)._temperatureOutsideColor = { r: 0, g: 255, b: 255, alpha: 1 }
    ;(particle as any)._temperatureInZone = false

    b.apply(particle)
    expect(particle.color.r).toBe(0)
    expect(particle.color.g).toBe(255)
    expect(particle.color.b).toBe(255)
  })

  it('fades residual gradual tint when outside without wasInZone flag', () => {
    const b = new TemperatureBehaviour()
    b.gradualColorTransition = true
    b.colorTransitionSpeed = 20
    b.zones = [
      baseZone({
        shapeType: 'circle',
        radius: 10,
        color: { r: 100, g: 0, b: 0, alpha: 1 },
      }),
    ]

    const particle = particleAt(50, 0)
    particle.color.r = 50
    particle.color.g = 0
    particle.color.b = 0
    b.init(particle)
    ;(particle as any)._temperatureOutsideColor = { r: 0, g: 200, b: 200, alpha: 1 }
    ;(particle as any)._temperatureLastZoneColor = { r: 100, g: 0, b: 0, alpha: 1 }
    ;(particle as any)._temperatureBlend = 0.5
    ;(particle as any)._temperatureInZone = false

    b.apply(particle, 0.5)
    expect(particle.color.r).toBeLessThan(50)
    expect(particle.color.g).toBeGreaterThan(0)
    expect((particle as any)._temperatureBlend).toBeLessThan(0.5)
  })

  it('reconciles zone tint after a visibility resume when outside all zones', () => {
    const b = new TemperatureBehaviour()
    const model = new Model()
    model.signalVisibilityResume()
    b.zones = [
      baseZone({
        shapeType: 'circle',
        radius: 10,
        color: { r: 255, g: 0, b: 0, alpha: 1 },
      }),
    ]

    const particle = particleAt(50, 0)
    particle.color.r = 255
    particle.color.g = 0
    particle.color.b = 0
    b.init(particle)
    ;(particle as any)._temperatureOutsideColor = { r: 0, g: 255, b: 255, alpha: 1 }
    ;(particle as any)._temperatureInZone = true

    b.apply(particle, 1 / 60, model)
    expect(particle.color.r).toBe(0)
    expect(particle.color.g).toBe(255)
    expect(particle.color.b).toBe(255)

    b.onParticlesUpdated(model)
    model.signalVisibilityResume()
    ;(particle as any)._temperatureInZone = true
    particle.color.r = 255
    particle.color.g = 0
    particle.color.b = 0

    b.apply(particle, 1 / 60, model)
    expect(particle.color.r).toBe(0)
    expect(particle.color.g).toBe(255)
    expect(particle.color.b).toBe(255)
    b.onParticlesUpdated(model)
  })
})
