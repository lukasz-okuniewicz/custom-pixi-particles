import type AbstractEmission from './AbstractEmission'

type EmissionConstructor = new () => AbstractEmission

/**
 * Registry for custom emission controllers. Register a class here so it can be
 * created by name when loading emitter config (e.g. from JSON or editor state).
 */
export const EmissionRegistry = {
  _emissions: new Map<string, EmissionConstructor>(),

  register(name: string, EmissionClass: EmissionConstructor): void {
    this._emissions.set(name, EmissionClass)
  },

  unregister(name: string): boolean {
    return this._emissions.delete(name)
  },

  get(name: string): EmissionConstructor | undefined {
    return this._emissions.get(name)
  },

  has(name: string): boolean {
    return this._emissions.has(name)
  },
}
