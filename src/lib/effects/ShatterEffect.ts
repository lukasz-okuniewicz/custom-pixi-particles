// src/lib/effects/ShatterEffect.ts
import { Container, Sprite, Texture, Ticker, Rectangle, Point } from 'pixi.js-legacy'
import ParticlePool from '../ParticlePool'
import Particle from '../Particle'
import Random from '../util/Random'

export type ShatterMode = 'radial' | 'directional' | 'swirl';

export interface IShatterEffectOptions {
  gridCols?: number
  gridRows?: number
  explosionPower?: number
  friction?: number
  gravity?: number
  turbulence?: number
  lifetime?: number
  fadeOutDuration?: number
  // --- NEW OPTIONS ---
  mode?: ShatterMode
  explosionOrigin?: { x: number, y: number } // Normalized 0-1 (0.5, 0.5 is center)
  blastDirection?: number // Radians (used for 'directional' mode)
  swirlStrength?: number  // How much fragments rotate around the center
  randomizeScale?: boolean // Small variation in fragment sizes
  endTint?: number        // Hex color to tint towards (e.g. 0x000000 for charring)
}

interface Fragment {
  sprite: Sprite
  particle: Particle
  initialScale: number
  vz: number
  z: number
  startTint?: number
}

export default class ShatterEffect extends Container {
  private sourceSprite: Sprite
  private fragments: Fragment[] = []
  private ticker: Ticker
  private isExploded: boolean = false
  private options: Required<IShatterEffectOptions>
  private onCompleteCallback?: () => void

  constructor(sourceSprite: Sprite, options: IShatterEffectOptions = {}) {
    super()

    this.sourceSprite = sourceSprite
    this.options = {
      gridCols: options.gridCols ?? 10,
      gridRows: options.gridRows ?? 10,
      explosionPower: options.explosionPower ?? 1000,
      friction: options.friction ?? 0.96,
      gravity: options.gravity ?? 800,
      turbulence: options.turbulence ?? 0.2,
      lifetime: options.lifetime ?? 2.0,
      fadeOutDuration: options.fadeOutDuration ?? 0.5,
      // Defaults for new options
      mode: options.mode ?? 'radial',
      explosionOrigin: options.explosionOrigin ?? { x: 0.5, y: 0.5 },
      blastDirection: options.blastDirection ?? 0,
      swirlStrength: options.swirlStrength ?? 0,
      randomizeScale: options.randomizeScale ?? false,
      endTint: options.endTint ?? 0xFFFFFF
    }

    this.ticker = new Ticker()
    this.ticker.add(this.update, this)
    this.ticker.start()

    this.x = this.sourceSprite.x
    this.y = this.sourceSprite.y
    this.rotation = this.sourceSprite.rotation
    this.sourceSprite.visible = false
  }

  private createFragments(): void {
    const texture = this.sourceSprite.texture
    if (!texture.valid) return;

    const scale = this.sourceSprite.scale.x
    const texFrame = texture.frame

    const stepW = texFrame.width / this.options.gridCols
    const stepH = texFrame.height / this.options.gridRows

    const anchorX = this.sourceSprite.anchor.x
    const anchorY = this.sourceSprite.anchor.y

    // Calculate origin in pixels relative to top-left of texture
    const originX = texFrame.width * this.options.explosionOrigin.x
    const originY = texFrame.height * this.options.explosionOrigin.y

    for (let row = 0; row < this.options.gridRows; row++) {
      for (let col = 0; col < this.options.gridCols; col++) {

        const x1 = Math.floor(col * stepW)
        const y1 = Math.floor(row * stepH)
        const x2 = Math.min(Math.floor((col + 1) * stepW), texFrame.width)
        const y2 = Math.min(Math.floor((row + 1) * stepH), texFrame.height)

        const currentFragW = x2 - x1
        const currentFragH = y2 - y1

        if (currentFragW <= 0 || currentFragH <= 0) continue

        const fragRect = new Rectangle(
          texFrame.x + x1,
          texFrame.y + y1,
          currentFragW,
          currentFragH
        )

        const fragTex = new Texture(texture.baseTexture, fragRect)
        const sprite = new Sprite(fragTex)
        sprite.anchor.set(0.5)

        const finalScale = this.options.randomizeScale
          ? scale * Random.uniform(0.8, 1.2)
          : scale;
        sprite.scale.set(finalScale)

        const lx = (x1 - (texFrame.width * anchorX) + currentFragW / 2) * scale
        const ly = (y1 - (texFrame.height * anchorY) + currentFragH / 2) * scale

        // --- ENHANCED PHYSICS LOGIC ---
        const dx = (x1 + currentFragW / 2) - originX
        const dy = (y1 + currentFragH / 2) - originY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const angleToOrigin = Math.atan2(dy, dx)

        let vx = 0
        let vy = 0

        if (this.options.mode === 'radial' || this.options.mode === 'swirl') {
          const force = (1.5 - (dist / (texFrame.width))) * this.options.explosionPower
          const angle = angleToOrigin + Random.uniform(-this.options.turbulence, this.options.turbulence)

          vx = Math.cos(angle) * force
          vy = Math.sin(angle) * force

          if (this.options.mode === 'swirl') {
            const swirl = this.options.swirlStrength
            vx += Math.cos(angle + Math.PI / 2) * (dist * swirl)
            vy += Math.sin(angle + Math.PI / 2) * (dist * swirl)
          }
        } else if (this.options.mode === 'directional') {
          const force = this.options.explosionPower * Random.uniform(0.5, 1.5)
          const angle = this.options.blastDirection + Random.uniform(-this.options.turbulence, this.options.turbulence)
          vx = Math.cos(angle) * force
          vy = Math.sin(angle) * force
        }

        const vz = Random.uniform(-15, 15)

        const particle = ParticlePool.global.pop()
        particle.reset()
        particle.x = lx
        particle.y = ly
        particle.velocity.set(vx, vy)
        particle.acceleration.set(0, this.options.gravity)
        particle.maxLifeTime = this.options.lifetime * Random.uniform(0.8, 1.2)
        particle.lifeTime = 0
        particle.rotation = 0
        particle.radiansPerSecond = Random.uniform(-12, 12)

        this.fragments.push({
          sprite,
          particle,
          initialScale: finalScale,
          vz: vz,
          z: 0,
          startTint: sprite.tint
        })
        this.addChild(sprite)
      }
    }
  }

  public Explode(onComplete?: () => void): void {
    if (this.isExploded) return
    this.isExploded = true
    this.onCompleteCallback = onComplete
    this.createFragments()
  }

  private update(): void {
    if (!this.isExploded || this.fragments.length === 0) return
    const dt = this.ticker.deltaMS / 1000

    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const f = this.fragments[i]
      const p = f.particle

      p.lifeTime += dt

      p.velocity.x *= this.options.friction
      p.velocity.y *= this.options.friction
      p.velocity.y += p.acceleration.y * dt

      p.x += p.velocity.x * dt
      p.y += p.velocity.y * dt
      p.rotation += p.radiansPerSecond * dt

      f.z += f.vz * dt
      const depthScale = Math.max(0.1, 1 + (f.z / 200))

      f.sprite.x = p.x
      f.sprite.y = p.y
      f.sprite.rotation = p.rotation
      f.sprite.scale.set(f.initialScale * depthScale)

      const progress = p.lifeTime / p.maxLifeTime

      // --- COLOR TINT EFFECT ---
      if (this.options.endTint !== 0xFFFFFF) {
        f.sprite.tint = this.lerpColor(0xFFFFFF, this.options.endTint, progress);
      }

      // Fade Out
      const fadeThreshold = 1 - (this.options.fadeOutDuration / p.maxLifeTime)
      if (progress > fadeThreshold) {
        f.sprite.alpha = Math.max(0, (1 - progress) / (1 - fadeThreshold))
      }

      if (p.lifeTime >= p.maxLifeTime || f.sprite.alpha <= 0) {
        this.removeFragment(i)
      }
    }

    if (this.fragments.length === 0) {
      this.cleanup()
      if (this.onCompleteCallback) this.onCompleteCallback()
    }
  }

  private lerpColor(start: number, end: number, t: number): number {
    const r1 = (start >> 16) & 0xff, g1 = (start >> 8) & 0xff, b1 = start & 0xff;
    const r2 = (end >> 16) & 0xff, g2 = (end >> 8) & 0xff, b2 = end & 0xff;
    const r = r1 + (r2 - r1) * t;
    const g = g1 + (g2 - g1) * t;
    const b = b1 + (b2 - b1) * t;
    return (r << 16) | (g << 8) | b;
  }

  private removeFragment(index: number): void {
    const f = this.fragments[index]
    ParticlePool.global.push(f.particle)
    this.removeChild(f.sprite)
    f.sprite.destroy()
    this.fragments.splice(index, 1)
  }

  private cleanup(): void {
    if (this.ticker) {
      this.ticker.stop()
      this.ticker.destroy()
    }
    this.fragments.forEach(f => {
      if (f.sprite.parent) f.sprite.parent.removeChild(f.sprite)
      f.sprite.destroy()
      ParticlePool.global.push(f.particle)
    })
    this.fragments = []
  }

  public destroy(): void {
    this.cleanup()
    super.destroy()
  }

  /**
   * UI Helper: Shatters a sprite and automatically adds the effect to the stage.
   * @param sprite The PIXI Sprite to shatter
   * @param options Shatter options
   * @param onComplete Optional callback when animation finishes
   */
  public static shatter(sprite: Sprite, options: IShatterEffectOptions = {}, onComplete?: () => void): ShatterEffect {
    if (!sprite.parent) {
      console.warn("ShatterEffect: Sprite must have a parent to be shattered.");
      return null as any;
    }

    const effect = new ShatterEffect(sprite, options);

    // Add to the same parent and same index to maintain visual layers
    const index = sprite.parent.getChildIndex(sprite);
    sprite.parent.addChildAt(effect, index);

    effect.Explode(() => {
      effect.destroy();
      if (onComplete) onComplete();
    });

    return effect;
  }
}