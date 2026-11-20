/**
 * Tile positions that go in the left column of the two-column mosaic, repeating every six tiles.
 * Tiles have different heights, so the original storefront stacks them in two independent columns:
 * left = tiles 1, 4, 5 and right = tiles 2, 3, 6 (1-based), which keeps the columns about equally tall.
 */
const LEFT_COLUMN_POSITIONS = new Set([0, 3, 4])
const PATTERN_LENGTH = 6

export type ColumnSplit = {
  left: number[]
  right: number[]
}

/** Splits tile indexes `0..count-1` into the mosaic's left and right columns, keeping their order. */
export function splitIntoColumns(count: number): ColumnSplit {
  const left: number[] = []
  const right: number[] = []

  for (let index = 0; index < count; index += 1) {
    const column = LEFT_COLUMN_POSITIONS.has(index % PATTERN_LENGTH) ? left : right
    column.push(index)
  }

  return { left, right }
}
