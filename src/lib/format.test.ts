import { describe, expect, it } from 'vitest'

import { formatPrice } from './format'

describe('formatPrice', () => {
  it('prefixes Rs., groups thousands and shows two decimals', () => {
    expect(formatPrice(3190)).toBe('Rs.3,190.00')
    expect(formatPrice(4000)).toBe('Rs.4,000.00')
  })

  it('keeps fractional amounts', () => {
    expect(formatPrice(99.5)).toBe('Rs.99.50')
  })
})
