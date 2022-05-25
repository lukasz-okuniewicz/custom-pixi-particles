import Renderer from './lib/pixi/Renderer'
import { ICustomPixiParticlesSettings } from './lib/customPixiParticlesSettingsInterface'

const customPixiParticles = {
  create(settings: ICustomPixiParticlesSettings) {
    const {
      textures, emitterConfig, PIXI, finishingTextures = []
    } = settings
    return new Renderer({textures, emitterConfig, finishingTextures, PIXI})
  },
}

export { Renderer, customPixiParticles, ICustomPixiParticlesSettings }
