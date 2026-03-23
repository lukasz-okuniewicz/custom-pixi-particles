import type { IParticleLinkSettings } from './pixi/particleLinkLayer'

export interface ICustomPixiParticlesSettings {
  textures: string[]
  emitterConfig: any
  /** Optional proximity line mesh between particles (drawn under sprites). */
  particleLinks?: Partial<IParticleLinkSettings>
  animatedSpriteZeroPad?: number
  animatedSpriteIndexToStart?: number
  animatedSprite?: boolean
  finishingTextures?: string[]
  animatedSpriteFrameRate?: number
  animatedSpriteLoop?: boolean
  vertices?: boolean
  position?: boolean
  rotation?: boolean
  uvs?: boolean
  tint?: boolean
  maxParticles?: number
  maxFPS?: number
  minFPS?: number
  tickerSpeed?: number
  /**
   * Return current render buffer size (e.g. app.renderer.width/height).
   * Used when ToroidalWrapBehaviour has useCanvasBounds so wrap matches the canvas without manual min/max.
   */
  canvasSizeProvider?: () => { width: number; height: number }
}
