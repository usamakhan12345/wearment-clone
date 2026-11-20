import type { ImageData } from '@/services/products'

// Used when an uploaded file does not report its dimensions (e.g. some SVGs).
const FALLBACK_RATIO = 5

/**
 * Width/height attributes for an image shown at a fixed CSS height. Telling `next/image` the size it
 * is actually displayed at (rather than the file's full size) keeps the generated `srcset` small.
 */
export function sizeForHeight(
  image: Pick<ImageData, 'width' | 'height'>,
  height: number,
  fallbackRatio = FALLBACK_RATIO,
): { width: number; height: number } {
  const ratio = image.width && image.height ? image.width / image.height : fallbackRatio

  return { width: Math.max(1, Math.round(height * ratio)), height }
}

/**
 * SVGs are vector files that `next/image` must not run through its raster optimiser. It skips them
 * on its own only when the URL ends in `.svg`, so also match a trailing cache-busting query string.
 */
export function isSvgUrl(url: string): boolean {
  return /\.svg(\?.*)?$/i.test(url)
}
