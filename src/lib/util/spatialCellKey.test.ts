import { describe, expect, it } from 'vitest'
import { spatialCellKey } from './spatialCellKey'

describe('spatialCellKey', () => {
  it('is stable for the same cell coordinates', () => {
    expect(spatialCellKey(3, -7)).toBe(spatialCellKey(3, -7))
  })

  it('usually differs for adjacent cells', () => {
    const a = spatialCellKey(0, 0)
    expect(spatialCellKey(1, 0)).not.toBe(a)
    expect(spatialCellKey(0, 1)).not.toBe(a)
  })

  it('is stable for negative cell coordinates', () => {
    expect(spatialCellKey(-100, 42)).toBe(spatialCellKey(-100, 42))
  })
})
