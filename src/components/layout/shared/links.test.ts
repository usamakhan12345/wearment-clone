import { describe, expect, it } from 'vitest'

import { buildWhatsAppUrl, normalizeWhatsAppNumber, resolveHref } from './links'

describe('resolveHref', () => {
  it('treats single-slash paths as internal links', () => {
    expect(resolveHref('/collections/linen')).toEqual({
      href: '/collections/linen',
      external: false,
    })
    expect(resolveHref('  /search ')).toEqual({ href: '/search', external: false })
  })

  it('treats http(s), mailto and tel URLs as external links', () => {
    expect(resolveHref('https://instagram.com/amora')).toEqual({
      href: 'https://instagram.com/amora',
      external: true,
    })
    expect(resolveHref('mailto:hello@example.com')?.external).toBe(true)
    expect(resolveHref('tel:+923001234567')?.external).toBe(true)
  })

  it('rejects empty values', () => {
    expect(resolveHref(undefined)).toBeNull()
    expect(resolveHref(null)).toBeNull()
    expect(resolveHref('   ')).toBeNull()
  })

  it('rejects script URLs, protocol-relative URLs and bare words', () => {
    expect(resolveHref('javascript:alert(1)')).toBeNull()
    expect(resolveHref('//evil.example/path')).toBeNull()
    expect(resolveHref('collections/linen')).toBeNull()
  })
})

describe('normalizeWhatsAppNumber', () => {
  it('keeps digits only', () => {
    expect(normalizeWhatsAppNumber('+92 300-1234567')).toBe('923001234567')
  })

  it('returns null when there are no digits', () => {
    expect(normalizeWhatsAppNumber('')).toBeNull()
    expect(normalizeWhatsAppNumber('n/a')).toBeNull()
    expect(normalizeWhatsAppNumber(undefined)).toBeNull()
  })
})

describe('buildWhatsAppUrl', () => {
  it('encodes the prefilled message', () => {
    expect(buildWhatsAppUrl('923001234567', 'Hello! I need help & more')).toBe(
      'https://wa.me/923001234567?text=Hello!%20I%20need%20help%20%26%20more',
    )
  })

  it('omits the text parameter when there is no message', () => {
    expect(buildWhatsAppUrl('923001234567', null)).toBe('https://wa.me/923001234567')
    expect(buildWhatsAppUrl('923001234567', '  ')).toBe('https://wa.me/923001234567')
  })
})
