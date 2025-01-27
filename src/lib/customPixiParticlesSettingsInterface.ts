export interface ICustomPixiParticlesSettings {
  textures: string[]
  emitterConfig: any
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
}
