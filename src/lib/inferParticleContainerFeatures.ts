/**
 * Derives conservative ParticleContainer feature flags from emitter JSON so static systems
 * can avoid uploading per-particle data when the config does not need it.
 *
 * **vertices:** Always inferred `true` here. Pixi v5 `ParticleContainer` uses per-particle
 * vertex data for quad geometry; turning this off is only safe if your Pixi version and usage
 * treat particles as point sprites without custom billboard verts — validate in target builds
 * before overriding `vertices` in {@link ICustomPixiParticlesSettings}.
 *
 * **position / rotation / tint / uvs:** Inferred from `emitterConfig.behaviours` and texture
 * config; callers may override any flag via `customPixiParticles.create({ ... })`.
 */

const ROTATION_AFFECTING_BEHAVIOUR_NAMES = new Set([
  'RotationBehaviour',
  'AngularVelocityBehaviour',
  'StretchBehaviour',
  'WobbleBehaviour',
  'SoundReactiveBehaviour',
  'TimelineBehaviour',
  'BezierFlowTubeBehaviour',
])

const TINT_AFFECTING_BEHAVIOUR_NAMES = new Set([
  'ColorBehaviour',
  'ColorCycleBehaviour',
  'LightEffectBehaviour',
  'TemperatureBehaviour',
  'SoundReactiveBehaviour',
  'FlickerBehaviour',
  'FormPatternBehaviour',
  'RecursiveFireworkBehaviour',
  'PhaseCoherenceBehaviour',
  'ProximityStateBehaviour',
  'DamageFlashRippleBehaviour',
  'ConversionCascadeBehaviour',
])

function isBehaviourEnabled(entry: any): boolean {
  return entry != null && entry.enabled !== false
}

function iterEnabledBehaviourNames(emitterConfig: any): string[] {
  const arr = emitterConfig?.behaviours
  if (!Array.isArray(arr)) return []
  const names: string[] = []
  for (let i = 0; i < arr.length; i++) {
    const b = arr[i]
    if (isBehaviourEnabled(b) && typeof b.name === 'string') {
      names.push(b.name)
    }
  }
  return names
}

function inferNeedsRotation(emitterConfig: any): boolean {
  const names = iterEnabledBehaviourNames(emitterConfig)
  for (let i = 0; i < names.length; i++) {
    if (ROTATION_AFFECTING_BEHAVIOUR_NAMES.has(names[i])) return true
  }
  return false
}

function inferNeedsTint(emitterConfig: any): boolean {
  const names = iterEnabledBehaviourNames(emitterConfig)
  for (let i = 0; i < names.length; i++) {
    if (TINT_AFFECTING_BEHAVIOUR_NAMES.has(names[i])) return true
  }
  return false
}

export function inferParticleContainerFeatures(emitterConfig: any): {
  vertices: boolean
  position: boolean
  rotation: boolean
  uvs: boolean
  tint: boolean
} {
  return {
    vertices: true,
    position: true,
    rotation: inferNeedsRotation(emitterConfig),
    tint: inferNeedsTint(emitterConfig),
    uvs: inferNeedsUvs(emitterConfig),
  }
}

/**
 * {@link PIXI.ParticleContainer} / `ParticleRenderer` uploads one `baseTexture` for the entire batch
 * (`children[0]._texture.baseTexture`). Emitters that randomly pick from **multiple unrelated image files**
 * (different base textures) will sample the wrong atlas — often read as incorrect scale/size and can
 * worsen as child order changes. Those presets need a regular `Container` + `Sprite` render path.
 */
export function preferSpriteParticlePathForTextures(textures: string[] | undefined): boolean {
  return Array.isArray(textures) && textures.length > 1
}

function inferNeedsUvs(emitterConfig: any): boolean {
  const variants = emitterConfig?.textureVariants
  if (Array.isArray(variants)) {
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i]
      if (v && v.type === 'frames') return true
    }
  }
  const anim = emitterConfig?.animatedSprite
  if (anim === true) return true
  if (anim && typeof anim === 'object' && anim.enabled !== false) return true
  return false
}
