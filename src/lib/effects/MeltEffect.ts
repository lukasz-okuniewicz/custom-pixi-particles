import { BlurFilter, Container, Filter, GlProgram, Rectangle, Sprite, Texture, Ticker } from 'pixi.js'
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
  blurAmount?: number // Blur strength (default: 12 – adjust higher for stronger blur)
  threshold?: number // Alpha clipping point (0-1, default: 0.5)
  useCustomBlur?: boolean // If true, uses custom shader instead of built-in BlurFilter
}

// Standard vertex shader for custom filters
const standardVertex = `
in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition(void) {
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = (position.y * (2.0 / uOutputTexture.z / uOutputTexture.y)) - uOutputTexture.z;
  return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord(void) {
  return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void) {
  gl_Position = filterVertexPosition();
  vTextureCoord = filterTextureCoord();
}
`

// Custom blur (fallback) – uses texelSize scaling
const blurFrag = `
in vec2 vTextureCoord;
uniform sampler2D uTexture;
uniform vec2 uTexelSize;
uniform float uBlurRadius;

void main(void) {
  vec4 sum = vec4(0.0);
  float radius = uBlurRadius;

  // 3×3 box blur
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      vec2 offset = vec2(float(x), float(y)) * uTexelSize * radius;
      sum += texture(uTexture, vTextureCoord + offset);
    }
  }

  gl_FragColor = sum / 9.0;
}
`

// Threshold fragment shader
const thresholdFrag = `
in vec2 vTextureCoord;
uniform sampler2D uTexture;
uniform float threshold;

void main(void) {
  vec4 color = texture(uTexture, vTextureCoord);
  color.a = step(threshold, color.a);
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
  private options: Required<IMeltEffectOptions> & { useCustomBlur: boolean }
  private meltResolve?: () => void
  private pContainer: Container
  private currentTime: number = 0

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
      blurAmount: options.blurAmount ?? 12,
      threshold: options.threshold ?? 0.5,
      useCustomBlur: options.useCustomBlur ?? false,
    }

    this.pContainer = new Container()
    this.addChild(this.pContainer)

    this.x = sourceSprite.x
    this.y = sourceSprite.y
    this.rotation = sourceSprite.rotation
    this.scale.copyFrom(sourceSprite.scale)

    // ─── Filters ────────────────────────────────────────────────
    let blurFilter: BlurFilter | Filter

    if (this.options.useCustomBlur) {
      blurFilter = new Filter({
        glProgram: new GlProgram({
          vertex: standardVertex,
          fragment: blurFrag,
        }),
        resources: {
          blurUniforms: {
            uBlurRadius: { value: this.options.blurAmount, type: 'f32' },
            uTexelSize: { value: new Float32Array([1 / 256, 1 / 256]), type: 'vec2<f32>' },
          },
        },
      })
    } else {
      // Recommended: built-in BlurFilter (isotropic blur on both axes)
      blurFilter = new BlurFilter({
        strength: this.options.blurAmount,
        quality: 4, // 2–6 (higher = better quality, slower)
        kernelSize: 5, // 5,7,9,11,13,15
      })
    }

    const thresholdFilter = new Filter({
      glProgram: new GlProgram({
        vertex: standardVertex,
        fragment: thresholdFrag,
      }),
      resources: {
        thresholdUniforms: {
          threshold: { value: this.options.threshold, type: 'f32' },
        },
      },
    })

    this.pContainer.filters = [blurFilter, thresholdFilter]
  }

  private prepare(): void {
    const texture = this.sourceSprite.texture
    // v8: no .valid property anymore; check source existence + basic validity
    if (!texture || !texture.source) return

    const { gridCols, gridRows, horizontalSpread } = this.options
    const texFrame = texture.frame
    const stepW = texFrame.width / gridCols
    const stepH = texFrame.height / gridRows
    const scaleX = this.sourceSprite.scale.x
    const scaleY = this.sourceSprite.scale.y
    const anchorX = this.sourceSprite.anchor.x
    const anchorY = this.sourceSprite.anchor.y

    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const x1 = Math.floor(col * stepW)
        const y1 = Math.floor(row * stepH)

        const fragRect = new Rectangle(texFrame.x + x1, texFrame.y + y1, stepW, stepH)
        const fragTex = new Texture({ source: texture.source, frame: fragRect })

        const sprite = new Sprite(fragTex)
        sprite.anchor.set(0.5)
        sprite.scale.set(scaleX, scaleY)

        const lx = (x1 - texFrame.width * anchorX + stepW / 2) * scaleX
        const ly = (y1 - texFrame.height * anchorY + stepH / 2) * scaleY

        const p = ParticlePool.global.pop()
        p.reset()
        p.x = lx
        p.y = ly
        p.velocity.set(Random.uniform(-horizontalSpread, horizontalSpread), Random.uniform(0, 50))

        this.fragments.push({ sprite, particle: p })
        this.pContainer.addChild(sprite)
      }
    }

    this.sourceSprite.visible = false

    if (this.options.useCustomBlur) {
      this.updateTexelSize()
    }
  }

  private updateTexelSize(): void {
    if (!this.options.useCustomBlur) return

    // Approximate texel size based on source sprite dimensions
    const w = this.sourceSprite.width * Math.abs(this.sourceSprite.scale.x) || 256
    const h = this.sourceSprite.height * Math.abs(this.sourceSprite.scale.y) || 256

    const texelX = 1.0 / w
    const texelY = 1.0 / h

    const blur = this.pContainer.filters?.[0] as Filter | undefined
    if (blur && 'blurUniforms' in (blur.resources || {})) {
      const uniforms = (blur.resources as any).blurUniforms
      if (uniforms?.uTexelSize?.value) {
        uniforms.uTexelSize.value[0] = texelX
        uniforms.uTexelSize.value[1] = texelY
      }
    }
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

  private update = (): void => {
    if (!this.isProcessing) return

    const dt = Ticker.shared.deltaMS / 1000
    this.currentTime += dt

    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const f = this.fragments[i]
      const p = f.particle

      p.velocity.y += this.options.gravity * dt
      p.velocity.x *= this.options.viscosity
      p.velocity.y *= this.options.viscosity

      p.x += p.velocity.x * dt
      p.y += p.velocity.y * dt

      f.sprite.x = p.x
      f.sprite.y = p.y

      const lifeRatio = Math.max(0, 1 - this.currentTime / this.options.duration)
      f.sprite.scale.set(this.sourceSprite.scale.x * lifeRatio, this.sourceSprite.scale.y * lifeRatio)

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
    ParticlePool.global.push(f.particle)
    this.pContainer.removeChild(f.sprite)
    f.sprite.destroy()
    this.fragments.splice(index, 1)
  }

  private finish(): void {
    this.isProcessing = false
    Ticker.shared.remove(this.update, this)
    this.meltResolve?.()
  }

  public destroy(options?: boolean | { children?: boolean; texture?: boolean; baseTexture?: boolean }): void {
    Ticker.shared.remove(this.update, this)
    super.destroy(options)
  }

  public static async melt(sprite: Sprite, options: IMeltEffectOptions = {}): Promise<void> {
    if (!sprite.parent) return

    const effect = new MeltEffect(sprite, options)
    const index = sprite.parent.getChildIndex(sprite)
    sprite.parent.addChildAt(effect, index)

    await effect.start()

    effect.destroy({ children: true })
    // sprite.destroy(); // Uncomment if you want to remove the original sprite too
  }
}
