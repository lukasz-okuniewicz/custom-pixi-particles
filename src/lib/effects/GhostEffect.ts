import { Sprite, Texture, Ticker, Container, BLEND_MODES } from 'pixi.js-legacy'
import ParticlePool from '../ParticlePool'
import Particle from '../Particle'

export interface IGhostEffectOptions {
  spawnInterval?: number;   // Seconds between echo spawns (default: 0.05)
  ghostLifetime?: number;   // How long each echo stays visible (default: 0.5)
  startAlpha?: number;      // Initial transparency of the echo
  endAlpha?: number;        // Final transparency before removal
  startTint?: number;       // Hex color (0xFFFFFF for original)
  endTint?: number;         // Target color (e.g., 0x00AAFF for blue trail)
  blendMode?: BLEND_MODES;  // Typically NORMAL or ADD
  maxGhosts?: number;       // Safety limit on number of active echoes
}

interface GhostInstance {
  sprite: Sprite;
  particle: Particle;
  initialX: number;
  initialY: number;
  initialRotation: number;
  initialScaleX: number;
  initialScaleY: number;
}

export default class GhostEffect extends Container {
  private instances: GhostInstance[] = []
  private spawnTimer: number = 0
  private options: Required<IGhostEffectOptions>
  private isTracking: boolean = false

  constructor(private target: Sprite, options: IGhostEffectOptions = {}) {
    super()
    this.options = {
      spawnInterval: options.spawnInterval ?? 0.05,
      ghostLifetime: options.ghostLifetime ?? 0.5,
      startAlpha: options.startAlpha ?? 0.6,
      endAlpha: options.endAlpha ?? 0,
      startTint: options.startTint ?? 0xFFFFFF,
      endTint: options.endTint ?? 0x00FFFF,
      blendMode: options.blendMode ?? BLEND_MODES.NORMAL,
      maxGhosts: options.maxGhosts ?? 20,
    }
  }

  /**
   * Start generating echoes.
   */
  public start(): void {
    if (this.isTracking) return
    this.isTracking = true
    Ticker.shared.add(this.update, this)
  }

  /**
   * Stop generating new echoes (existing ones will finish fading).
   */
  public stop(): void {
    this.isTracking = false
  }

  private update(): void {
    const dt = Ticker.shared.deltaMS / 1000

    // 1. Spawn logic
    if (this.isTracking) {
      this.spawnTimer += dt
      if (this.spawnTimer >= this.options.spawnInterval) {
        this.createGhost()
        this.spawnTimer = 0
      }
    }

    // 2. Update existing ghosts
    for (let i = this.instances.length - 1; i >= 0; i--) {
      const g = this.instances[i]
      const p = g.particle

      p.lifeTime += dt
      const progress = Math.min(1, p.lifeTime / p.maxLifeTime)

      // Apply Fading
      g.sprite.alpha = this.options.startAlpha + (this.options.endAlpha - this.options.startAlpha) * progress
      
      // Apply Color Shifting
      if (this.options.startTint !== this.options.endTint || this.options.startTint !== 0xFFFFFF) {
        g.sprite.tint = this.lerpColor(this.options.startTint, this.options.endTint, progress)
      }

      // Removal logic
      if (progress >= 1 || g.sprite.alpha <= 0) {
        this.removeGhost(i)
      }
    }

    // Auto-destroy effect container if stopped and no ghosts remain
    if (!this.isTracking && this.instances.length === 0) {
      this.destroy()
    }
  }

  private createGhost(): void {
    if (this.instances.length >= this.options.maxGhosts) return
    if (!this.target.texture || !this.target.texture.valid) return

    const sprite = new Sprite(this.target.texture)
    sprite.anchor.copyFrom(this.target.anchor)
    sprite.scale.copyFrom(this.target.scale)
    sprite.rotation = this.target.rotation
    sprite.blendMode = this.options.blendMode
    
    // Convert target global position to local position of this container
    const globalPos = this.target.getGlobalPosition()
    const localPos = this.parent.toLocal(globalPos)
    sprite.x = localPos.x
    sprite.y = localPos.y

    const p = ParticlePool.global.pop()
    p.reset()
    p.maxLifeTime = this.options.ghostLifetime
    p.lifeTime = 0

    this.instances.push({
      sprite,
      particle: p,
      initialX: sprite.x,
      initialY: sprite.y,
      initialRotation: sprite.rotation,
      initialScaleX: sprite.scale.x,
      initialScaleY: sprite.scale.y
    })

    this.addChild(sprite)
  }

  private lerpColor(start: number, end: number, t: number): number {
    const r1 = (start >> 16) & 0xff, g1 = (start >> 8) & 0xff, b1 = start & 0xff
    const r2 = (end >> 16) & 0xff, g2 = (end >> 8) & 0xff, b2 = end & 0xff
    const r = r1 + (r2 - r1) * t, g = g1 + (g2 - g1) * t, b = b1 + (b2 - b1) * t
    return (r << 16) | (g << 8) | b
  }

  private removeGhost(index: number): void {
    const g = this.instances[index]
    if (g.particle) ParticlePool.global.push(g.particle)
    this.removeChild(g.sprite)
    g.sprite.destroy()
    this.instances.splice(index, 1)
  }

  public destroy(options?: any): void {
    Ticker.shared.remove(this.update, this)
    this.instances.forEach((_, i) => this.removeGhost(i))
    super.destroy(options)
  }
}