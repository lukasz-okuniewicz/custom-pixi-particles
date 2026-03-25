import Renderer from './lib/pixi/Renderer'
import SpriteContainerRenderer from './lib/pixi/SpriteContainerRenderer'
import { ICustomPixiParticlesSettings } from './lib/customPixiParticlesSettingsInterface'
import TestRenderer from './lib/pixi/TestRenderer'
import { inferParticleContainerFeatures, preferSpriteParticlePathForTextures } from './lib/inferParticleContainerFeatures'
import {
  CrystallizeEffect,
  DissolveEffect,
  GhostEffect,
  GlitchEffect,
  GranularErosionEffect,
  LiquidMercuryEffect,
  MagneticAssemblyEffect,
  MetaballPass,
  MeltEffect,
  PixelSortEffect,
  PrismRefractionEffect,
  ShatterEffect,
  SlitScanEffect,
} from './lib/effects'
import { Container, extensions, Graphics } from 'pixi.js'

// Pixi applies the federated event mixin during events init; when this package creates
// containers earlier, isInteractive() can be missing. Guarded for Pixi v7/v8 API differences.
const maybeFederatedContainer = (globalThis as any).PIXI?.FederatedContainer
const maybeMixin = (extensions as any).mixin
if (typeof maybeMixin === 'function' && maybeFederatedContainer) {
  maybeMixin(Container, maybeFederatedContainer)
}

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
  IMetaballPassOptions,
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
      maxParticles = 10000,
      maxFPS = 60,
      minFPS = 30,
      tickerSpeed = 0.02,
      particleLinks,
      canvasSizeProvider,
    } = settings
    const texturesArr = Array.isArray(textures) ? textures : []
    const useSpritePath = preferSpriteParticlePathForTextures(texturesArr)
    const inferred = inferParticleContainerFeatures(emitterConfig)
    const vertices = settings.vertices ?? inferred.vertices
    const position = settings.position ?? inferred.position
    const rotation = settings.rotation ?? inferred.rotation
    const uvs = settings.uvs ?? inferred.uvs
    const tint = settings.tint ?? inferred.tint
    const RendererCtor = useSpritePath ? SpriteContainerRenderer : Renderer
    const renderer = new RendererCtor({
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
      particleLinks,
      canvasSizeProvider,
    })
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
      maxParticles = 10000,
      maxFPS = 60,
      minFPS = 60,
      tickerSpeed = 0.02,
      particleLinks,
      canvasSizeProvider,
    } = settings
    const inferred = inferParticleContainerFeatures(emitterConfig)
    const vertices = settings.vertices ?? inferred.vertices
    const position = settings.position ?? inferred.position
    const rotation = settings.rotation ?? inferred.rotation
    const uvs = settings.uvs ?? inferred.uvs
    const tint = settings.tint ?? inferred.tint
    return new TestRenderer({
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
      particleLinks,
      canvasSizeProvider,
    })
  },
}

export type { TextureVariant, TextureVariantFrames, TextureVariantStaticRandom } from './lib/textureVariants'
export type { IParticleLinkSettings } from './lib/pixi/particleLinkLayer'
export {
  drawParticleLinks,
  mergeParticleLinkSettings,
  PARTICLE_LINK_DEFAULTS,
} from './lib/pixi/particleLinkLayer'
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
  FormPatternBehaviour,
  type FormPatternMode,
  type FormPatternProgressMode,
  type FormPatternAssignmentMode,
  type FormPatternBakedPolylineMode,
  type FormPatternPathKind,
  type FormPatternSinePhaseMode,
  type FormPatternStaggerOrder,
  type FormPatternPathVarietySeedMode,
  type FormPatternVisualModulation,
  ToroidalWrapBehaviour,
  BehaviourNames,
} from './lib/behaviour'

export {
  rasterizeTextToPoints,
  buildPresetShape,
  matchPointsToCount,
  resampleToCount,
  flattenSvgPathToPoints,
  assignGreedyNearest,
  assignByPolarAngle,
  assignHungarian,
  hungarianMinAssignment,
  assignHungarianTargetIndices,
  assignGreedyNearestTargetIndices,
  assignByPolarAngleTargetIndices,
  sortTargetIndicesByAngle,
  blendMorphedPresets,
  rasterizeOpaquePixelsToPoints,
  rasterizeOpaquePixelsToPointsWithColors,
  matchSamplesToCount,
  sortPointsByAngle,
  shuffledIndices,
  seededUnit,
  extractSvgPathDFromMarkup,
  parseSvgViewBox,
  normalizePointsToBounds,
  replicatePointsByWeights,
  sampleMorphKeyframes,
  assignPathOrderTargetIndices,
  rasterizeOpaquePixelsToPointsWeighted,
  rasterizeOpaquePixelsToPointsWithColorsWeighted,
} from './lib/util/formPatternSampling'
export type {
  PresetShapeType,
  PresetShapeParams,
  TextRasterMode,
  RasterizeTextOptions,
  PointRgb,
  MorphKeyframe,
  IParticleXYWithUid,
} from './lib/util/formPatternSampling'

export { PersistentFillEmission } from './lib/emission'
export { PersistentWrapEmitter } from './lib/emitter'

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
  MetaballPass,
}
