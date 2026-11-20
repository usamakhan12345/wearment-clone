import { describe, expect, it } from 'vitest'

import { mediaKey } from './media'

describe('mediaKey', () => {
  it('drops volatile query strings so the same image is recognised across runs', () => {
    expect(
      mediaKey('https://cdn.shopify.com/s/files/1/0686/files/a.png?v=1795125716&width=1400'),
    ).toBe('https://cdn.shopify.com/s/files/1/0686/files/a.png')
  })

  it('handles protocol-relative URLs', () => {
    expect(mediaKey('//wearments.com/cdn/shop/files/logo.png?v=1')).toBe(
      'https://wearments.com/cdn/shop/files/logo.png',
    )
  })

  it('keeps the path of transform-style URLs intact', () => {
    expect(mediaKey('https://ucarecdn.com/abc/-/format/auto/payments.png')).toBe(
      'https://ucarecdn.com/abc/-/format/auto/payments.png',
    )
  })
})
