import { describe, expect, it } from 'vitest'
import {
  inferParticleContainerFeatures,
  preferSpriteParticlePathForTextures,
} from './inferParticleContainerFeatures'

describe('inferParticleContainerFeatures', () => {
  it('disables uvs for static-only texture config', () => {
    const f = inferParticleContainerFeatures({
      behaviours: [],
      textures: ['a.png'],
    })
    expect(f.uvs).toBe(false)
    expect(f.position).toBe(true)
    expect(f.rotation).toBe(false)
    expect(f.tint).toBe(false)
  })

  it('enables uvs when textureVariants includes frames', () => {
    const f = inferParticleContainerFeatures({
      textureVariants: [{ type: 'frames', prefix: 'f_' }],
    })
    expect(f.uvs).toBe(true)
  })

  it('enables uvs for legacy animatedSprite object', () => {
    const f = inferParticleContainerFeatures({
      animatedSprite: { loop: true, frameRate: 0.25 },
    })
    expect(f.uvs).toBe(true)
  })

  it('enables rotation when RotationBehaviour is enabled', () => {
    const f = inferParticleContainerFeatures({
      behaviours: [{ name: 'RotationBehaviour', enabled: true, priority: 0 }],
    })
    expect(f.rotation).toBe(true)
  })

  it('disables rotation when only LifeBehaviour is present', () => {
    const f = inferParticleContainerFeatures({
      behaviours: [{ name: 'LifeBehaviour', enabled: true, priority: 0 }],
    })
    expect(f.rotation).toBe(false)
  })

  it('enables tint when ColorBehaviour is enabled', () => {
    const f = inferParticleContainerFeatures({
      behaviours: [{ name: 'ColorBehaviour', enabled: true, priority: 0 }],
    })
    expect(f.tint).toBe(true)
  })

  it('ignores disabled behaviours for rotation and tint', () => {
    const f = inferParticleContainerFeatures({
      behaviours: [
        { name: 'RotationBehaviour', enabled: false, priority: 0 },
        { name: 'ColorBehaviour', enabled: false, priority: 0 },
      ],
    })
    expect(f.rotation).toBe(false)
    expect(f.tint).toBe(false)
  })
})

describe('preferSpriteParticlePathForTextures', () => {
  it('is false for 0–1 texture paths', () => {
    expect(preferSpriteParticlePathForTextures(undefined)).toBe(false)
    expect(preferSpriteParticlePathForTextures([])).toBe(false)
    expect(preferSpriteParticlePathForTextures(['a.png'])).toBe(false)
  })

  it('is true when multiple texture files are listed', () => {
    expect(preferSpriteParticlePathForTextures(['a.png', 'b.png'])).toBe(true)
  })
})
