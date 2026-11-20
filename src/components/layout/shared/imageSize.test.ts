import { describe, expect, it } from 'vitest'

import { isSvgUrl, sizeForHeight } from './imageSize'

describe('sizeForHeight', () => {
  it('scales the width to the requested height using the image proportions', () => {
    expect(sizeForHeight({ width: 1000, height: 200 }, 32)).toEqual({ width: 160, height: 32 })
  })

  it('falls back to the given ratio when the file reports no dimensions', () => {
    expect(sizeForHeight({ width: null, height: null }, 20)).toEqual({ width: 100, height: 20 })
    expect(sizeForHeight({ width: null, height: null }, 20, 8)).toEqual({ width: 160, height: 20 })
  })
})

describe('isSvgUrl', () => {
  it('matches .svg paths, including with a cache-busting query string', () => {
    expect(isSvgUrl('/api/media/file/icon.svg')).toBe(true)
    expect(isSvgUrl('/api/media/file/ICON.SVG?2026-01-01T00:00:00.000Z')).toBe(true)
  })

  it('does not match raster images or names that merely contain "svg"', () => {
    expect(isSvgUrl('/api/media/file/photo.jpg')).toBe(false)
    expect(isSvgUrl('/api/media/file/svg-banner.png')).toBe(false)
  })
})
