import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'

let _tmp = 0

/**
 * The EmitDirectionBehaviour class that inherits from the Behaviour class.
 * This class is used to set the direction of a particle when it is emitted.
 * @export
 * @class EmitDirectionBehaviour
 * @extends {Behaviour}
 */
export default class EmitDirectionBehaviour extends Behaviour {
  enabled = true
  priority = 0
  angle = 0
  variance = 0

  /**
   * Initializes the particle's direction.
   * @param {Particle} particle - The particle that is being initialized.
   * @memberof EmitDirectionBehaviour
   */
  init = (particle: Particle) => {
    const directionAngle = this.angle + this.varianceFrom(this.variance)
    particle.directionCos = Math.cos(directionAngle)
    particle.directionSin = Math.sin(directionAngle)
  }

  /**
   * Applies the behavior to the particle.
   * @param {Particle} particle - The particle to which the behavior is being applied.
   * @param {number} deltaTime - The amount of time since the behavior was last applied.
   * @memberof EmitDirectionBehaviour
   */
  apply = (particle: Particle) => {
    const { x, y, directionSin, directionCos } = particle

    _tmp = directionCos * x - directionSin * y
    particle.y = directionSin * x + directionCos * y
    particle.x = _tmp
  }

  /**
   * Gets the name of the behavior.
   * @returns {BehaviourNames.EMIT_DIRECTION}
   * @memberof EmitDirectionBehaviour
   */
  getName() {
    return BehaviourNames.EMIT_DIRECTION
  }

  /**
   * Gets the properties of the behavior.
   * @returns {object} - The properties of the behavior.
   * @memberof EmitDirectionBehaviour
   */
  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      angle: this.angle,
      variance: this.variance,
      name: this.getName(),
    }
  }
}
