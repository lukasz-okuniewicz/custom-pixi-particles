import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'
import Model from '../Model'

export default class WarpBehaviour extends Behaviour {
  enabled = false
  priority = 90
  warpSpeed = 0
  warpBaseSpeed = 0
  cameraZConverter = 10
  warpFov = 20
  warpStretch = 5
  warpDistanceScaleConverter = 2000
  warpDistanceToCenter = false
  positionVariance = { x: 100, y: 100 }
  private cameraZ = 0

  init = (particle: Particle, _model: Model) => {
    if (!this.enabled) return
    this.restartWarp(particle, true)
  }

  update = (deltaTime: number) => {
    if (!this.enabled) return
    this.cameraZ += deltaTime * this.cameraZConverter * this.warpSpeed * this.warpBaseSpeed
  }

  apply = (particle: Particle, _deltaTime: number, _model: Model) => {
    if (!this.enabled) return

    const z = particle.z
    if (z < this.cameraZ) {
      this.restartWarp(particle, false)
    }

    const newZ = particle.z - this.cameraZ
    if (newZ <= 0) return
    const dxCenter = particle.movement.x
    const dyCenter = particle.movement.y
    const distanceCenter = Math.sqrt(dxCenter * dxCenter + dyCenter * dyCenter)
    const distanceScale = Math.max(
      0,
      (this.warpDistanceScaleConverter - newZ) / this.warpDistanceScaleConverter,
    )
    const fovZ = this.warpFov / newZ
    particle.x = particle.movement.x * fovZ
    particle.y = particle.movement.y * fovZ
    particle.size.x = distanceScale * particle.warpSizeStart.x
    particle.size.y =
      distanceScale * particle.warpSizeStart.y +
      distanceScale * this.warpSpeed * this.warpStretch * distanceCenter
    particle.rotation = Math.atan2(dyCenter, dxCenter) + Math.PI / 2
  }

  private restartWarp(particle: Particle, initial: boolean) {
    const { sizeStart } = particle
    if (initial) {
      particle.z = Math.random() * this.warpDistanceScaleConverter
    } else {
      particle.z = this.cameraZ + Math.random() * this.warpDistanceScaleConverter
    }
    const distance = Math.random() * this.positionVariance.x + 1
    const deg = Math.random() * (Math.PI * 2)
    const safeVarX = this.positionVariance.x === 0 ? 1 : this.positionVariance.x
    const safeVarY = this.positionVariance.y === 0 ? 1 : this.positionVariance.y
    particle.warpSizeStart.x = (1 - distance / safeVarX) * 0.5 * sizeStart.x
    particle.warpSizeStart.y = (1 - distance / safeVarY) * 0.5 * sizeStart.y
    if (this.warpDistanceToCenter) {
      particle.movement.x = Math.cos(deg) * distance
      particle.movement.y = Math.sin(deg) * distance
    } else {
      particle.x = Math.cos(deg) * distance
      particle.y = Math.sin(deg) * distance
      particle.movement.x = particle.x
      particle.movement.y = particle.y
    }
    particle.color.alpha = (1 - distance / safeVarX) * 0.5
  }

  getName() {
    return BehaviourNames.WARP_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      warpSpeed: this.warpSpeed,
      warpBaseSpeed: this.warpBaseSpeed,
      cameraZConverter: this.cameraZConverter,
      warpFov: this.warpFov,
      warpStretch: this.warpStretch,
      warpDistanceScaleConverter: this.warpDistanceScaleConverter,
      warpDistanceToCenter: this.warpDistanceToCenter,
      positionVariance: this.positionVariance,
      name: this.getName(),
    }
  }
}
