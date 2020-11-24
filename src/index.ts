import Renderer from './lib/pixi/Renderer'
import { ICustomPixiParticlesSettings } from './lib/customPixiParticlesSettingsInterface'

const customPixiParticles = {
  create(settings: ICustomPixiParticlesSettings) {
    const {
      textures, emitterConfig, finishingTextures = []
    } = settings
    return new Renderer({textures, emitterConfig, finishingTextures})
  },
}

export { Renderer, customPixiParticles, ICustomPixiParticlesSettings }
