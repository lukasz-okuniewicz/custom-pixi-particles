import { BLEND_MODES } from 'pixi.js-legacy'

/**
 * Pixi v7 WebGL state expects {@link BLEND_MODES} numbers. JSON / UI often uses
 * kebab-case strings (e.g. `"color-dodge"`). Invalid values fall back to NORMAL.
 */
export function resolveBlendMode(mode: unknown): BLEND_MODES {
  if (mode === null || mode === undefined || mode === '') {
    return BLEND_MODES.NORMAL
  }

  if (typeof mode === 'number' && Number.isFinite(mode)) {
    const n = Math.floor(mode)
    // BLEND_MODES in v7 runs ~0–29 (incl. XOR etc.)
    if (n >= 0 && n <= 29) {
      return n as BLEND_MODES
    }
    return BLEND_MODES.NORMAL
  }

  if (typeof mode === 'string') {
    const s = mode.trim().toLowerCase().replace(/_/g, '-')
    const table: Record<string, BLEND_MODES> = {
      normal: BLEND_MODES.NORMAL,
      'src-over': BLEND_MODES.NORMAL,
      'source-over': BLEND_MODES.NORMAL,
      add: BLEND_MODES.ADD,
      multiply: BLEND_MODES.MULTIPLY,
      screen: BLEND_MODES.SCREEN,
      overlay: BLEND_MODES.OVERLAY,
      darken: BLEND_MODES.DARKEN,
      lighten: BLEND_MODES.LIGHTEN,
      'color-dodge': BLEND_MODES.COLOR_DODGE,
      'color-burn': BLEND_MODES.COLOR_BURN,
      'hard-light': BLEND_MODES.HARD_LIGHT,
      'soft-light': BLEND_MODES.SOFT_LIGHT,
      difference: BLEND_MODES.DIFFERENCE,
      exclusion: BLEND_MODES.EXCLUSION,
      hue: BLEND_MODES.HUE,
      saturation: BLEND_MODES.SATURATION,
      color: BLEND_MODES.COLOR,
      luminosity: BLEND_MODES.LUMINOSITY,
      'normal-npm': BLEND_MODES.NORMAL_NPM,
      'add-npm': BLEND_MODES.ADD_NPM,
      'screen-npm': BLEND_MODES.SCREEN_NPM,
      none: BLEND_MODES.NONE,
    }
    const fromTable = table[s]
    if (fromTable !== undefined) {
      return fromTable
    }
    const enumKey = s.toUpperCase().replace(/-/g, '_')
    const fromEnum = (BLEND_MODES as unknown as Record<string, number>)[enumKey]
    if (typeof fromEnum === 'number') {
      return fromEnum as BLEND_MODES
    }
  }

  return BLEND_MODES.NORMAL
}
