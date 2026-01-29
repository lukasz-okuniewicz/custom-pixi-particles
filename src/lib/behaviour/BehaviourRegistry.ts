import type { IBehaviour } from './IBehaviour'

type BehaviourConstructor = new () => IBehaviour

/**
 * Registry for custom behaviour classes. Register a class here so it can be
 * created by name when loading emitter config (e.g. from JSON or the editor).
 *
 * @example
 * import { Behaviour, BehaviourRegistry } from 'custom-pixi-particles'
 *
 * class MyCustomBehaviour extends Behaviour {
 *   enabled = true
 *   priority = 0
 *   getName() { return 'MyCustomBehaviour' }
 *   getProps() { return { enabled: this.enabled, priority: this.priority, name: this.getName() } }
 *   init(particle, model, turbulencePool) { ... }
 *   apply(particle, deltaTime, model) { ... }
 * }
 *
 * BehaviourRegistry.register('MyCustomBehaviour', MyCustomBehaviour)
 *
 * // Now config can use: { behaviours: [{ name: 'MyCustomBehaviour', ... }] }
 */
export const BehaviourRegistry = {
  _behaviours: new Map<string, BehaviourConstructor>(),

  /**
   * Register a custom behaviour class by name. This name must match the string
   * used in your emitter config (config.behaviours[].name).
   */
  register(name: string, BehaviourClass: BehaviourConstructor): void {
    this._behaviours.set(name, BehaviourClass)
  },

  /**
   * Unregister a custom behaviour by name.
   */
  unregister(name: string): boolean {
    return this._behaviours.delete(name)
  },

  /**
   * Get a registered behaviour constructor by name, or undefined if not registered.
   * Used internally by EmitterParser when creating behaviours from config.
   */
  get(name: string): BehaviourConstructor | undefined {
    return this._behaviours.get(name)
  },

  /**
   * Check if a name is registered (custom or built-in is not checked here).
   */
  has(name: string): boolean {
    return this._behaviours.has(name)
  },
}
