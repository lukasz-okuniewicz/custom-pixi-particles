/**
 * Normalize blendMode for Pixi v8 (string values). Legacy configs may use v6/v7 numeric blend indices.
 */
const LEGACY_INDEX_TO_V8: Record<number, string> = {
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
  17: 'normal',
  18: 'add',
  19: 'screen',
  20: 'none',
}

const NAME_TABLE: Record<string, string> = {
  normal: 'normal',
  'src-over': 'normal',
  'source-over': 'normal',
  add: 'add',
  multiply: 'multiply',
  screen: 'screen',
  overlay: 'overlay',
  darken: 'darken',
  lighten: 'lighten',
  'color-dodge': 'color-dodge',
  'color-burn': 'color-burn',
  'hard-light': 'hard-light',
  'soft-light': 'soft-light',
  difference: 'difference',
  exclusion: 'exclusion',
  hue: 'hue',
  saturation: 'saturation',
  color: 'color',
  luminosity: 'luminosity',
  'normal-npm': 'normal-npm',
  'add-npm': 'add-npm',
  'screen-npm': 'screen-npm',
  none: 'none',
}

export function resolveBlendMode(val: unknown): string {
  if (val == null || val === '') return 'normal'

  if (typeof val === 'number' && Number.isFinite(val)) {
    const n = Math.floor(val)
    if (LEGACY_INDEX_TO_V8[n] != null) return LEGACY_INDEX_TO_V8[n]
    return 'normal'
  }

  if (typeof val === 'string') {
    const t = val.trim()
    if (/^\d+$/.test(t)) {
      const n = parseInt(t, 10)
      if (Number.isFinite(n) && LEGACY_INDEX_TO_V8[n] != null) {
        return LEGACY_INDEX_TO_V8[n]
      }
      return 'normal'
    }
    const s = t.toLowerCase().replace(/_/g, '-')
    const fromTable = NAME_TABLE[s]
    if (fromTable !== undefined) return fromTable
  }

  return 'normal'
}
