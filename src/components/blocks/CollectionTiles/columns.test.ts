import { describe, expect, it } from 'vitest'

import { splitIntoColumns } from './columns'

describe('splitIntoColumns', () => {
  it('puts tiles 1, 4 and 5 on the left and 2, 3 and 6 on the right for six tiles', () => {
    expect(splitIntoColumns(6)).toEqual({ left: [0, 3, 4], right: [1, 2, 5] })
  })

  it('repeats the pattern for longer lists and keeps each column in order', () => {
    expect(splitIntoColumns(12)).toEqual({
      left: [0, 3, 4, 6, 9, 10],
      right: [1, 2, 5, 7, 8, 11],
    })
  })

  it('handles lists shorter than one pattern', () => {
    expect(splitIntoColumns(1)).toEqual({ left: [0], right: [] })
    expect(splitIntoColumns(3)).toEqual({ left: [0], right: [1, 2] })
  })

  it('returns empty columns for no tiles', () => {
    expect(splitIntoColumns(0)).toEqual({ left: [], right: [] })
  })
})
