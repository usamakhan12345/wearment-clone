import type { HeroSliderBlock } from '@/payload-types'
import { toImageData } from '@/services/products'

import { HeroSliderCarousel, type HeroSlide } from './HeroSliderCarousel'

const DEFAULT_AUTOPLAY_SECONDS = 5

/** Full-bleed banner slider at the top of the page. */
export function HeroSlider({ block }: { block: HeroSliderBlock }) {
  const slides = (block.slides ?? []).flatMap<HeroSlide>((slide, index) => {
    // The original upload: next/image resizes it per device, and a full-bleed banner benefits from
    // more pixels than the small `card` rendition.
    const image = toImageData(slide.image, 'original')

    return image ? [{ id: slide.id ?? String(index), image, href: slide.link ?? null }] : []
  })

  if (slides.length === 0) return null

  return (
    <HeroSliderCarousel
      slides={slides}
      autoplaySeconds={block.autoplaySeconds ?? DEFAULT_AUTOPLAY_SECONDS}
    />
  )
}
