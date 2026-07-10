import { wrapToroidalAxis } from './toroidalWrapExtents'

export type ToroidalWrapFadePhase = 'idle' | 'out' | 'in'

/** Converts engine deltaTime to seconds (handles frame-style deltas). */
export function toroidalFadeDelta(deltaTime: number, fadeDuration: number): number {
  if (fadeDuration <= 0) return 1
  const dtSec = deltaTime >= 1 ? deltaTime / 60 : deltaTime
  return dtSec / fadeDuration
}

/**
 * True when a particle is close enough to exit that a fade should start before teleport.
 * Uses axis velocity (units per second) to estimate distance travelled during fadeDuration.
 */
export function shouldStartToroidalFadeOnAxis(
  position: number,
  axisVelocity: number,
  min: number,
  max: number,
  leadingExtent: number,
  trailingExtent: number,
  wasInside: boolean | undefined,
  fadeDuration: number,
): boolean {
  const wrapResult = wrapToroidalAxis(position, 0, min, max, leadingExtent, trailingExtent, wasInside)
  if (wrapResult.didWrap) return true

  const fadeLead = Math.max(
    Math.abs(axisVelocity) * fadeDuration,
    (leadingExtent + trailingExtent) * 0.25,
  )
  if (fadeLead <= 0) return false

  const inside = position + trailingExtent >= min && position - leadingExtent <= max
  if (!inside) return false

  if (axisVelocity > 0) {
    const dist = max - (position - leadingExtent)
    if (dist >= 0 && dist <= fadeLead) return true
  }
  if (axisVelocity < 0) {
    const dist = position + trailingExtent - min
    if (dist >= 0 && dist <= fadeLead) return true
  }
  return false
}
