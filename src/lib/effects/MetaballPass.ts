import {
  BlurFilter,
  Container,
  Filter,
  GlProgram,
  RenderTexture,
  Sprite,
  Ticker,
  UPDATE_PRIORITY,
  type ColorSource,
  type Renderer,
} from 'pixi.js'

/**
 * Offscreen render → blur → alpha threshold/smoothstep for Particle Love–style “goo” silhouettes.
 * Add your particle {@link Container} (e.g. custom-pixi-particles Renderer) to {@link MetaballPass.source}.
 * It does not need to be on the stage; simulation tickers still run.
 *
 * On {@link MetaballPass.destroy}, {@link MetaballPass.source} is destroyed with its children.
 * Remove the particle renderer from `source` first if you need to keep using it elsewhere.
 */
export interface IMetaballPassOptions {
  /** Pixi renderer used for offscreen draws (e.g. `app.renderer`). */
  renderer: Renderer
  /** Logical width of the effect in pixels (matches layout space for {@link MetaballPass.source}). */
  width: number
  /** Logical height of the effect in pixels. */
  height: number
  /** Multiplier for offscreen buffer size (0.25–1). Lower = faster, chunkier blobs. */
  resolutionScale?: number
  /** Passed to {@link BlurFilter} strength. */
  blurStrength?: number
  /** Alpha cutoff after blur (0–1). */
  threshold?: number
  /** Edge softness; 0 = hard step. Larger = wider smoothstep band around threshold. */
  edgeSoftness?: number
  /** Clear color for the offscreen pass (include alpha 0 for transparency). */
  clearColor?: ColorSource
  /** Ticker used for automatic capture each frame (default: {@link Ticker.shared}). */
  ticker?: Ticker
  /** If false, call {@link MetaballPass.updateCapture} yourself after particle updates. */
  autoUpdate?: boolean
}

// Same filter vertex as MeltEffect (Pixi v8 GlProgram)
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

const thresholdSmoothFrag = `
in vec2 vTextureCoord;
uniform sampler2D uTexture;
uniform float uThreshold;
uniform float uSoftness;

void main(void) {
  vec4 color = texture(uTexture, vTextureCoord);
  float a = color.a;
  float t;
  if (uSoftness < 0.0001) {
    t = step(uThreshold, a);
  } else {
    float lo = max(0.0, uThreshold - uSoftness);
    float hi = min(1.0, uThreshold + uSoftness);
    t = smoothstep(lo, hi, a);
  }
  gl_FragColor = vec4(color.rgb * t, t);
}
`

export default class MetaballPass extends Container {
  /** Add particle systems here; coordinates are 0…width / 0…height in local space. */
  readonly source: Container

  private readonly _rendererRef: Renderer
  private readonly _output: Sprite
  private readonly _blur: BlurFilter
  private readonly _thresholdFilter: Filter
  private _renderTexture: RenderTexture
  private _bw: number
  private _bh: number
  private _logicalW: number
  private _logicalH: number
  private _resolutionScale: number
  private _tickerCb: (() => void) | null = null
  private _ticker: Ticker | null = null
  private _destroyed = false
  private _options: Required<
    Pick<
      IMetaballPassOptions,
      'blurStrength' | 'threshold' | 'edgeSoftness' | 'clearColor' | 'autoUpdate'
    >
  >

  constructor(options: IMetaballPassOptions) {
    super()

    const resolutionScale = Math.min(1, Math.max(0.1, options.resolutionScale ?? 0.5))
    this._logicalW = options.width
    this._logicalH = options.height
    this._bw = Math.max(1, Math.floor(options.width * resolutionScale))
    this._bh = Math.max(1, Math.floor(options.height * resolutionScale))
    this._resolutionScale = resolutionScale

    this._rendererRef = options.renderer
    this._options = {
      blurStrength: options.blurStrength ?? 12,
      threshold: options.threshold ?? 0.45,
      edgeSoftness: options.edgeSoftness ?? 0.08,
      clearColor: options.clearColor ?? 'rgba(0,0,0,0)',
      autoUpdate: options.autoUpdate ?? true,
    }

    this.source = new Container()

    this._renderTexture = RenderTexture.create({
      width: this._bw,
      height: this._bh,
      dynamic: true,
    })

    this._blur = new BlurFilter({
      strength: this._options.blurStrength,
      quality: 4,
      kernelSize: 5,
    })

    this._thresholdFilter = new Filter({
      glProgram: new GlProgram({
        vertex: standardVertex,
        fragment: thresholdSmoothFrag,
      }),
      resources: {
        metaballThresholdUniforms: {
          uThreshold: { value: this._options.threshold, type: 'f32' },
          uSoftness: { value: this._options.edgeSoftness, type: 'f32' },
        },
      },
    })

    this._output = new Sprite(this._renderTexture)
    this._output.filters = [this._blur, this._thresholdFilter]
    // Parent is usually stage-centered; anchor (0,0) would pin the quad’s top-left there and fill only the +x/+y quadrant.
    this._output.anchor.set(0.5, 0.5)
    this._output.width = this._logicalW
    this._output.height = this._logicalH
    this._output.position.set(0, 0)

    this.addChild(this._output)

    if (this._options.autoUpdate) {
      const ticker = options.ticker ?? Ticker.shared
      this._ticker = ticker
      this._tickerCb = () => {
        if (!this._destroyed) this.updateCapture()
      }
      ticker.add(this._tickerCb, undefined, UPDATE_PRIORITY.HIGH)
    }
  }

  /** Blur strength (updates GPU uniform). */
  setBlurStrength(value: number): void {
    this._blur.strength = value
  }

  /** Alpha threshold for the threshold pass. */
  setThreshold(value: number): void {
    this._options.threshold = value
    const u = (this._thresholdFilter.resources as any).metaballThresholdUniforms
    if (u?.uThreshold) u.uThreshold.value = value
  }

  /** Smoothstep band half-width around threshold. */
  setEdgeSoftness(value: number): void {
    this._options.edgeSoftness = value
    const u = (this._thresholdFilter.resources as any).metaballThresholdUniforms
    if (u?.uSoftness) u.uSoftness.value = value
  }

  /**
   * Renders {@link MetaballPass.source} into the internal {@link RenderTexture}, then the filtered sprite updates.
   * Called automatically each frame when `autoUpdate` is true; otherwise call after your particle step.
   */
  updateCapture(): void {
    if (this._destroyed) return
    this._rendererRef.render({
      container: this.source,
      target: this._renderTexture,
      clear: true,
      clearColor: this._options.clearColor,
    })
  }

  /**
   * Resize the logical size and rebuild the render target when dimensions change.
   */
  resize(width: number, height: number, resolutionScale?: number): void {
    if (resolutionScale !== undefined) {
      this._resolutionScale = Math.min(1, Math.max(0.1, resolutionScale))
    }
    this._logicalW = width
    this._logicalH = height
    this._bw = Math.max(1, Math.floor(width * this._resolutionScale))
    this._bh = Math.max(1, Math.floor(height * this._resolutionScale))

    this._renderTexture.resize(this._bw, this._bh)
    this._output.width = this._logicalW
    this._output.height = this._logicalH
  }

  override destroy(options?: Parameters<Container['destroy']>[0]): void {
    this._destroyed = true
    if (this._tickerCb && this._ticker) {
      this._ticker.remove(this._tickerCb)
      this._tickerCb = null
      this._ticker = null
    }
    this._output.filters = null
    this._blur.destroy()
    this._thresholdFilter.destroy()
    this.source.destroy({ children: true })
    super.destroy(options)
  }
}
