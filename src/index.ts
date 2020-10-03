import Renderer from './lib/pixi/Renderer'
import * as PIXI from 'pixi.js'

const customPixiParticles = {
  create(textureNames: string[], config: any, animatedSprite: boolean = false, finishingTextureNames: string[]) {
    return new Renderer(textureNames, config, animatedSprite, finishingTextureNames)
  },
}

export { Renderer, customPixiParticles }
