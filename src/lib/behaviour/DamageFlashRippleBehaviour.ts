import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'
import type Model from '../Model'
import type TurbulencePool from '../util/turbulencePool'

/**
 * Expanding radial impulse when triggerRipple is set true (e.g. damage / win shock).
 */
export default class DamageFlashRippleBehaviour extends Behaviour {
  enabled = true
  priority = 240

  centerX = 0
  centerY = 0
  /** Set true one frame to start wave; cleared internally after duration */
  triggerRipple = false
  waveSpeed = 350
  waveThickness = 80
  strength = 600
  duration = 1.2
  writeRadialPhase = true

  private _waveTime = 0
  private _active = false

  update = (deltaTime: number) => {
    if (this.triggerRipple) {
      this._active = true
      this._waveTime = 0
      this.triggerRipple = false
    }
    if (this._active) {
      this._waveTime += deltaTime
      if (this._waveTime >= this.duration) {
        this._active = false
      }
    }
  }

  init(_particle: Particle, _model: Model, _turbulencePool: TurbulencePool) {}

  apply(particle: Particle, deltaTime: number, _model: Model) {
    if (!this.enabled || !this._active || particle.skipPositionBehaviour) return

    const px = particle.movement.x
    const py = particle.movement.y
    const dx = px - this.centerX
    const dy = py - this.centerY
    const r = Math.hypot(dx, dy) || 1e-6
    const front = this.waveSpeed * this._waveTime
    const dr = r - front
    const band = Math.exp(-(dr * dr) / Math.max(1, this.waveThickness * this.waveThickness))

    const nx = dx / r
    const ny = dy / r
    const push = this.strength * band * deltaTime
    particle.velocity.x += nx * push
    particle.velocity.y += ny * push

    if (this.writeRadialPhase) {
      ;(particle as any).ripplePhase = Math.min(1, band)
    }
  }

  getName() {
    return BehaviourNames.DAMAGE_FLASH_RIPPLE_BEHAVIOUR
  }

  getProps(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      priority: this.priority,
      centerX: this.centerX,
      centerY: this.centerY,
      triggerRipple: this.triggerRipple,
      waveSpeed: this.waveSpeed,
      waveThickness: this.waveThickness,
      strength: this.strength,
      duration: this.duration,
      writeRadialPhase: this.writeRadialPhase,
      name: this.getName(),
    }
  }
}
