import { Sprite, Texture, Ticker, Rectangle, ParticleContainer } from 'pixi.js-legacy'
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
  mode?: ShatterMode
  explosionOrigin?: { x: number, y: number }
  blastDirection?: number
  swirlStrength?: number
  randomizeScale?: boolean
  endTint?: number
  enableRotation?: boolean
  rotationStrength?: number
}

interface Fragment {
  sprite: Sprite
  particle: Particle
  initialScale: number
  vz: number
  z: number
}

export default class ShatterEffect extends ParticleContainer {
  private sourceSprite: Sprite
  private fragments: Fragment[] = []
  private isExploded: boolean = false
  private options: Required<IShatterEffectOptions>
  private isCleanedUp: boolean = false

  private explodeResolve?: () => void

  constructor(sourceSprite: Sprite, options: IShatterEffectOptions = {}) {
    const cols = options.gridCols ?? 10;
    const rows = options.gridRows ?? 10;
    const needsRotation = options.enableRotation ?? true;
    const needsAlpha = (options.fadeOutDuration ?? 0.5) > 0;
    const needsTint = options.endTint !== undefined && options.endTint !== 0xFFFFFF;

    super(cols * rows, {
      vertices: true,
      position: true,
      uvs: true,
      rotation: needsRotation,
      alpha: needsAlpha,
      tint: needsTint,
    });

    this.sourceSprite = sourceSprite;
    this.options = {
      gridCols: cols,
      gridRows: rows,
      explosionPower: options.explosionPower ?? 1000,
      friction: options.friction ?? 0.96,
      gravity: options.gravity ?? 800,
      turbulence: options.turbulence ?? 0.2,
      lifetime: options.lifetime ?? 2.0,
      fadeOutDuration: options.fadeOutDuration ?? 0.5,
      mode: options.mode ?? 'radial',
      explosionOrigin: options.explosionOrigin ?? { x: 0.5, y: 0.5 },
      blastDirection: options.blastDirection ?? 0,
      swirlStrength: options.swirlStrength ?? 0,
      randomizeScale: options.randomizeScale ?? false,
      endTint: options.endTint ?? 0xFFFFFF,
      enableRotation: needsRotation,
      rotationStrength: options.rotationStrength ?? 1.0
    };

    this.x = this.sourceSprite.x;
    this.y = this.sourceSprite.y;
    this.rotation = this.sourceSprite.rotation;
    this.sourceSprite.visible = false;
  }

  private createFragments(): void {
    const texture = this.sourceSprite.texture
    if (!texture || !texture.valid) return

    const scale = this.sourceSprite.scale.x
    const texFrame = texture.frame
    const stepW = texFrame.width / this.options.gridCols
    const stepH = texFrame.height / this.options.gridRows
    const anchorX = this.sourceSprite.anchor.x
    const anchorY = this.sourceSprite.anchor.y
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

        // Create a sub-texture for this fragment
        const fragRect = new Rectangle(texFrame.x + x1, texFrame.y + y1, currentFragW, currentFragH)
        const fragTex = new Texture(texture.baseTexture, fragRect)
        const sprite = new Sprite(fragTex)
        sprite.anchor.set(0.5)

        const finalScale = this.options.randomizeScale ? scale * Random.uniform(0.8, 1.2) : scale;
        sprite.scale.set(finalScale)

        const lx = (x1 - (texFrame.width * anchorX) + currentFragW / 2) * scale
        const ly = (y1 - (texFrame.height * anchorY) + currentFragH / 2) * scale

        const dx = (x1 + currentFragW / 2) - originX
        const dy = (y1 + currentFragH / 2) - originY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const angleToOrigin = Math.atan2(dy, dx)

        let vx = 0
        let vy = 0
        if (this.options.mode === 'radial' || this.options.mode === 'swirl') {
          const force = (1.5 - (dist / texFrame.width)) * this.options.explosionPower
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

        const particle = ParticlePool.global.pop()
        particle.reset()
        particle.x = lx
        particle.y = ly
        particle.velocity.set(vx, vy)
        particle.acceleration.set(0, this.options.gravity)
        particle.maxLifeTime = this.options.lifetime * Random.uniform(0.8, 1.2)
        particle.lifeTime = 0
        // tslint:disable-next-line:max-line-length
        particle.radiansPerSecond = this.options.enableRotation ? Random.uniform(-12, 12) * this.options.rotationStrength : 0

        this.fragments.push({
          sprite,
          particle,
          initialScale: finalScale,
          vz: Random.uniform(-15, 15),
          z: 0
        })
        this.addChild(sprite)
      }
    }
  }

  public Explode(): Promise<void> {
    if (this.isExploded) return Promise.resolve()
    this.isExploded = true
    this.createFragments()
    Ticker.shared.add(this.update, this)
    return new Promise((resolve) => { this.explodeResolve = resolve })
  }

  private update(): void {
    if (!this.isExploded || this.isCleanedUp) return
    const dt = Ticker.shared.deltaMS / 1000

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

      const progress = p.lifeTime / p.maxLifeTime

      // Update Sprite Properties
      f.sprite.x = p.x
      f.sprite.y = p.y
      f.sprite.rotation = p.rotation

      const depthScale = Math.max(0.1, 1 + (f.z / 200))
      f.sprite.scale.set(f.initialScale * depthScale)

      if (this.options.endTint !== 0xFFFFFF) {
        f.sprite.tint = this.lerpColor(0xFFFFFF, this.options.endTint, progress);
      }

      const fadeThreshold = 1 - (this.options.fadeOutDuration / p.maxLifeTime)
      if (progress > fadeThreshold) {
        f.sprite.alpha = Math.max(0, (1 - progress) / (1 - fadeThreshold))
      }

      if (p.lifeTime >= p.maxLifeTime || f.sprite.alpha <= 0) {
        this.removeFragment(i)
      }
    }

    if (this.fragments.length === 0) {
      this.finish()
    }
  }

  private lerpColor(start: number, end: number, t: number): number {
    // tslint:disable-next-line:one-variable-per-declaration no-bitwise
    const r1 = (start >> 16) & 0xff, g1 = (start >> 8) & 0xff, b1 = start & 0xff;
    // tslint:disable-next-line:one-variable-per-declaration no-bitwise
    const r2 = (end >> 16) & 0xff, g2 = (end >> 8) & 0xff, b2 = end & 0xff;
    // tslint:disable-next-line:one-variable-per-declaration no-bitwise
    const r = r1 + (r2 - r1) * t, g = g1 + (g2 - g1) * t, b = b1 + (b2 - b1) * t;
    // tslint:disable-next-line:no-bitwise
    return (r << 16) | (g << 8) | b;
  }

  private removeFragment(index: number): void {
    const f = this.fragments[index]
    if (f.particle) ParticlePool.global.push(f.particle)
    if (f.sprite) {
      this.removeChild(f.sprite)
      // Note: We destroy the unique fragment texture to prevent memory leaks,
      // but NOT the baseTexture.
      f.sprite.texture.destroy(false)
      f.sprite.destroy()
    }
    this.fragments.splice(index, 1)
  }

  private finish(): void {
    Ticker.shared.remove(this.update, this)
    this.explodeResolve?.()
    this.explodeResolve = undefined
  }

  public destroy(options?: any): void {
    this.isCleanedUp = true
    Ticker.shared.remove(this.update, this)
    this.fragments.forEach((f, i) => this.removeFragment(i))
    this.fragments = []
    super.destroy(options)
  }

  public static async shatter(sprite: Sprite, options: IShatterEffectOptions = {}): Promise<void> {
    if (!sprite.parent) return;
    const effect = new ShatterEffect(sprite, options);
    const index = sprite.parent.getChildIndex(sprite);
    sprite.parent.addChildAt(effect, index);
    await effect.Explode();
    effect.destroy();
  }
}