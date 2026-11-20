import { describe, expect, it } from 'vitest'

import { slugify } from './slugify'

describe('slugify', () => {
  it('lowercases and hyphenates words', () => {
    expect(slugify('About Our Company')).toBe('about-our-company')
  })

  it('strips accents and punctuation', () => {
    expect(slugify('Café & Crème — Menu!')).toBe('cafe-creme-menu')
  })

  it('collapses repeated separators and trims the ends', () => {
    expect(slugify('  --Hello   World--  ')).toBe('hello-world')
  })

  it('returns an empty string when nothing usable remains', () => {
    expect(slugify('***')).toBe('')
  })
})
