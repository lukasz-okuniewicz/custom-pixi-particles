import type Particle from '../Particle'
import type ToroidalWrapBehaviour from '../behaviour/ToroidalWrapBehaviour'
import type Model from '../Model'
import {
  getToroidalEdgeExtents,
  isToroidalViewportVisible,
  resolveToroidalBounds,
} from './toroidalWrapExtents'

/** Whether the particle sprite should be drawn for toroidal wrap (hidden while fully off-screen). */
export function isToroidalParticleVisible(
  particle: Particle,
  wrap: ToroidalWrapBehaviour | null | undefined,
  model: Model,
): boolean {
  if (!wrap?.enabled) return true

  const bounds = resolveToroidalBounds(wrap, model.toroidalCanvasBounds)
  if (!bounds) return true

  const extents = getToroidalEdgeExtents(particle)
  return isToroidalViewportVisible(
    particle.x,
    particle.y,
    extents,
    bounds,
    wrap.wrapX,
    wrap.wrapY,
  )
}

export type ToroidalSpriteDisplay = {
  visible: boolean
  alphaMultiplier: number
}

/** Resolves sprite visibility and alpha multiplier for toroidal wrap (including optional fade). */
export function getToroidalSpriteDisplay(
  particle: Particle,
  wrap: ToroidalWrapBehaviour | null | undefined,
  model: Model,
): ToroidalSpriteDisplay {
  const viewportVisible = isToroidalParticleVisible(particle, wrap, model)
  if (!wrap?.enabled || !wrap.wrapFadeEnabled) {
    return { visible: viewportVisible, alphaMultiplier: 1 }
  }

  const fadePhase = wrap.getWrapFadePhase(particle)
  const fadeMultiplier = wrap.getWrapFadeMultiplier(particle)

  if (fadePhase === 'idle') {
    return { visible: viewportVisible, alphaMultiplier: 1 }
  }

  if (fadePhase === 'out') {
    return {
      visible: viewportVisible,
      alphaMultiplier: viewportVisible ? fadeMultiplier : 1,
    }
  }

  // Fade-in only draws once the particle overlaps the viewport again.
  return {
    visible: viewportVisible,
    alphaMultiplier: viewportVisible ? fadeMultiplier : 1,
  }
}
