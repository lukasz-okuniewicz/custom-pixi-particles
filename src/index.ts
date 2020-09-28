import Renderer from './lib/pixi/Renderer'
import * as PIXI from 'pixi.js'

const customPixiParticles = {
  create(textureNames: string[], config: any) {
    return new Renderer(textureNames, config)
  },
}

export { Renderer, customPixiParticles }
