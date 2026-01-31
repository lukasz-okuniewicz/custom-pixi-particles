import Renderer from './lib/pixi/Renderer'
import { ICustomPixiParticlesSettings } from './lib/customPixiParticlesSettingsInterface'
import TestRenderer from './lib/pixi/TestRenderer'
import {
  CrystallizeEffect,
  DissolveEffect,
  GhostEffect,
  GlitchEffect,
  GranularErosionEffect,
  LiquidMercuryEffect,
  MagneticAssemblyEffect,
  MeltEffect,
  PixelSortEffect,
  PrismRefractionEffect,
  ShatterEffect,
  SlitScanEffect,
} from './lib/effects'
import { Container, Graphics } from 'pixi.js'

// tslint:disable-next-line:max-line-length
export type {
  IShatterEffectOptions,
  ShatterMode,
  IDissolveEffectOptions,
  DissolveDirection,
  IMagneticAssemblyOptions,
  AssemblyMode,
  IGhostEffectOptions,
  IGlitchEffectOptions,
  IMeltEffectOptions,
  IPixelSortEffectOptions,
  PixelSortDirection,
  PixelSortMode,
  PixelSortOrder,
  IPrismRefractionEffectOptions,
  ICrystallizeEffectOptions,
  ISlitScanEffectOptions,
  SlitScanMode,
  IGranularErosionEffectOptions,
  ILiquidMercuryEffectOptions,
} from './lib/effects'

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
    const hasWireframe = emitterConfig?.behaviours?.some((b: any) => b.name === 'Wireframe3DBehaviour')
    const renderer = new Renderer({
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
    if (hasWireframe) {
      const graphics = new Graphics()
      const container = new Container() as any
      container.addChild(graphics)
      container.addChild(renderer)
      renderer.wireframeGraphics = graphics
      Object.defineProperty(container, 'emitter', { get: () => renderer.emitter })
      container.updateConfig = (c: any) => renderer.updateConfig(c)
      container.updatePosition = (p: any) => renderer.updatePosition(p)
      container.play = () => renderer.play()
      container.stop = () => renderer.stop()
      container.stopImmediately = () => renderer.stopImmediately()
      container.pause = (p?: boolean) => renderer.pause(p)
      container.resume = () => renderer.resume()
      container.start = () => renderer.start()
      container.setTickerSpeed = (s: number) => renderer.setTickerSpeed(s)
      container.updateTexture = () => renderer.updateTexture()
      const origDestroy = container.destroy.bind(container)
      container.destroy = () => {
        renderer.destroy()
        origDestroy()
      }
      return container
    }
    return renderer
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

export type { IBehaviour } from './lib/behaviour'
export {
  Behaviour,
  BehaviourRegistry,
  EmitterBehaviours,
  SpawnBehaviour,
  LifeBehaviour,
  PositionBehaviour,
  ColorBehaviour,
  SizeBehaviour,
  AngularVelocityBehaviour,
  EmitDirectionBehaviour,
  RotationBehaviour,
  TurbulenceBehaviour,
  CollisionBehaviour,
  AttractionRepulsionBehaviour,
  NoiseBasedMotionBehaviour,
  ForceFieldsBehaviour,
  TimelineBehaviour,
  GroupingBehaviour,
  SoundReactiveBehaviour,
  LightEffectBehaviour,
  StretchBehaviour,
  TemperatureBehaviour,
  MoveToPointBehaviour,
  Wireframe3DBehaviour,
  BehaviourNames,
} from './lib/behaviour'

// Re-export so demos can use one import (avoids loading Pixi twice)
export { Application, Assets } from 'pixi.js'

export {
  Renderer,
  customPixiParticles,
  _customPixiParticlesEditorOnly,
  ICustomPixiParticlesSettings,
  ShatterEffect,
  DissolveEffect,
  MagneticAssemblyEffect,
  GhostEffect,
  GlitchEffect,
  MeltEffect,
  PixelSortEffect,
  PrismRefractionEffect,
  CrystallizeEffect,
  SlitScanEffect,
  GranularErosionEffect,
  LiquidMercuryEffect,
}
