import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import type Particle from '../Particle'
import type Model from '../Model'
import type TurbulencePool from '../util/turbulencePool'

export default class FlowFieldDriftBehaviour extends Behaviour {
  enabled = true
  priority = 35
  fieldScale = 0.008
  fieldStrength = 120
  curlAmount = 0.35
  timeScale = 0.45
  private time = 0

  init(_particle: Particle, _model: Model, _turbulencePool: TurbulencePool) {}

  update(deltaTime: number) {
    this.time += Math.max(0, deltaTime) * this.timeScale
  }

  apply(particle: Particle, deltaTime: number) {
    if (!this.enabled || particle.skipPositionBehaviour) return
    const x = particle.movement.x * this.fieldScale
    const y = particle.movement.y * this.fieldScale
    const t = this.time
    const angle = Math.sin(x * 1.7 + t) * 1.2 + Math.cos(y * 2.3 - t * 1.3) * 1.2
    const dirX = Math.cos(angle)
    const dirY = Math.sin(angle)
    const cx = -dirY
    const cy = dirX
    const fx = dirX * (1 - this.curlAmount) + cx * this.curlAmount
    const fy = dirY * (1 - this.curlAmount) + cy * this.curlAmount
    particle.velocity.x += fx * this.fieldStrength * deltaTime
    particle.velocity.y += fy * this.fieldStrength * deltaTime
  }

  getName(): string {
    return BehaviourNames.FLOW_FIELD_DRIFT_BEHAVIOUR
  }

  getProps(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      priority: this.priority,
      fieldScale: this.fieldScale,
      fieldStrength: this.fieldStrength,
      curlAmount: this.curlAmount,
      timeScale: this.timeScale,
      name: this.getName(),
    }
  }
}
