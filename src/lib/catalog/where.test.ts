import { describe, expect, it } from 'vitest'

import { SORT_OPTIONS } from './query'
import { buildProductWhere, toPayloadSort } from './where'

describe('toPayloadSort', () => {
  it('maps every sort option to a Payload sort string', () => {
    expect(SORT_OPTIONS.map((option) => toPayloadSort(option.value))).toEqual([
      '-createdAt',
      'createdAt',
      'price',
      '-price',
      'title',
      '-title',
    ])
  })
})

describe('buildProductWhere', () => {
  it('returns an empty clause when nothing is filtered', () => {
    expect(buildProductWhere({})).toEqual({})
    expect(buildProductWhere({ collectionId: null, availability: null })).toEqual({})
  })

  it('restricts to a collection', () => {
    expect(buildProductWhere({ collectionId: 'abc' })).toEqual({
      and: [{ categories: { equals: 'abc' } }],
    })
  })

  it('maps availability to the derived `available` field', () => {
    expect(buildProductWhere({ availability: 'in' })).toEqual({
      and: [{ available: { equals: true } }],
    })
    expect(buildProductWhere({ availability: 'out' })).toEqual({
      and: [{ available: { equals: false } }],
    })
  })

  it('keeps a price bound of zero', () => {
    expect(buildProductWhere({ priceMin: 0 })).toEqual({
      and: [{ price: { greater_than_equal: 0 } }],
    })
  })

  it('combines every condition', () => {
    expect(
      buildProductWhere({
        collectionId: 'abc',
        availability: 'in',
        priceMin: 1000,
        priceMax: 3000,
        search: 'rose',
      }),
    ).toEqual({
      and: [
        { categories: { equals: 'abc' } },
        { available: { equals: true } },
        { price: { greater_than_equal: 1000 } },
        { price: { less_than_equal: 3000 } },
        { title: { like: 'rose' } },
      ],
    })
  })
})
