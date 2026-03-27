import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import type Particle from '../Particle'
import type Model from '../Model'
import type TurbulencePool from '../util/turbulencePool'

export default class PredatorPreyBehaviour extends Behaviour {
  enabled = true
  priority = 30
  chaseStrength = 180
  evadeStrength = 220
  reactionRadius = 180
  predatorRatio = 0.18
  particleListGetter: (() => { forEach: (cb: (p: Particle) => void) => void }) | null = null

  init(particle: Particle, _model: Model, _turbulencePool: TurbulencePool) {
    ;(particle as any).species = Math.random() < this.predatorRatio ? 'predator' : 'prey'
  }

  apply(particle: Particle, deltaTime: number) {
    if (!this.enabled || !this.particleListGetter) return
    const list = this.particleListGetter()
    if (!list) return
    let best: Particle | null = null
    let bestD2 = this.reactionRadius * this.reactionRadius
    list.forEach((other: Particle) => {
      if (other === particle) return
      const selfSpecies = (particle as any).species
      const otherSpecies = (other as any).species
      if (selfSpecies === otherSpecies) return
      const dx = other.movement.x - particle.movement.x
      const dy = other.movement.y - particle.movement.y
      const d2 = dx * dx + dy * dy
      if (d2 < bestD2) {
        bestD2 = d2
        best = other
      }
    })
    if (!best) return
    const target = best as Particle
    const dx = target.movement.x - particle.movement.x
    const dy = target.movement.y - particle.movement.y
    const d = Math.sqrt(dx * dx + dy * dy) || 1
    const ux = dx / d
    const uy = dy / d
    const isPredator = (particle as any).species === 'predator'
    const force = isPredator ? this.chaseStrength : -this.evadeStrength
    particle.velocity.x += ux * force * deltaTime
    particle.velocity.y += uy * force * deltaTime
  }

  getName(): string {
    return BehaviourNames.PREDATOR_PREY_BEHAVIOUR
  }

  getProps(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      priority: this.priority,
      chaseStrength: this.chaseStrength,
      evadeStrength: this.evadeStrength,
      reactionRadius: this.reactionRadius,
      predatorRatio: this.predatorRatio,
      name: this.getName(),
    }
  }
}
