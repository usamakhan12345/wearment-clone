'use client'

import Image from 'next/image'

import { SmartLink } from '@/components/layout/shared/SmartLink'
import { useSnapCarousel } from '@/components/layout/shared/useSnapCarousel'
import type { ImageData } from '@/services/products'

import styles from './PromoCountdown.module.scss'

export type PromoSlide = {
  id: string
  image: ImageData
  /** Raw CMS link value; invalid or empty means the slide is not clickable. */
  href: string | null
}

const FALLBACK_RATIO = '1 / 1'

/** Swipeable image slider with dots; slides scroll natively and the dots mirror the position. */
export function PromoSlides({ slides }: { slides: PromoSlide[] }) {
  const count = slides.length
  const { trackRef, index, onScroll, goTo } = useSnapCarousel(count)

  const first = slides[0].image
  const aspectRatio =
    first.width && first.height ? `${first.width} / ${first.height}` : FALLBACK_RATIO

  return (
    <div
      className={styles.slider}
      role="group"
      aria-roledescription="carousel"
      aria-label="Promotions"
    >
      <div ref={trackRef} className={styles.track} onScroll={onScroll}>
        {slides.map((slide, slideIndex) => {
          const active = slideIndex === index

          return (
            <div
              key={slide.id}
              className={styles.slide}
              style={{ aspectRatio }}
              role="group"
              aria-roledescription="slide"
              aria-label={`${slideIndex + 1} of ${count}`}
              aria-hidden={!active}
              inert={!active}
            >
              <SmartLink href={slide.href} className={styles.slideLink}>
                <Image
                  src={slide.image.url}
                  alt={slide.image.alt}
                  fill
                  sizes="(min-width: 64rem) 30vw, 90vw"
                  className={styles.slideImage}
                />
              </SmartLink>
            </div>
          )
        })}
      </div>

      {count > 1 ? (
        <div className={styles.dots}>
          {slides.map((slide, slideIndex) => (
            <button
              key={slide.id}
              type="button"
              className={styles.dot}
              onClick={() => goTo(slideIndex)}
              aria-label={`Go to slide ${slideIndex + 1}`}
              aria-current={slideIndex === index ? 'true' : undefined}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
