import { Assets, Texture } from 'pixi.js'

/**
 * Resolve a texture by asset id. Pixi v8: `Texture.from(string)` only performs a cache
 * lookup and logs when missing — never use that as a fallback here.
 */
export function resolveTextureByAssetId(assetId: string): Texture {
  if (Assets.cache.has(assetId)) {
    return Assets.get(assetId) as Texture
  }
  return Texture.WHITE
}
