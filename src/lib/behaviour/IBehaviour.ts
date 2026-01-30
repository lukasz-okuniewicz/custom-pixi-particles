import type Particle from '../Particle'
import type Model from '../Model'
import type TurbulencePool from '../util/turbulencePool'
import type BehaviourParser from '../parser/BehaviourParser'

/**
 * Interface that any behaviour must implement to work with the particle emitter.
 * Use this for custom behaviours: implement IBehaviour (or extend Behaviour) and
 * register your class with BehaviourRegistry so it can be used by name in config.
 *
 * @example
 * // Custom behaviour implementing the interface
 * class MyCustomBehaviour extends Behaviour {
 *   enabled = true
 *   priority = 0
 *   getName() { return 'MyCustomBehaviour' }
 *   getProps() { return { enabled: this.enabled, priority: this.priority, name: this.getName() } }
 *   init(particle, model, turbulencePool) { ... }
 *   apply(particle, deltaTime, model) { ... }
 * }
 * BehaviourRegistry.register('MyCustomBehaviour', MyCustomBehaviour)
 */
export interface IBehaviour {
  /** Whether this behaviour is active */
  enabled: boolean
  /** Higher priority behaviours run first (default 0) */
  priority: number

  /** Unique name used in config and registry (e.g. 'MyCustomBehaviour') */
  getName(): string
  /** Parser for serializing/deserializing this behaviour (default: new BehaviourParser(this)) */
  getParser(): BehaviourParser
  /** Plain object of configurable properties for save/load (must include enabled, priority, name) */
  getProps(): Record<string, unknown>

  /** Called once per particle when it is created */
  init(particle: Particle, model: Model, turbulencePool: TurbulencePool): void
  /** Called every frame per particle */
  apply(particle: Particle, deltaTime: number, model: Model): void

  /** Optional: called once per frame (not per particle) */
  update?(deltaTime: number): void
  /** Optional: called when a particle is removed */
  onParticleRemoved?(particle: Particle): void
  /** Optional: draw wireframe/Graphics (e.g. Wireframe3DBehaviour) */
  draw?(graphics: any, deltaTime: number): void
}
