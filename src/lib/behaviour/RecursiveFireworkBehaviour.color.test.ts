import { describe, expect, it } from 'vitest'
import RecursiveFireworkBehaviour from './RecursiveFireworkBehaviour'
import Model from '../Model'

function palette(
  b: RecursiveFireworkBehaviour,
  rgb: { r: number; g: number; b: number },
  lifeProgress: number,
  depth: number,
  phase: 'comet' | 'spark',
) {
  return (b as any).applyPaletteAnimation(rgb, lifeProgress, depth, phase) as { r: number; g: number; b: number }
}

describe('RecursiveFireworkBehaviour color pipeline', () => {
  it('stacks hueDrift with warmToCool on sparks', () => {
    const b = new RecursiveFireworkBehaviour()
    b.paletteAnimationMode = 'hueDrift'
    b.paletteDriftDegrees = 90
    b.colorProgramMode = 'warmToCool'
    b.explosionColors = [{ r: 200, g: 100, b: 100 }]
    const out = palette(b, { r: 200, g: 100, b: 100 }, 0.5, 0, 'spark')
    expect(out.r).toBeGreaterThanOrEqual(0)
    expect(out.r).toBeLessThanOrEqual(255)
  })

  it('applies lifeDesaturate toward gray by end of life', () => {
    const b = new RecursiveFireworkBehaviour()
    b.paletteAnimationMode = 'none'
    b.colorProgramMode = 'lifeDesaturate'
    const start = palette(b, { r: 255, g: 40, b: 40 }, 0, 0, 'spark')
    const end = palette(b, { r: 255, g: 40, b: 40 }, 1, 0, 'spark')
    const gStart = (start.r + start.g + start.b) / 3
    const gEnd = (end.r + end.g + end.b) / 3
    expect(Math.abs(end.r - gEnd)).toBeLessThan(Math.abs(start.r - gStart))
  })

  it('shifts comet vs spark when roleColorTint is coolCometWarmSpark', () => {
    const b = new RecursiveFireworkBehaviour()
    b.paletteAnimationMode = 'none'
    b.colorProgramMode = 'none'
    b.roleColorTint = 'coolCometWarmSpark'
    const base = { r: 200, g: 120, b: 100 }
    const comet = palette(b, { ...base }, 0, 0, 'comet')
    const spark = palette(b, { ...base }, 0, 0, 'spark')
    expect(comet.r).not.toBe(spark.r)
  })

  it('keeps reactive input zeroed when source does not match', () => {
    const b = new RecursiveFireworkBehaviour()
    const model = new Model()
    model.reactiveSignals.energy = 0.95
    model.reactiveSignals.source = 'soundReactive'
    b.reactiveSource = 'pulse'
    const out = (b as any).readReactiveInput(model)
    expect(out.energy).toBe(0)
    expect(out.beat).toBe(0)
  })

  it('smooths reactive energy when source matches', () => {
    const b = new RecursiveFireworkBehaviour()
    const model = new Model()
    model.reactiveSignals.energy = 0.8
    model.reactiveSignals.source = 'soundReactive'
    b.reactiveSource = 'auto'
    b.reactiveSmoothing = 0.5
    const out = (b as any).readReactiveInput(model)
    expect(out.energy).toBeGreaterThan(0)
    expect(out.energy).toBeLessThanOrEqual(0.8)
  })

  it('plays back recorded reactive trace values', () => {
    const b = new RecursiveFireworkBehaviour()
    const model = new Model()
    model.reactiveSignals.source = 'soundReactive'
    b.reactiveSource = 'auto'
    b.reactiveTraceMode = 'playback'
    b.reactiveTraceValues = [0.1, 0.6]
    const first = (b as any).readReactiveInput(model)
    const second = (b as any).readReactiveInput(model)
    expect(first.energy).toBeGreaterThan(0)
    expect(second.energy).toBeGreaterThan(first.energy)
  })

  it('keeps hysteresis gate stable around threshold', () => {
    const b = new RecursiveFireworkBehaviour()
    const model = new Model()
    model.reactiveSignals.source = 'soundReactive'
    b.reactiveSource = 'auto'
    b.reactiveThreshold = 0.2
    b.reactiveThresholdOn = 0.6
    b.reactiveThresholdOff = 0.3
    b.reactiveAttack = 1
    b.reactiveRelease = 1

    model.reactiveSignals.energy = 0.7
    const on = (b as any).readReactiveInput(model)
    model.reactiveSignals.energy = 0.45
    const stillOn = (b as any).readReactiveInput(model)
    model.reactiveSignals.energy = 0.2
    const off = (b as any).readReactiveInput(model)
    expect(on.beat).toBe(1)
    expect(stillOn.beat).toBe(1)
    expect(off.beat).toBe(0)
  })

  it('reactiveV2 matrix evaluates deterministically for palette hue', () => {
    const b = new RecursiveFireworkBehaviour()
    const model = new Model()
    model.reactiveSignals.source = 'soundReactive'
    model.reactiveSignals.energy = 1
    model.reactiveSignals.onset = 1
    b.reactiveSource = 'auto'
    b.reactiveInfluence = 1
    b.reactiveV2 = {
      enabled: true,
      debug: true,
      gain: 1,
      limiter: { knee: 0.2, ratio: 3, ceiling: 1 },
      matrix: [{ source: 'onset', target: 'paletteHueAddDeg', amount: 1, curve: 'linear' }],
    } as any

    const reactive = (b as any).readReactiveInput(model)
    const v2 = (b as any).evalReactiveV2(reactive, { depth: 0 } as any)
    expect(v2.paletteHueAddDeg).toBeGreaterThan(0)
  })

  it('damps reactive energy under pressure when safety damping enabled', () => {
    const b = new RecursiveFireworkBehaviour()
    const model = new Model()
    model.reactiveSignals.source = 'soundReactive'
    model.reactiveSignals.energy = 1
    b.reactiveSource = 'auto'
    b.reactiveAttack = 1
    b.reactiveRelease = 1
    b.reactiveSafetyDamping = 0.8
    b.maxTotalSpawnBudget = 100
    ;(b as any).latestEmitter = { list: { length: 95 } }
    const out = (b as any).readReactiveInput(model)
    expect(out.energy).toBeLessThan(1)
  })

  it('recursion planner governor reduces output with high pressure', () => {
    const b = new RecursiveFireworkBehaviour()
    b.recursionPlannerStrength = 1
    b.maxTotalSpawnBudget = 100
    b.maxTotalChildrenPerShot = 100
    b.maxSpawnPerSecond = 100
    ;(b as any).spawnedThisShot = 90
    ;(b as any).spawnedThisSecond = 90
    const gov = (b as any).getRecursionPlannerGovernor({ list: { length: 95 } }, 3)
    expect(gov).toBeLessThan(0.5)
  })
})
