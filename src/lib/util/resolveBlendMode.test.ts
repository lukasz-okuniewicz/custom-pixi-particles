import { describe, expect, it } from 'vitest'
import { resolveBlendMode } from './resolveBlendMode'

describe('resolveBlendMode', () => {
  it('returns normal for null, undefined, empty string', () => {
    expect(resolveBlendMode(null)).toBe('normal')
    expect(resolveBlendMode(undefined)).toBe('normal')
    expect(resolveBlendMode('')).toBe('normal')
  })

  it('maps legacy numeric indices to v8 strings', () => {
    expect(resolveBlendMode(0)).toBe('normal')
    expect(resolveBlendMode(1)).toBe('add')
    expect(resolveBlendMode(3)).toBe('screen')
    expect(resolveBlendMode(20)).toBe('none')
  })

  it('floors non-integer numbers', () => {
    expect(resolveBlendMode(2.7)).toBe('multiply')
  })

  it('returns normal for out-of-range numeric', () => {
    expect(resolveBlendMode(-1)).toBe('normal')
    expect(resolveBlendMode(100)).toBe('normal')
    expect(resolveBlendMode(Number.NaN)).toBe('normal')
  })

  it('maps kebab-case strings', () => {
    expect(resolveBlendMode('color-dodge')).toBe('color-dodge')
    expect(resolveBlendMode('  SCREEN  ')).toBe('screen')
  })

  it('normalizes underscores to hyphens before lookup', () => {
    expect(resolveBlendMode('hard_light')).toBe('hard-light')
  })

  it('maps numeric strings to legacy blend names', () => {
    expect(resolveBlendMode('1')).toBe('add')
    expect(resolveBlendMode('3')).toBe('screen')
  })

  it('falls back to normal for unknown strings', () => {
    expect(resolveBlendMode('not-a-real-blend')).toBe('normal')
  })
})
