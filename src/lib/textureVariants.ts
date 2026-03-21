import type Emitter from './emitter/Emitter'

/** One or more frame files: `{prefix}00.png`, `{prefix}01.png`, … */
export type TextureVariantFrames = {
  type: 'frames'
  prefix: string
  frameRate?: number
  loop?: boolean
  randomFrameStart?: boolean
  animatedSpriteZeroPad?: number
  animatedSpriteIndexToStart?: number
}

/** Pick a single texture at spawn from the list (full asset keys, e.g. `spark.png`). */
export type TextureVariantStaticRandom = {
  type: 'staticRandom'
  textures: string[]
}

export type TextureVariant = TextureVariantFrames | TextureVariantStaticRandom

function isAnimatedSpriteEnabled(emitter: Emitter): boolean {
  const a = emitter.animatedSprite as any
  if (!a) return false
  if (typeof a.enabled === 'boolean' && !a.enabled) return false
  return true
}

/**
 * Builds the effective variant list from emitter config. If `textureVariants` is absent or empty,
 * derives behavior from legacy `textures` + `animatedSprite` (same as pre–texture-variant behavior).
 */
export function resolveTextureVariants(textures: string[], emitter: Emitter): { variants: TextureVariant[]; weights: number[] } {
  const custom = emitter.textureVariants
  if (Array.isArray(custom) && custom.length > 0) {
    return {
      variants: custom as TextureVariant[],
      weights: normalizeVariantWeights(emitter.variantWeights, custom.length),
    }
  }

  if (!textures.length) {
    return { variants: [{ type: 'staticRandom', textures: [''] }], weights: [1] }
  }

  if (isAnimatedSpriteEnabled(emitter)) {
    const variants: TextureVariant[] = textures.map((prefix) => ({ type: 'frames', prefix }))
    return { variants, weights: normalizeVariantWeights(undefined, variants.length) }
  }

  return {
    variants: [{ type: 'staticRandom', textures: [...textures] }],
    weights: [1],
  }
}

export function normalizeVariantWeights(weights: number[] | undefined, count: number): number[] {
  if (count <= 0) return []
  if (!weights || weights.length === 0) {
    return Array(count).fill(1 / count)
  }
  const w = weights.slice(0, count)
  while (w.length < count) {
    w.push(1)
  }
  let sum = 0
  for (let i = 0; i < count; i++) {
    const v = Math.max(0, Number(w[i]) || 0)
    w[i] = v
    sum += v
  }
  if (sum <= 0) {
    return Array(count).fill(1 / count)
  }
  for (let i = 0; i < count; i++) {
    w[i] = w[i] / sum
  }
  return w
}

export function pickVariantIndex(weights: number[]): number {
  if (weights.length === 0) return 0
  const r = Math.random()
  let acc = 0
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i]
    if (r < acc || i === weights.length - 1) {
      return i
    }
  }
  return weights.length - 1
}
