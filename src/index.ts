import Renderer from './lib/pixi/Renderer'
import * as PIXI from 'pixi.js'
import { ICustomPixiParticlesSettings } from './lib/customPixiParticlesSettingsInterface'

const customPixiParticles = {
  create(settings: ICustomPixiParticlesSettings) {
    const {
      textures, emitterConfig, animatedSprite = false, finishingTextures = [], animatedSpriteFrameRate = 15 / 60, animatedSpriteLoop = true
    } = settings
    return new Renderer({textures, emitterConfig, animatedSprite, finishingTextures, animatedSpriteFrameRate, animatedSpriteLoop})
  },
}

export { Renderer, customPixiParticles, ICustomPixiParticlesSettings }
