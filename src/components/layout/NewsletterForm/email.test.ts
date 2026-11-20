import { describe, expect, it } from 'vitest'

import { MAX_EMAIL_LENGTH, normalizeEmail } from './email'

describe('normalizeEmail', () => {
  it('trims and lower-cases valid addresses', () => {
    expect(normalizeEmail('  Jane.Doe+news@Example.COM ')).toBe('jane.doe+news@example.com')
  })

  it('accepts subdomains and plus addressing', () => {
    expect(normalizeEmail('a-b@mail.example.co.uk')).toBe('a-b@mail.example.co.uk')
  })

  it.each([
    ['empty string', ''],
    ['whitespace only', '   '],
    ['no at sign', 'jane.example.com'],
    ['no domain dot', 'jane@example'],
    ['spaces inside', 'jane doe@example.com'],
    ['double dots', 'jane..doe@example.com'],
    ['quoted local part', '"jane"@example.com'],
    ['trailing garbage', 'jane@example.com, other@example.com'],
  ])('rejects %s', (_label, value) => {
    expect(normalizeEmail(value)).toBeNull()
  })

  it('rejects values over the maximum length', () => {
    const tooLong = `${'a'.repeat(MAX_EMAIL_LENGTH)}@example.com`

    expect(normalizeEmail(tooLong)).toBeNull()
  })

  it('rejects non-string input such as a missing form field or an uploaded file', () => {
    expect(normalizeEmail(null)).toBeNull()
    expect(normalizeEmail(undefined)).toBeNull()
    expect(normalizeEmail(42)).toBeNull()
    expect(normalizeEmail(new Blob(['x']))).toBeNull()
  })
})
