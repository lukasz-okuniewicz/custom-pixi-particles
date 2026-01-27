import { Sprite, Texture, Ticker, Rectangle, ParticleContainer, BLEND_MODES } from 'pixi.js-legacy'
import ParticlePool from '../ParticlePool'
import Particle from '../Particle'
import Random from '../util/Random'

export interface IGlitchEffectOptions {
  slices?: number;          // Number of horizontal strips (default: 15)
  offsetRange?: number;     // Max horizontal shift in pixels (default: 30)
  flickerIntensity?: number;// Probability of slice disappearing/flashing (0-1)
  rgbSplit?: boolean;       // Enable Red/Green/Blue separation
  rgbOffset?: number;       // How far R/G/B channels drift apart
  duration?: number;        // How long the glitch lasts (seconds)
  refreshRate?: number;     // How often the glitch patterns change (seconds, e.g. 0.05)
}

interface GlitchSlice {
  sprites: Sprite[]; // [Original] or [Red, Green, Blue]
  particle: Particle;
  initialY: number;
}

export default class GlitchEffect extends ParticleContainer {
  private fragments: GlitchSlice[] = []
  private options: Required<IGlitchEffectOptions>
  private currentTime: number = 0
  private lastRefreshTime: number = 0
  private glitchResolve?: () => void
  private isProcessing: boolean = false

  constructor(private sourceSprite: Sprite, options: IGlitchEffectOptions = {}) {
    const slices = options.slices ?? 15;
    const isRGB = options.rgbSplit ?? true;
    
    // Max particles: slices * 3 (if RGB)
    super(slices * (isRGB ? 3 : 1), {
      vertices: true,
      position: true,
      uvs: true,
      alpha: true,
      tint: true,
    });

    this.options = {
      slices: slices,
      offsetRange: options.offsetRange ?? 30,
      flickerIntensity: options.flickerIntensity ?? 0.3,
      rgbSplit: isRGB,
      rgbOffset: options.rgbOffset ?? 10,
      duration: options.duration ?? 0.5,
      refreshRate: options.refreshRate ?? 0.06,
    };

    this.x = sourceSprite.x;
    this.y = sourceSprite.y;
    this.rotation = sourceSprite.rotation;
  }

  private prepare(): void {
    const texture = this.sourceSprite.texture;
    if (!texture || !texture.valid) return;

    const { slices, rgbSplit } = this.options;
    const texFrame = texture.frame;
    const sliceHeight = texFrame.height / slices;
    const scale = this.sourceSprite.scale.x;
    const anchorX = this.sourceSprite.anchor.x;
    const anchorY = this.sourceSprite.anchor.y;

    for (let i = 0; i < slices; i++) {
      const yOffset = i * sliceHeight;
      const fragRect = new Rectangle(texFrame.x, texFrame.y + yOffset, texFrame.width, sliceHeight);
      const fragTex = new Texture(texture.baseTexture, fragRect);
      
      const sliceSprites: Sprite[] = [];
      const tints = rgbSplit ? [0xFF0000, 0x00FF00, 0x0000FF] : [0xFFFFFF];

      tints.forEach(tint => {
        const sprite = new Sprite(fragTex);
        sprite.anchor.set(anchorX, 0); // Anchor top-left of slice
        sprite.scale.set(scale);
        sprite.tint = tint;
        if (rgbSplit) sprite.blendMode = BLEND_MODES.ADD;
        
        sliceSprites.push(sprite);
        this.addChild(sprite);
      });

      const p = ParticlePool.global.pop();
      p.reset();

      this.fragments.push({
        sprites: sliceSprites,
        particle: p,
        initialY: (yOffset - (texFrame.height * anchorY)) * scale
      });
    }

    this.sourceSprite.visible = false;
  }

  public async play(): Promise<void> {
    this.prepare();
    this.isProcessing = true;
    return new Promise((resolve) => {
      this.glitchResolve = resolve;
      Ticker.shared.add(this.update, this);
    });
  }

  private update(): void {
    if (!this.isProcessing) return;
    const dt = Ticker.shared.deltaMS / 1000;
    this.currentTime += dt;
    this.lastRefreshTime += dt;

    const shouldRefresh = this.lastRefreshTime >= this.options.refreshRate;

    for (let i = 0; i < this.fragments.length; i++) {
      const f = this.fragments[i];
      
      if (shouldRefresh) {
        // Calculate new random glitch state for this slice
        const isVisible = Math.random() > (this.options.flickerIntensity * 0.5);
        const xShift = (Math.random() - 0.5) * 2 * this.options.offsetRange;
        
        f.sprites.forEach((s, index) => {
          s.visible = isVisible;
          s.y = f.initialY;
          
          // RGB channel drift
          let channelOffset = 0;
          if (this.options.rgbSplit) {
            channelOffset = (index - 1) * (Math.random() * this.options.rgbOffset);
          }
          
          s.x = xShift + channelOffset;
          
          // Randomly turn some slices into white blocks (Digital Noise)
          if (Math.random() > 0.98) {
              s.tint = 0xFFFFFF;
              s.texture = Texture.WHITE;
          }
        });
      }
    }

    if (shouldRefresh) this.lastRefreshTime = 0;

    if (this.currentTime >= this.options.duration) {
      this.finish();
    }
  }

  private finish(): void {
    this.isProcessing = false;
    Ticker.shared.remove(this.update, this);
    this.sourceSprite.visible = true;
    this.glitchResolve?.();
  }

  public static async glitch(sprite: Sprite, options: IGlitchEffectOptions = {}): Promise<void> {
    if (!sprite.parent) return;
    const effect = new GlitchEffect(sprite, options);
    const index = sprite.parent.getChildIndex(sprite);
    sprite.parent.addChildAt(effect, index);
    await effect.play();
    effect.destroy({ children: true });
  }
}