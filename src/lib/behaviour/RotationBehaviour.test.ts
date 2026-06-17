import { describe, expect, it } from 'vitest'
import RotationBehaviour from './RotationBehaviour'
import Particle from '../Particle'

describe('RotationBehaviour', () => {
  it('sets a fixed startRotation when variance is zero', () => {
    const behaviour = new RotationBehaviour()
    behaviour.enabled = true
    behaviour.startRotation = 1.25
    behaviour.startRotationVariance = 0

    const particle = new Particle()
    behaviour.init(particle)

    expect(particle.rotation).toBe(1.25)
  })

  it('applies random startRotationVariance per particle', () => {
    const behaviour = new RotationBehaviour()
    behaviour.enabled = true
    behaviour.startRotation = 0
    behaviour.startRotationVariance = Math.PI

    const rotations = new Set<number>()
    for (let i = 0; i < 20; i++) {
      const particle = new Particle()
      behaviour.init(particle)
      rotations.add(particle.rotation)
    }

    expect(rotations.size).toBeGreaterThan(1)
    for (const rotation of rotations) {
      expect(rotation).toBeGreaterThanOrEqual(-Math.PI)
      expect(rotation).toBeLessThanOrEqual(Math.PI)
    }
  })

  it('keeps spin speed independent from start rotation', () => {
    const behaviour = new RotationBehaviour()
    behaviour.enabled = true
    behaviour.startRotation = 0.5
    behaviour.rotation = 2

    const particle = new Particle()
    behaviour.init(particle)
    behaviour.apply(particle, 0.5)

    expect(particle.rotation).toBeCloseTo(0.5 + 2 * 0.5, 5)
  })

  it('does nothing when disabled', () => {
    const behaviour = new RotationBehaviour()
    behaviour.enabled = false
    behaviour.startRotation = 2
    behaviour.rotation = 3

    const particle = new Particle()
    behaviour.init(particle)

    expect(particle.rotation).toBe(0)
    expect(particle.rotationDelta).toBe(0)
  })
})
