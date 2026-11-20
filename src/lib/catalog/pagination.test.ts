import { describe, expect, it } from 'vitest'

import { getPageItems } from './pagination'

describe('getPageItems', () => {
  it('returns nothing for an empty result set', () => {
    expect(getPageItems(1, 0)).toEqual([])
  })

  it('lists short ranges in full', () => {
    expect(getPageItems(1, 1)).toEqual([1])
    expect(getPageItems(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('collapses long ranges around the current page', () => {
    expect(getPageItems(1, 20)).toEqual([1, 2, 'ellipsis', 20])
    expect(getPageItems(10, 20)).toEqual([1, 'ellipsis', 9, 10, 11, 'ellipsis', 20])
    expect(getPageItems(20, 20)).toEqual([1, 'ellipsis', 19, 20])
  })

  it('shows a single skipped page instead of an ellipsis', () => {
    expect(getPageItems(4, 20)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 20])
    expect(getPageItems(17, 20)).toEqual([1, 'ellipsis', 16, 17, 18, 19, 20])
  })

  it('clamps an out-of-range current page', () => {
    expect(getPageItems(99, 20)).toEqual([1, 'ellipsis', 19, 20])
  })
})
