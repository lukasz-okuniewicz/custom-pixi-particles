import { describe, expect, it } from 'vitest'
import { BLEND_MODES } from 'pixi.js-legacy'
import { resolveBlendMode } from './resolveBlendMode'

describe('resolveBlendMode', () => {
  it('returns NORMAL for null, undefined, empty string', () => {
    expect(resolveBlendMode(null)).toBe(BLEND_MODES.NORMAL)
    expect(resolveBlendMode(undefined)).toBe(BLEND_MODES.NORMAL)
    expect(resolveBlendMode('')).toBe(BLEND_MODES.NORMAL)
  })

  it('passes through valid numeric codes', () => {
    expect(resolveBlendMode(BLEND_MODES.ADD)).toBe(BLEND_MODES.ADD)
    expect(resolveBlendMode(1)).toBe(1 as typeof BLEND_MODES.NORMAL)
  })

  it('floors non-integer numbers', () => {
    expect(resolveBlendMode(2.7)).toBe(2)
  })

  it('returns NORMAL for out-of-range numeric', () => {
    expect(resolveBlendMode(-1)).toBe(BLEND_MODES.NORMAL)
    expect(resolveBlendMode(100)).toBe(BLEND_MODES.NORMAL)
    expect(resolveBlendMode(Number.NaN)).toBe(BLEND_MODES.NORMAL)
  })

  it('maps kebab-case strings', () => {
    expect(resolveBlendMode('color-dodge')).toBe(BLEND_MODES.COLOR_DODGE)
    expect(resolveBlendMode('  SCREEN  ')).toBe(BLEND_MODES.SCREEN)
  })

  it('normalizes underscores to hyphens before lookup', () => {
    expect(resolveBlendMode('hard_light')).toBe(BLEND_MODES.HARD_LIGHT)
  })

  it('falls back to NORMAL for unknown strings', () => {
    expect(resolveBlendMode('not-a-real-blend')).toBe(BLEND_MODES.NORMAL)
  })
})
