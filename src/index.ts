import Renderer from './lib/pixi/Renderer'
import { ICustomPixiParticlesSettings } from './lib/customPixiParticlesSettingsInterface'

/**
 * Constructs a renderer for custom pixi particles
 * @class Renderer
 * @param {ICustomPixiParticlesSettings} settings The settings for the renderer
 */
const customPixiParticles = {
  create(settings: ICustomPixiParticlesSettings) {
    const {
      textures,
      emitterConfig,
      animatedSpriteZeroPad = 2,
      animatedSpriteIndexToStart = 0,
      finishingTextures = [],
      vertices = true,
      position = true,
      rotation = true,
      uvs = false,
      tint = true,
      maxParticles = 10000,
      maxFPS = 60,
      tickerSpeed = 0.03,
    } = settings
    return new Renderer({
      textures,
      animatedSpriteZeroPad,
      animatedSpriteIndexToStart,
      emitterConfig,
      finishingTextures,
      vertices,
      position,
      rotation,
      uvs,
      tint,
      maxParticles,
      maxFPS,
      tickerSpeed,
    })
  },
}

export { Renderer, customPixiParticles, ICustomPixiParticlesSettings }
