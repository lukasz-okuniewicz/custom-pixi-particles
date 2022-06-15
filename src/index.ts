import Renderer from './lib/pixi/Renderer'
import { ICustomPixiParticlesSettings } from './lib/customPixiParticlesSettingsInterface'

const customPixiParticles = {
  create(settings: ICustomPixiParticlesSettings) {
    const {
      textures, resources, animatedSpriteZeroPad = 2, animatedSpriteIndexToStart = 0, emitterConfig, PIXI, finishingTextures = []
    } = settings
    return new Renderer({textures, resources, animatedSpriteZeroPad, animatedSpriteIndexToStart, emitterConfig, finishingTextures, PIXI})
  },
}

export { Renderer, customPixiParticles, ICustomPixiParticlesSettings }
