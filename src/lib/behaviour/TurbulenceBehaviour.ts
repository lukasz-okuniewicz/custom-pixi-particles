import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'
import { Point } from '../util'
import TurbulencePool from '../util/turbulencePool'
import Model from '../Model'

export default class TurbulenceBehaviour extends Behaviour {
  position = new Point()
  positionVariance = new Point()
  velocity = new Point()
  velocityVariance = new Point()
  acceleration = new Point()
  accelerationVariance = new Point()
  sizeStart = new Point(1, 1)
  sizeEnd = new Point(1, 1)
  startVariance = 0
  endVariance = 0
  emitPerSecond = 0
  duration = 0
  maxLifeTime = 0
  turbulencePool: TurbulencePool
  private enabled: boolean = false
  private showVortices: boolean = false
  private effect: number = 0
  private turbulence: boolean = false
  private vortexOrgSize: number = 128

  init = (particle: Particle, model: Model, turbulencePool: TurbulencePool) => {
    particle.showVortices = this.showVortices
    particle.turbulence = this.turbulence
    this.turbulencePool = turbulencePool
  }

  apply = (particle: Particle) => {
    if (particle.turbulence) return

    this.turbulencePool.list.forEach((vortex: Particle) => {
      let vx = 0
      let vy = 0
      let factor = 0

      const dx = particle.x - vortex.x
      const dy = particle.y - vortex.y

      if (dx > this.vortexOrgSize * vortex.size.x) return
      if (dy > this.vortexOrgSize * vortex.size.x) return

      if (this.effect === 0 || this.effect === 1) {
        if (!this.effect) {
          vx = -dy + vortex.velocity.x
          vy = dx + vortex.velocity.y
        } else {
          vx = dy + vortex.velocity.x
          vy = -dx + vortex.velocity.y
        }

        factor = 1 / (1 + (dx * dx + dy * dy) / (this.vortexOrgSize * vortex.size.x))
      } else if (this.effect === 2) {
        vx = dx + vortex.velocity.x
        vy = dy + vortex.velocity.y

        factor = 1 / (1 + (dx * dx + dy * dy) / (this.vortexOrgSize * vortex.size.x))
      } else if (this.effect === 3) {
        vx = dx - vortex.velocity.x
        vy = dy - vortex.velocity.y

        factor = 1 / (1 + (dx * dx + dy * dy) / (this.vortexOrgSize * vortex.size.x))
      } else if (this.effect === 4) {
        vx = -dx + vortex.velocity.x
        vy = -dy + vortex.velocity.y

        factor = 1 / (1 + (dx * dx + dy * dy) / (this.vortexOrgSize * vortex.size.x))
      } else if (this.effect === 5) {
        vx = -dx - vortex.velocity.x
        vy = -dy - vortex.velocity.y

        factor = 1 / (1 + (dx * dx + dy * dy) / (this.vortexOrgSize * vortex.size.x))
      }

      particle.velocity.x += (vx - particle.velocity.x) * factor
      particle.velocity.y += (vy - particle.velocity.y) * factor
    })
  }

  getName() {
    return BehaviourNames.TURBULENCE_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      position: {
        x: this.position.x,
        y: this.position.y,
      },
      positionVariance: {
        x: this.positionVariance.x,
        y: this.positionVariance.y,
      },
      velocity: {
        x: this.velocity.x,
        y: this.velocity.y,
      },
      velocityVariance: {
        x: this.velocityVariance.x,
        y: this.velocityVariance.y,
      },
      acceleration: {
        x: this.acceleration.x,
        y: this.acceleration.y,
      },
      accelerationVariance: {
        x: this.accelerationVariance.x,
        y: this.accelerationVariance.y,
      },
      sizeStart: {
        x: this.sizeStart.x,
        y: this.sizeStart.y,
      },
      sizeEnd: {
        x: this.sizeEnd.x,
        y: this.sizeEnd.y,
      },
      startVariance: this.startVariance,
      endVariance: this.endVariance,
      emitPerSecond: this.emitPerSecond,
      duration: this.duration,
      maxLifeTime: this.maxLifeTime,
      version: this.effect,
      name: this.getName(),
    }
  }
}
