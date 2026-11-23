import { describe, expect, it } from 'vitest'

import { matchInfoPanels } from './info-panels'
import { buildProductJsonLd, serializeJsonLd } from './json-ld'
import { resolveOrigin, toAbsoluteUrl } from './origin'
import { buildWhatsappUrl } from './whatsapp'

describe('buildWhatsappUrl', () => {
  it('builds a wa.me link with an encoded message', () => {
    expect(buildWhatsappUrl('923001234567', 'Need a size for "Rose Set"')).toBe(
      'https://wa.me/923001234567?text=Need%20a%20size%20for%20%22Rose%20Set%22',
    )
  })

  it('strips formatting characters from the number', () => {
    expect(buildWhatsappUrl('+92 300-1234567')).toBe('https://wa.me/923001234567')
  })

  it('returns null for missing or implausible numbers', () => {
    expect(buildWhatsappUrl(null)).toBeNull()
    expect(buildWhatsappUrl('')).toBeNull()
    expect(buildWhatsappUrl('123')).toBeNull()
    expect(buildWhatsappUrl('1'.repeat(20))).toBeNull()
  })
})

describe('matchInfoPanels', () => {
  const panel = (title: string) => ({ title })

  it('matches panels to slots by title keywords', () => {
    const { slots, extra } = matchInfoPanels([
      panel('Shipping Info'),
      panel('Size Chart'),
      panel('Returns & Refunds'),
    ])

    expect(slots['size-chart']?.title).toBe('Size Chart')
    expect(slots.returns?.title).toBe('Returns & Refunds')
    expect(slots.shipping?.title).toBe('Shipping Info')
    expect(extra).toEqual([])
  })

  it('is case and punctuation insensitive', () => {
    const { slots } = matchInfoPanels([panel('SIZE-CHART'), panel('returns/refunds')])

    expect(slots['size-chart']).not.toBeNull()
    expect(slots.returns).not.toBeNull()
  })

  it('keeps unmatched panels as extras and leaves missing slots empty', () => {
    const { slots, extra } = matchInfoPanels([panel('Fabric care')])

    expect(slots).toEqual({ 'size-chart': null, returns: null, shipping: null })
    expect(extra).toEqual([{ title: 'Fabric care' }])
  })

  it('assigns each slot to at most one panel', () => {
    const { slots, extra } = matchInfoPanels([panel('Size guide'), panel('Size chart 2')])

    expect(slots['size-chart']?.title).toBe('Size guide')
    expect(extra).toEqual([{ title: 'Size chart 2' }])
  })
})

describe('buildProductJsonLd', () => {
  it('describes the product with an offer in PKR', () => {
    const data = buildProductJsonLd({
      name: 'Rose Set',
      description: 'Soft linen',
      images: ['https://shop.test/a.jpg'],
      url: 'https://shop.test/products/rose-set',
      price: 2990,
      available: true,
    })

    expect(data).toMatchObject({
      '@type': 'Product',
      name: 'Rose Set',
      image: ['https://shop.test/a.jpg'],
      offers: {
        '@type': 'Offer',
        price: '2990.00',
        priceCurrency: 'PKR',
        availability: 'https://schema.org/InStock',
      },
    })
  })

  it('reports sold-out products and omits empty fields', () => {
    const data = buildProductJsonLd({ name: 'Rose Set', price: 100, available: false })

    expect(data.offers).toMatchObject({ availability: 'https://schema.org/OutOfStock' })
    expect(data).not.toHaveProperty('image')
    expect(data).not.toHaveProperty('description')
  })

  it('omits offers without a price', () => {
    expect(buildProductJsonLd({ name: 'x', price: null, available: true })).not.toHaveProperty(
      'offers',
    )
  })
})

describe('serializeJsonLd', () => {
  it('escapes sequences that could break out of a script tag', () => {
    const json = serializeJsonLd({ name: '</script><script>alert(1)</script> & co' })

    expect(json).not.toContain('<')
    expect(json).not.toContain('>')
    expect(JSON.parse(json)).toEqual({ name: '</script><script>alert(1)</script> & co' })
  })
})

describe('resolveOrigin / toAbsoluteUrl', () => {
  it('builds an origin from valid hosts', () => {
    expect(resolveOrigin('amora.example', 'https')).toBe('https://amora.example')
    expect(resolveOrigin('localhost:3000', 'http')).toBe('http://localhost:3000')
    expect(resolveOrigin('a.test, b.test', 'https, http')).toBe('https://a.test')
  })

  it('defaults the scheme by host when no protocol is forwarded', () => {
    expect(resolveOrigin('localhost:3000', null)).toBe('http://localhost:3000')
    expect(resolveOrigin('amora.example', null)).toBe('https://amora.example')
    expect(resolveOrigin('amora.example', 'ftp')).toBe('https://amora.example')
  })

  it('rejects malformed hosts', () => {
    expect(resolveOrigin(null, 'https')).toBeNull()
    expect(resolveOrigin('evil.test/"><script>', 'https')).toBeNull()
    expect(resolveOrigin('', 'https')).toBeNull()
  })

  it('resolves paths against the origin and leaves absolute URLs alone', () => {
    expect(toAbsoluteUrl('https://shop.test', '/api/media/file/a.jpg')).toBe(
      'https://shop.test/api/media/file/a.jpg',
    )
    expect(toAbsoluteUrl('https://shop.test', 'https://cdn.test/a.jpg')).toBe(
      'https://cdn.test/a.jpg',
    )
    expect(toAbsoluteUrl(null, '/a.jpg')).toBe('/a.jpg')
  })
})
