import Renderer from './renderer/pixi/Renderer'
import * as PIXI from 'pixi.js-legacy'

const customPixiParticles = {
  create(textureNames: string[], config: any) {
    return new Renderer(textureNames, config)
  },
}

module.exports = customPixiParticles
