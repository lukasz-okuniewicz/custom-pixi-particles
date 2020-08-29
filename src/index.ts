import Renderer from './renderer/pixi/Renderer'
import * as PIXI from 'pixi.js'

const customPixiParticles = {
  Renderer,
  create(textureNames: string[], config: any) {
    return new Renderer(textureNames, config)
  }
}

export default customPixiParticles
