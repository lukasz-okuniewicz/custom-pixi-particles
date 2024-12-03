import Renderer from './lib/pixi/Renderer'
import { ICustomPixiParticlesSettings } from './lib/customPixiParticlesSettingsInterface'
import TestRenderer from './lib/pixi/TestRenderer'

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
      uvs = true,
      tint = true,
      maxParticles = 10000,
      maxFPS = 60,
      minFPS = 30,
      tickerSpeed = 0.02,
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
      minFPS,
      tickerSpeed,
    })
  },
}

const _customPixiParticlesEditorOnly = {
  create(settings: ICustomPixiParticlesSettings) {
    const {
      textures,
      emitterConfig,
      animatedSpriteZeroPad = 2,
      animatedSpriteIndexToStart = 0,
      finishingTextures = [],
      maxFPS = 60,
      minFPS = 60,
      tickerSpeed = 0.02,
    } = settings
    return new TestRenderer({
      textures,
      animatedSpriteZeroPad,
      animatedSpriteIndexToStart,
      emitterConfig,
      finishingTextures,
      maxFPS,
      minFPS,
      tickerSpeed,
    })
  },
}

export { Renderer, customPixiParticles, _customPixiParticlesEditorOnly, ICustomPixiParticlesSettings }
