import type Particle from '../Particle'

export type ToroidalEdgeExtents = {
  left: number
  right: number
  top: number
  bottom: number
}

/**
 * Axis-aligned edge offsets from particle center to sprite bounds.
 * Falls back to scaled size when no sprite/texture is available yet.
 */
export function getToroidalEdgeExtents(particle: Particle): ToroidalEdgeExtents {
  const sprite = particle.sprite
  const texture = sprite?.texture
  if (sprite && texture) {
    const scaleX = Math.abs(sprite.scale.x)
    const scaleY = Math.abs(sprite.scale.y)
    const width = texture.width * scaleX
    const height = texture.height * scaleY
    const anchorX = sprite.anchor?.x ?? 0.5
    const anchorY = sprite.anchor?.y ?? 0.5
    const rotation = sprite.rotation ?? particle.rotation ?? 0
    const cos = Math.abs(Math.cos(rotation))
    const sin = Math.abs(Math.sin(rotation))
    const halfW = (width * cos + height * sin) / 2
    const halfH = (width * sin + height * cos) / 2
    const centerOffsetX = width * (0.5 - anchorX) * cos - height * (0.5 - anchorY) * sin
    const centerOffsetY = width * (0.5 - anchorX) * sin + height * (0.5 - anchorY) * cos

    return {
      left: halfW - centerOffsetX,
      right: halfW + centerOffsetX,
      top: halfH - centerOffsetY,
      bottom: halfH + centerOffsetY,
    }
  }

  const fallback = Math.max(Math.abs(particle.size.x), Math.abs(particle.size.y)) * 0.5
  return { left: fallback, right: fallback, top: fallback, bottom: fallback }
}

export type ToroidalAxisWrapResult = {
  position: number
  movement: number
}

/**
 * Wraps one axis only after the particle is fully outside the bounds,
 * placing it fully outside on the opposite side to avoid visible jumps.
 * Velocity sign prevents re-wrapping when the particle is entering from off-screen.
 */
export function wrapToroidalAxis(
  position: number,
  movement: number,
  min: number,
  max: number,
  leadingExtent: number,
  trailingExtent: number,
  axisVelocity: number,
): ToroidalAxisWrapResult {
  let pos = position
  let mov = movement

  while (pos + trailingExtent < min && axisVelocity < 0) {
    const overflow = min - pos - trailingExtent
    const next = max + leadingExtent + overflow
    mov += next - pos
    pos = next
  }

  while (pos - leadingExtent > max && axisVelocity > 0) {
    const overflow = pos - leadingExtent - max
    const next = min - trailingExtent - overflow
    mov += next - pos
    pos = next
  }

  return { position: pos, movement: mov }
}
