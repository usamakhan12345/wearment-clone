import { describe, expect, it } from 'vitest'

import { storageKey } from './gridfs'

describe('storageKey', () => {
  it('is just the filename without a prefix', () => {
    expect(storageKey('shirt-abc123.webp')).toBe('shirt-abc123.webp')
  })

  it('joins prefix and filename with a single slash', () => {
    expect(storageKey('shirt.webp', 'products')).toBe('products/shirt.webp')
    expect(storageKey('shirt.webp', 'products/')).toBe('products/shirt.webp')
  })

  it('treats an empty prefix as no prefix', () => {
    expect(storageKey('shirt.webp', '')).toBe('shirt.webp')
  })
})
