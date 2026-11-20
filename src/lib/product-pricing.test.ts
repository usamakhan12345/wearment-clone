import { describe, expect, it } from 'vitest'

import { deriveProductPricing, discountPercent } from './product-pricing'

describe('deriveProductPricing', () => {
  it('uses the cheapest variant and its compare-at price', () => {
    expect(
      deriveProductPricing([
        { price: 3490, compareAtPrice: 4000, available: false },
        { price: 3190, compareAtPrice: 4000, available: true },
      ]),
    ).toEqual({ price: 3190, compareAtPrice: 4000, available: true })
  })

  it('is unavailable only when every variant is unavailable', () => {
    expect(
      deriveProductPricing([
        { price: 100, available: false },
        { price: 120, available: false },
      ])?.available,
    ).toBe(false)
  })

  it('treats a missing available flag as available', () => {
    expect(deriveProductPricing([{ price: 100 }])?.available).toBe(true)
  })

  it('ignores a compare-at price that is not higher than the price', () => {
    expect(deriveProductPricing([{ price: 100, compareAtPrice: 100 }])?.compareAtPrice).toBeNull()
  })

  it('returns null when there are no variants', () => {
    expect(deriveProductPricing([])).toBeNull()
    expect(deriveProductPricing(undefined)).toBeNull()
  })
})

describe('discountPercent', () => {
  it('rounds to a whole percentage', () => {
    expect(discountPercent(3190, 4000)).toBe(20)
    expect(discountPercent(2990, 4500)).toBe(34)
  })

  it('returns null when not discounted', () => {
    expect(discountPercent(100, 100)).toBeNull()
    expect(discountPercent(100, null)).toBeNull()
  })
})
