import Image from 'next/image'

import type { ImageData } from '@/services/products'

import { isSvgUrl, sizeForHeight } from './imageSize'

type LogoProps = {
  image: ImageData | null
  /** Shown as text when no logo image is available. */
  name: string
  /** Rendered height in CSS pixels; sets the image request size so it is not over-fetched. */
  height: number
  className?: string
  /** Preload the image (above-the-fold logos). */
  preload?: boolean
}

/** Site logo image with a text fallback. The surrounding link is the caller's job. */
export function Logo({ image, name, height, className, preload = false }: LogoProps) {
  if (!image) return <span className={className}>{name}</span>

  return (
    <Image
      src={image.url}
      alt={image.alt || name}
      {...sizeForHeight(image, height)}
      unoptimized={isSvgUrl(image.url)}
      preload={preload}
      className={className}
    />
  )
}
