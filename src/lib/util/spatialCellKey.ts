/**
 * Integer key for uniform spatial grid cells. Avoids allocating `${cx},${cy}` strings
 * on hot neighbor-query paths (reduces GC pressure under high particle counts).
 *
 * Uses a 32-bit mix of cell coordinates; collisions across non-adjacent cells are
 * astronomically unlikely at simulation scales.
 */
export function spatialCellKey(cx: number, cy: number): number {
  return (Math.imul(cx, 73856093) ^ Math.imul(cy, 19349663)) | 0
}
