import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'

/**
 * This class is responsible for managing the lifetimes of particles.
 * It sets the maximum lifetime of the particle and updates its progress.
 *
 * @extends Behaviour
 */
export default class LifeBehaviour extends Behaviour {
  enabled = true
  priority = 10000
  maxLifeTime = 0
  timeVariance = 0
  progressMode: 'linear' | 'loop' | 'pingPong' = 'linear'
  startDelay = 0
  startDelayVariance = 0
  timeScale = 1
  timeScaleVariance = 0
  infiniteLifePhaseOffset = 0
  killAtProgress = -1
  useLifeProgressForInfiniteTimeline = false
  /**
   * When maxLifeTime is infinite (e.g. -1 in config), `lifeProgress` cannot be
   * `lifeTime / maxLifeTime`. It repeats over this many seconds (0→1) so
   * ColorBehaviour, TimelineBehaviour, etc. still receive a changing progress.
   */
  infiniteLifeVisualPeriod = 5

  /**
   * Sets the particle's life time and maximum life time.
   *
   * @param {Particle} particle - The particle to set the life time of.
   * @returns {void}
   */
  init = (particle: Particle) => {
    particle.lifeTime = 0
    particle.lifeProgress = 0
    particle.lifeStartDelayRemaining = Math.max(
      0,
      this.startDelay + this.varianceFrom(this.startDelayVariance),
    )
    particle.lifeTimeScale = Math.max(
      0,
      this.timeScale + this.varianceFrom(this.timeScaleVariance),
    )
    particle.infiniteLifePhaseOffsetSeconds = Math.max(
      0,
      this.infiniteLifePhaseOffset + this.varianceFrom(this.infiniteLifePhaseOffset),
    )
    particle.timelineUseLifeProgressForInfinite = Boolean(
      this.useLifeProgressForInfiniteTimeline,
    )
    particle.killAtProgress =
      this.killAtProgress >= 0 && this.killAtProgress <= 1 ? this.killAtProgress : 2

    const raw = this.maxLifeTime + this.varianceFrom(this.timeVariance)
    /** Negative maxLifeTime (e.g. -1 in JSON) means infinite life; see persistent-wrap presets. */
    if (raw < 0) {
      particle.maxLifeTime = Infinity
    } else {
      particle.maxLifeTime = Math.max(raw, 0.0)
    }
  }

  /**
   * Updates the particle's life time and progress.
   *
   * @param {Particle} particle - The particle to update.
   * @param {number} deltaTime - The time since the last update.
   * @returns {void}
   */
  apply = (particle: Particle, deltaTime: number) => {
    if (!this.enabled) return
    const { maxLifeTime } = particle
    let effectiveDelta = deltaTime

    if (particle.lifeStartDelayRemaining > 0) {
      const consumed = Math.min(particle.lifeStartDelayRemaining, effectiveDelta)
      particle.lifeStartDelayRemaining -= consumed
      effectiveDelta -= consumed
    }

    if (effectiveDelta <= 0) {
      return
    }

    const lifeTime = particle.lifeTime + effectiveDelta * particle.lifeTimeScale

    particle.lifeTime = lifeTime

    if (maxLifeTime > 0 && Number.isFinite(maxLifeTime)) {
      const base = lifeTime / maxLifeTime
      if (this.progressMode === 'loop') {
        particle.lifeProgress = base - Math.floor(base)
      } else if (this.progressMode === 'pingPong') {
        const whole = Math.floor(base)
        const frac = base - whole
        particle.lifeProgress = whole % 2 === 0 ? frac : 1 - frac
      } else {
        particle.lifeProgress = Math.min(1.0, base)
      }
    } else if (!Number.isFinite(maxLifeTime)) {
      const period =
        this.infiniteLifeVisualPeriod > 0 ? this.infiniteLifeVisualPeriod : 5
      const phaseTime = lifeTime + particle.infiniteLifePhaseOffsetSeconds
      particle.lifeProgress = (phaseTime % period) / period
    }
  }

  /**
   * Returns the name of this behaviour.
   *
   * @returns {string} - The name of the behaviour.
   */
  getName() {
    return BehaviourNames.LIFE_BEHAVIOUR
  }

  /**
   * Returns the properties of the behaviour.
   *
   * @returns {Object} - The properties of the behaviour.
   */
  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      maxLifeTime: this.maxLifeTime,
      timeVariance: this.timeVariance,
      progressMode: this.progressMode,
      startDelay: this.startDelay,
      startDelayVariance: this.startDelayVariance,
      timeScale: this.timeScale,
      timeScaleVariance: this.timeScaleVariance,
      infiniteLifeVisualPeriod: this.infiniteLifeVisualPeriod,
      infiniteLifePhaseOffset: this.infiniteLifePhaseOffset,
      killAtProgress: this.killAtProgress,
      useLifeProgressForInfiniteTimeline: this.useLifeProgressForInfiniteTimeline,
      name: this.getName(),
    }
  }
}
