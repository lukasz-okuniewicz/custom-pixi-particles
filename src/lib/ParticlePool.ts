import Particle from './Particle'

export default class ParticlePool {
  static global = new ParticlePool()
  first: any = null

  pop() {
    if (!this.first) return this.create()

    const current = this.first
    this.first = current.next
    current.next = null
    return current
  }

  create() {
    return new Particle()
  }

  push(particle: Particle) {
    particle.next = this.first
    this.first = particle
  }

  reset() {
    this.first = null
    ParticlePool.global = new ParticlePool()
  }
}
