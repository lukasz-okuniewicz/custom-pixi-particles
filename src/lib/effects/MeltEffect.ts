import { Container, Filter, ParticleContainer, Rectangle, Sprite, Texture, Ticker } from 'pixi.js'
import ParticlePool from '../ParticlePool'
import Particle from '../Particle'
import Random from '../util/Random'

export interface IMeltEffectOptions {
  gridCols?: number
  gridRows?: number
  gravity?: number // Downward force (default: 1200)
  viscosity?: number // Friction/Resistance (default: 0.98)
  horizontalSpread?: number // How much they move sideways (default: 50)
  duration?: number
  blurAmount?: number // How "blobby" the liquid is (default: 6)
  threshold?: number // Alpha clipping point (0-1, default: 0.5)
}

// Simple blur shader (box blur)
const blurFrag = `
  precision mediump float;
  varying vec2 vTextureCoord;
  uniform sampler2D uSampler;
  uniform float uBlur;

  void main(void) {
    vec4 sum = vec4(0.0);
    float blurAmount = uBlur * 0.01; // Scale blur amount

    // Sample 9 pixels in a 3x3 grid
    for(int i = -1; i <= 1; i++) {
      for(int j = -1; j <= 1; j++) {
        vec2 offset = vec2(float(i), float(j)) * blurAmount;
        sum += texture2D(uSampler, vTextureCoord + offset);
      }
    }

    gl_FragColor = sum / 9.0;
  }
`

// Simple threshold shader to create the "Metaball" effect
const thresholdFrag = `
  varying vec2 vTextureCoord;
  uniform sampler2D uSampler;
  uniform float threshold;
  void main(void) {
    vec4 color = texture2D(uSampler, vTextureCoord);
    if (color.a > threshold) {
       color.a = 1.0;
    } else {
       color.a = 0.0;
    }
    gl_FragColor = color;
  }
`

interface MeltFragment {
  sprite: Sprite
  particle: Particle
}

export default class MeltEffect extends Container {
  private fragments: MeltFragment[] = []
  private isProcessing: boolean = false
  private options: Required<IMeltEffectOptions>
  private meltResolve?: () => void
  private pContainer: ParticleContainer
  private currentTime: number = 0
  private cachedScale: number = 1

  constructor(
    private sourceSprite: Sprite,
    options: IMeltEffectOptions = {},
  ) {
    super()
    const cols = options.gridCols ?? 15
    const rows = options.gridRows ?? 15

    this.options = {
      gridCols: cols,
      gridRows: rows,
      gravity: options.gravity ?? 1200,
      viscosity: options.viscosity ?? 0.98,
      horizontalSpread: options.horizontalSpread ?? 50,
      duration: options.duration ?? 2.5,
      blurAmount: options.blurAmount ?? 6,
      threshold: options.threshold ?? 0.5,
    }

    // We use a internal ParticleContainer so we can apply filters to it
    this.pContainer = new ParticleContainer(cols * rows, {
      vertices: true,
      position: true,
      uvs: true,
      alpha: true,
      tint: true,
    })

    this.addChild(this.pContainer)
    this.x = sourceSprite.x
    this.y = sourceSprite.y
    this.rotation = sourceSprite.rotation

    // Apply the Metaball Hook: Blur + Threshold
    const blurFilter = new Filter(undefined, blurFrag, {
      uBlur: this.options.blurAmount,
    })

    const thresholdFilter = new Filter(undefined, thresholdFrag, {
      threshold: this.options.threshold,
    })

    this.pContainer.filters = [blurFilter, thresholdFilter]
  }

  private prepare(): void {
    if (!this.sourceSprite || (this.sourceSprite as any).destroyed) return
    const texture = this.sourceSprite.texture
    if (!texture || !texture.valid) return

    const { gridCols, gridRows, horizontalSpread } = this.options
    const texFrame = texture.frame
    const stepW = texFrame.width / gridCols
    const stepH = texFrame.height / gridRows
    const scale = this.sourceSprite.scale.x
    this.cachedScale = scale
    const anchorX = this.sourceSprite.anchor.x
    const anchorY = this.sourceSprite.anchor.y

    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const x1 = Math.floor(col * stepW)
        const y1 = Math.floor(row * stepH)

        const fragRect = new Rectangle(texFrame.x + x1, texFrame.y + y1, stepW, stepH)
        const fragTex = new Texture(texture.baseTexture, fragRect)
        const sprite = new Sprite(fragTex)
        sprite.anchor.set(0.5)
        sprite.scale.set(scale)

        const lx = (x1 - texFrame.width * anchorX + stepW / 2) * scale
        const ly = (y1 - texFrame.height * anchorY + stepH / 2) * scale

        const p = ParticlePool.global.pop()
        p.reset()
        p.x = lx
        p.y = ly
        // High gravity, low horizontal velocity
        p.velocity.set(Random.uniform(-horizontalSpread, horizontalSpread), Random.uniform(0, 50))

        this.fragments.push({ sprite, particle: p })
        this.pContainer.addChild(sprite)
      }
    }
    this.sourceSprite.visible = false
  }

  public async start(): Promise<void> {
    this.prepare()
    this.isProcessing = true
    return new Promise((resolve) => {
      this.meltResolve = resolve
      Ticker.shared.add(this.update, this)
    })
  }

  public async melt(): Promise<void> {
    return this.start()
  }

  private update(): void {
    if (!this.isProcessing) return
    // Guard: if source sprite was destroyed (e.g. user switched effects mid-animation), stop immediately
    if (!this.sourceSprite || (this.sourceSprite as any).destroyed) {
      this.finish()
      return
    }
    const dt = Ticker.shared.deltaMS / 1000
    this.currentTime += dt

    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const f = this.fragments[i]
      const p = f.particle

      // Gravity and Viscosity
      p.velocity.y += this.options.gravity * dt
      p.velocity.x *= this.options.viscosity
      p.velocity.y *= this.options.viscosity

      p.x += p.velocity.x * dt
      p.y += p.velocity.y * dt

      f.sprite.x = p.x
      f.sprite.y = p.y

      // Gradually shrink fragments so the liquid "dries up" (use cachedScale - safe if sourceSprite was destroyed)
      const lifeRatio = 1 - this.currentTime / this.options.duration
      f.sprite.scale.set(this.cachedScale * lifeRatio)

      if (lifeRatio <= 0) {
        this.removeFragment(i)
      }
    }

    if (this.fragments.length === 0) {
      this.finish()
    }
  }

  private removeFragment(index: number): void {
    const f = this.fragments[index]
    if (f.particle) ParticlePool.global.push(f.particle)
    this.pContainer.removeChild(f.sprite)
    f.sprite.destroy()
    this.fragments.splice(index, 1)
  }

  private finish(): void {
    this.isProcessing = false
    Ticker.shared.remove(this.update, this)
    this.meltResolve?.()
  }

  public override destroy(options?: { children?: boolean; texture?: boolean; baseTexture?: boolean }): void {
    this.finish()
    super.destroy(options)
  }

  public static async melt(sprite: Sprite, options: IMeltEffectOptions = {}): Promise<void> {
    if (!sprite.parent) return
    const effect = new MeltEffect(sprite, options)
    const index = sprite.parent.getChildIndex(sprite)
    sprite.parent.addChildAt(effect, index)
    await effect.start()
    effect.destroy({ children: true })
  }
}
