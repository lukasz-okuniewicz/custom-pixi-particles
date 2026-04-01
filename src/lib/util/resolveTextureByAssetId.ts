import { Assets, Texture } from 'pixi.js'

/**
 * Resolve a texture by asset id without Pixi console warnings when the id exists only
 * in Texture cache (e.g. user uploads restored from draft) but not in Assets cache.
 * Prefer Assets when present; otherwise delegate to Texture.from (Loader / Texture cache).
 */
export function resolveTextureByAssetId(assetId: string): Texture {
  if (Assets.cache.has(assetId)) {
    return Assets.get(assetId) as Texture
  }
  return Texture.from(assetId)
}
