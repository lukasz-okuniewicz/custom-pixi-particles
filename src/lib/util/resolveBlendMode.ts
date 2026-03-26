/**
 * Normalize blendMode for Pixi v8 (string values). Legacy configs may use v6/v7 numeric BLEND_MODES.
 */
const LEGACY_BLEND_TO_V8: Record<number, string> = {
  0: 'normal',
  1: 'add',
  2: 'multiply',
  3: 'screen',
  4: 'overlay',
  5: 'darken',
  6: 'lighten',
  7: 'color-dodge',
  8: 'color-burn',
  9: 'hard-light',
  10: 'soft-light',
  11: 'difference',
  12: 'exclusion',
  13: 'none',
}

export function resolveBlendMode(val: unknown): string {
  if (val == null || val === '') return 'normal'
  if (typeof val === 'string') return val
  if (typeof val === 'number' && LEGACY_BLEND_TO_V8[val] != null) {
    return LEGACY_BLEND_TO_V8[val]
  }
  return 'normal'
}
