import type Particle from '../Particle'

export type ToroidalEdgeExtents = {
  left: number
  right: number
  top: number
  bottom: number
}

export type ToroidalResolvedBounds = {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export type ToroidalBoundsConfig = {
  useCanvasBounds: boolean
  minX: number
  maxX: number
  minY: number
  maxY: number
  inset: number
}

/** Factory defaults for manual bounds — used to auto-match canvas when unchanged. */
export const TOROIDAL_DEFAULT_MIN_X = -400
export const TOROIDAL_DEFAULT_MAX_X = 400
export const TOROIDAL_DEFAULT_MIN_Y = -300
export const TOROIDAL_DEFAULT_MAX_Y = 300

export function usesDefaultToroidalManualBounds(config: ToroidalBoundsConfig): boolean {
  return (
    config.minX === TOROIDAL_DEFAULT_MIN_X &&
    config.maxX === TOROIDAL_DEFAULT_MAX_X &&
    config.minY === TOROIDAL_DEFAULT_MIN_Y &&
    config.maxY === TOROIDAL_DEFAULT_MAX_Y
  )
}

export function resolveToroidalBounds(
  config: ToroidalBoundsConfig,
  canvasBounds: ToroidalResolvedBounds | null,
): ToroidalResolvedBounds | null {
  let base: ToroidalResolvedBounds
  if (config.useCanvasBounds && canvasBounds) {
    base = canvasBounds
  } else if (!config.useCanvasBounds && canvasBounds && usesDefaultToroidalManualBounds(config)) {
    base = canvasBounds
  } else {
    base = { minX: config.minX, maxX: config.maxX, minY: config.minY, maxY: config.maxY }
  }

  const minX = Math.min(base.minX, base.maxX) + config.inset
  const maxX = Math.max(base.minX, base.maxX) - config.inset
  const minY = Math.min(base.minY, base.maxY) + config.inset
  const maxY = Math.max(base.minY, base.maxY) - config.inset

  if (maxX <= minX || maxY <= minY) return null
  return { minX, maxX, minY, maxY }
}

/**
 * Axis-aligned edge offsets from particle center to sprite bounds.
 * Falls back to scaled size when no sprite/texture is available yet.
 */
export function getToroidalEdgeExtents(particle: Particle): ToroidalEdgeExtents {
  const sprite = particle.sprite
  const texture = sprite?.texture
  if (sprite && texture) {
    const width = Math.abs(sprite.width) || Math.abs(texture.width * sprite.scale.x)
    const height = Math.abs(sprite.height) || Math.abs(texture.height * sprite.scale.y)
    if (width > 0 && height > 0) {
      const anchorX = sprite.anchor?.x ?? 0.5
      const anchorY = sprite.anchor?.y ?? 0.5
      const rotation = sprite.rotation ?? particle.rotation ?? 0
      const cos = Math.cos(rotation)
      const sin = Math.sin(rotation)

      const corners: [number, number][] = [
        [-anchorX * width, -anchorY * height],
        [(1 - anchorX) * width, -anchorY * height],
        [(1 - anchorX) * width, (1 - anchorY) * height],
        [-anchorX * width, (1 - anchorY) * height],
      ]

      let left = 0
      let right = 0
      let top = 0
      let bottom = 0
      for (const [lx, ly] of corners) {
        const rx = lx * cos - ly * sin
        const ry = lx * sin + ly * cos
        left = Math.max(left, -rx)
        right = Math.max(right, rx)
        top = Math.max(top, -ry)
        bottom = Math.max(bottom, ry)
      }

      return { left, right, top, bottom }
    }
  }

  const fallback = Math.max(Math.abs(particle.size.x), Math.abs(particle.size.y)) * 16
  return { left: fallback, right: fallback, top: fallback, bottom: fallback }
}

/** True when any part of the particle overlaps the wrap viewport. */
export function isToroidalViewportVisible(
  x: number,
  y: number,
  extents: ToroidalEdgeExtents,
  bounds: ToroidalResolvedBounds,
  wrapX: boolean,
  wrapY: boolean,
): boolean {
  const bboxLeft = x - extents.left
  const bboxRight = x + extents.right
  const bboxTop = y - extents.top
  const bboxBottom = y + extents.bottom

  const visibleX = !wrapX || (bboxRight >= bounds.minX && bboxLeft <= bounds.maxX)
  const visibleY = !wrapY || (bboxBottom >= bounds.minY && bboxTop <= bounds.maxY)
  return visibleX && visibleY
}

export type ToroidalAxisWrapResult = {
  position: number
  movement: number
  inside: boolean
  didWrap: boolean
}

/**
 * Wraps one axis only when a particle transitions from inside to fully outside,
 * placing it fully outside on the opposite side to avoid visible jumps.
 */
export function wrapToroidalAxis(
  position: number,
  movement: number,
  min: number,
  max: number,
  leadingExtent: number,
  trailingExtent: number,
  wasInside: boolean | undefined,
): ToroidalAxisWrapResult {
  const fullyOutsideMin = position + trailingExtent < min
  const fullyOutsideMax = position - leadingExtent > max

  let pos = position
  let mov = movement
  let didWrap = false
  const canExit = wasInside !== false

  if (canExit && fullyOutsideMin) {
    const overflow = min - pos - trailingExtent
    const next = max + leadingExtent + overflow
    mov += next - pos
    pos = next
    didWrap = true
  } else if (canExit && fullyOutsideMax) {
    const overflow = pos - leadingExtent - max
    const next = min - trailingExtent - overflow
    mov += next - pos
    pos = next
    didWrap = true
  }

  const inside = pos + trailingExtent >= min && pos - leadingExtent <= max
  return { position: pos, movement: mov, inside, didWrap }
}
