import { describe, expect, it } from 'vitest'

import {
  buildCatalogHref,
  DEFAULT_SORT,
  hasActiveFilters,
  parseCatalogSearchParams,
  parsePage,
  parsePrice,
  parseSearchTerm,
} from './query'

describe('parseCatalogSearchParams', () => {
  it('returns defaults when nothing is provided', () => {
    expect(parseCatalogSearchParams({})).toEqual({
      sort: DEFAULT_SORT,
      page: 1,
      availability: null,
      priceMin: null,
      priceMax: null,
    })
  })

  it('accepts every supported sort value and rejects unknown ones', () => {
    for (const sort of [
      'created-descending',
      'created-ascending',
      'price-ascending',
      'price-descending',
      'title-ascending',
      'title-descending',
    ]) {
      expect(parseCatalogSearchParams({ sort_by: sort }).sort).toBe(sort)
    }

    expect(parseCatalogSearchParams({ sort_by: 'best-selling' }).sort).toBe(DEFAULT_SORT)
    expect(parseCatalogSearchParams({ sort_by: 'manual' }).sort).toBe(DEFAULT_SORT)
    expect(parseCatalogSearchParams({ sort_by: '-price; drop' }).sort).toBe(DEFAULT_SORT)
  })

  it('parses availability, including the Shopify 1/0 form', () => {
    expect(parseCatalogSearchParams({ availability: 'in' }).availability).toBe('in')
    expect(parseCatalogSearchParams({ availability: 'OUT' }).availability).toBe('out')
    expect(parseCatalogSearchParams({ 'filter.v.availability': '1' }).availability).toBe('in')
    expect(parseCatalogSearchParams({ 'filter.v.availability': '0' }).availability).toBe('out')
    expect(parseCatalogSearchParams({ availability: 'maybe' }).availability).toBeNull()
  })

  it('parses price bounds and ignores garbage', () => {
    expect(parseCatalogSearchParams({ price_min: '1000', price_max: '3500.5' })).toMatchObject({
      priceMin: 1000,
      priceMax: 3500.5,
    })
    expect(
      parseCatalogSearchParams({ 'filter.v.price.gte': '500', 'filter.v.price.lte': '900' }),
    ).toMatchObject({ priceMin: 500, priceMax: 900 })
    expect(parseCatalogSearchParams({ price_min: 'abc', price_max: '-5' })).toMatchObject({
      priceMin: null,
      priceMax: null,
    })
  })

  it('prefers the native param name over the Shopify alias', () => {
    expect(
      parseCatalogSearchParams({ price_min: '100', 'filter.v.price.gte': '900' }).priceMin,
    ).toBe(100)
  })

  it('swaps a reversed price range', () => {
    expect(parseCatalogSearchParams({ price_min: '5000', price_max: '1000' })).toMatchObject({
      priceMin: 1000,
      priceMax: 5000,
    })
  })

  it('uses the first value of repeated params', () => {
    expect(
      parseCatalogSearchParams({ page: ['3', '9'], availability: ['out', 'in'] }),
    ).toMatchObject({
      page: 3,
      availability: 'out',
    })
  })
})

describe('parsePage', () => {
  it('only accepts positive integers', () => {
    expect(parsePage('2')).toBe(2)
    expect(parsePage('0')).toBe(1)
    expect(parsePage('-1')).toBe(1)
    expect(parsePage('1.5')).toBe(1)
    expect(parsePage('abc')).toBe(1)
    expect(parsePage(undefined)).toBe(1)
  })

  it('caps absurdly large page numbers', () => {
    expect(parsePage('99999999999999999999')).toBe(1)
    expect(parsePage('50000')).toBe(10_000)
  })
})

describe('parsePrice', () => {
  it('accepts non-negative decimals with up to two fraction digits', () => {
    expect(parsePrice('0')).toBe(0)
    expect(parsePrice(' 3190 ')).toBe(3190)
    expect(parsePrice('99.99')).toBe(99.99)
  })

  it('rejects everything else', () => {
    expect(parsePrice('1e3')).toBeNull()
    expect(parsePrice('1,000')).toBeNull()
    expect(parsePrice('12.345')).toBeNull()
    expect(parsePrice('99999999999')).toBeNull()
    expect(parsePrice('')).toBeNull()
  })
})

describe('parseSearchTerm', () => {
  it('trims, collapses whitespace and caps length', () => {
    expect(parseSearchTerm('  linen   set ')).toBe('linen set')
    expect(parseSearchTerm('x'.repeat(300))).toHaveLength(100)
  })

  it('returns null for empty input', () => {
    expect(parseSearchTerm('   ')).toBeNull()
    expect(parseSearchTerm(undefined)).toBeNull()
    expect(parseSearchTerm(['rose', 'daisy'])).toBe('rose')
  })
})

describe('hasActiveFilters', () => {
  it('ignores sort and page', () => {
    const base = parseCatalogSearchParams({ sort_by: 'title-ascending', page: '2' })
    expect(hasActiveFilters(base)).toBe(false)
    expect(hasActiveFilters({ ...base, priceMax: 100 })).toBe(true)
    expect(hasActiveFilters({ ...base, availability: 'in' })).toBe(true)
  })
})

describe('buildCatalogHref', () => {
  const defaults = parseCatalogSearchParams({})

  it('omits default values', () => {
    expect(buildCatalogHref('/collections/linen', defaults)).toBe('/collections/linen')
  })

  it('serialises non-default values', () => {
    const query = parseCatalogSearchParams({
      sort_by: 'price-ascending',
      availability: 'in',
      price_min: '1000',
      price_max: '3000',
      page: '3',
    })

    expect(buildCatalogHref('/collections/linen', query)).toBe(
      '/collections/linen?sort_by=price-ascending&availability=in&price_min=1000&price_max=3000&page=3',
    )
  })

  it('keeps extra params such as the search term, encoded', () => {
    expect(buildCatalogHref('/search', { page: 2 }, { q: 'rose & daisy' })).toBe(
      '/search?q=rose+%26+daisy&page=2',
    )
  })
})
