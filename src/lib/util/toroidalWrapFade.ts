import { wrapToroidalAxis } from './toroidalWrapExtents'

export type ToroidalWrapFadePhase = 'idle' | 'out' | 'in'

/** Converts engine deltaTime to seconds (handles frame-style deltas). */
export function toroidalFadeDelta(deltaTime: number, fadeDuration: number): number {
  if (fadeDuration <= 0) return 1
  const dtSec = deltaTime >= 1 ? deltaTime / 60 : deltaTime
  return dtSec / fadeDuration
}

/** Distance from position to the exit boundary along positive velocity (max side). */
function distToMaxExit(position: number, leadingExtent: number, max: number): number {
  return max - (position - leadingExtent)
}

/** Distance from position to the exit boundary along negative velocity (min side). */
function distToMinExit(position: number, trailingExtent: number, min: number): number {
  return position + trailingExtent - min
}

/**
 * Lead distance for starting a pre-wrap fade. Capped to half the axis span so high
 * velocities (e.g. noise) do not trigger fade across an entire small wrap band.
 */
export function getToroidalFadeLead(
  axisVelocity: number,
  fadeDuration: number,
  leadingExtent: number,
  trailingExtent: number,
  min: number,
  max: number,
): number {
  const axisSpan = Math.max(0, max - min)
  const velocityLead = Math.abs(axisVelocity) * fadeDuration
  const extentLead = (leadingExtent + trailingExtent) * 0.25
  const spanCap = axisSpan > 0 ? axisSpan * 0.5 : 0
  const minLead = axisSpan > 0 ? Math.min(extentLead, axisSpan * 0.15) : extentLead
  return Math.min(Math.max(velocityLead, minLead), spanCap)
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
  // Only fade before wrap when exiting from inside — not for spawn-outside instant wrap.
  if (wrapResult.didWrap) return wasInside === true

  const fadeLead = getToroidalFadeLead(
    axisVelocity,
    fadeDuration,
    leadingExtent,
    trailingExtent,
    min,
    max,
  )
  if (fadeLead <= 0) return false

  const inside = position + trailingExtent >= min && position - leadingExtent <= max
  if (!inside) return false

  if (axisVelocity > 0) {
    const dist = distToMaxExit(position, leadingExtent, max)
    if (dist >= 0 && dist <= fadeLead) return true
  }
  if (axisVelocity < 0) {
    const dist = distToMinExit(position, trailingExtent, min)
    if (dist >= 0 && dist <= fadeLead) return true
  }
  return false
}

/** True while a fade-out should continue (particle still approaching an exit on this axis). */
export function shouldContinueToroidalFadeOnAxis(
  position: number,
  axisVelocity: number,
  min: number,
  max: number,
  leadingExtent: number,
  trailingExtent: number,
  fadeDuration: number,
): boolean {
  return shouldStartToroidalFadeOnAxis(
    position,
    axisVelocity,
    min,
    max,
    leadingExtent,
    trailingExtent,
    true,
    fadeDuration,
  )
}
