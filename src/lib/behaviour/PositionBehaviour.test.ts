import { describe, expect, it } from 'vitest'
import PositionBehaviour from './PositionBehaviour'
import Particle from '../Particle'
import Model from '../Model'

describe('PositionBehaviour extensions', () => {
  it('applies drag and max speed cap', () => {
    const b = new PositionBehaviour()
    b.drag = 1
    b.dragVariance = 0
    b.maxSpeed = 2
    b.maxSpeedVariance = 0
    b.velocity.x = 10
    b.velocityVariance.x = 0

    const p = new Particle()
    p.movement.x = 0
    p.movement.y = 0
    b.init(p, new Model())
    b.apply(p, 1, new Model())

    expect(Math.abs(p.velocity.x)).toBeLessThanOrEqual(2)
  })

  it('wraps when boundsMode is wrap', () => {
    const b = new PositionBehaviour()
    b.boundsMode = 'wrap'
    b.boundsMin.x = -10
    b.boundsMax.x = 10
    b.boundsMin.y = -10
    b.boundsMax.y = 10
    b.velocity.x = 30
    b.velocityVariance.x = 0

    const p = new Particle()
    p.movement.x = 0
    p.movement.y = 0
    b.init(p, new Model())
    b.apply(p, 1, new Model())

    expect(p.movement.x).toBe(-10)
  })

  it('bounces when boundsMode is bounce', () => {
    const b = new PositionBehaviour()
    b.boundsMode = 'bounce'
    b.bounceDamping = 0.5
    b.boundsMin.x = -10
    b.boundsMax.x = 10
    b.velocity.x = 30
    b.velocityVariance.x = 0

    const p = new Particle()
    p.movement.x = 0
    p.movement.y = 0
    b.init(p, new Model())
    b.apply(p, 1, new Model())

    expect(p.movement.x).toBe(10)
    expect(p.velocity.x).toBeLessThan(0)
  })

  it('clamps when boundsMode is clamp', () => {
    const b = new PositionBehaviour()
    b.boundsMode = 'clamp'
    b.boundsMin.x = -5
    b.boundsMax.x = 5
    b.velocity.x = 30
    b.velocityVariance.x = 0

    const p = new Particle()
    p.movement.x = 0
    p.movement.y = 0
    b.init(p, new Model())
    b.apply(p, 1, new Model())

    expect(p.movement.x).toBe(5)
  })
})
