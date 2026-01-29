import type { IBehaviour } from './IBehaviour'
import type Particle from '../Particle'
import type Model from '../Model'
import type TurbulencePool from '../util/turbulencePool'
import BehaviourParser from '../parser/BehaviourParser'

/**
 * Placeholder for unknown/custom behaviour names (e.g. when the editor loads
 * a config that references a behaviour not registered in this context).
 * No-ops in init/apply but preserves config for save/load.
 */
export default class PlaceholderBehaviour implements IBehaviour {
  enabled = true
  priority = 0
  name = ''

  constructor(name: string) {
    this.name = name
  }

  getName() {
    return this.name
  }

  getParser() {
    return new BehaviourParser(this)
  }

  getProps(): Record<string, unknown> {
    const props: Record<string, unknown> = {}
    for (const key of Object.keys(this)) {
      if (typeof (this as any)[key] !== 'function') {
        props[key] = (this as any)[key]
      }
    }
    return props
  }

  init(_particle: Particle, _model: Model, _turbulencePool: TurbulencePool) {
    // no-op
  }

  apply(_particle: Particle, _deltaTime: number, _model: Model) {
    // no-op
  }
}
