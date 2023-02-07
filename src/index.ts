import Renderer from './lib/pixi/Renderer'
import TestRenderer from './lib/pixi/TestRenderer'
import { ICustomPixiParticlesSettings } from './lib/customPixiParticlesSettingsInterface'

/**
 * Constructs a renderer for custom pixi particles
 * @class Renderer
 * @param {ICustomPixiParticlesSettings} settings The settings for the renderer
 */
const customPixiParticles = {
  create(settings: ICustomPixiParticlesSettings) {
    const {
      textures, emitterConfig, animatedSpriteZeroPad = 2, animatedSpriteIndexToStart = 0, finishingTextures = []
    } = settings
    return new Renderer({textures, animatedSpriteZeroPad, animatedSpriteIndexToStart, emitterConfig, finishingTextures})
  },
  createTest(settings: ICustomPixiParticlesSettings) {
    const {
      textures, emitterConfig, animatedSpriteZeroPad = 2, animatedSpriteIndexToStart = 0, finishingTextures = []
    } = settings
    return new TestRenderer({textures, animatedSpriteZeroPad, animatedSpriteIndexToStart, emitterConfig, finishingTextures})
  },
}

export { Renderer, customPixiParticles, ICustomPixiParticlesSettings }
