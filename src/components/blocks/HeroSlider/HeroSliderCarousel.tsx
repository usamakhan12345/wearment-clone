'use client'

import Image from 'next/image'

import { ChevronLeftIcon, ChevronRightIcon } from '@/components/layout/shared/icons'
import { SmartLink } from '@/components/layout/shared/SmartLink'
import { useAutoplay, usePauseOnInteraction } from '@/components/layout/shared/useAutoplay'
import { useSnapCarousel } from '@/components/layout/shared/useSnapCarousel'
import type { ImageData } from '@/services/products'

import styles from './HeroSlider.module.scss'

export type HeroSlide = {
  id: string
  image: ImageData
  /** Raw CMS link value; invalid or empty means the slide is not clickable. */
  href: string | null
}

type HeroSliderCarouselProps = {
  slides: HeroSlide[]
  /** Seconds between slides; 0 turns autoplay off. */
  autoplaySeconds: number
}

const FALLBACK_RATIO = '16 / 9'

export function HeroSliderCarousel({ slides, autoplaySeconds }: HeroSliderCarouselProps) {
  const count = slides.length
  const hasMany = count > 1
  const autoplays = hasMany && autoplaySeconds > 0

  const { trackRef, index, onScroll, goTo, next, prev } = useSnapCarousel(count)
  const { paused, handlers } = usePauseOnInteraction()

  useAutoplay({ enabled: autoplays, intervalMs: autoplaySeconds * 1000, paused, onTick: next })

  // Every slide uses the first image's proportions; later images are cover-cropped to match.
  const first = slides[0].image
  const aspectRatio =
    first.width && first.height ? `${first.width} / ${first.height}` : FALLBACK_RATIO

  return (
    <section
      className={styles.hero}
      aria-roledescription="carousel"
      aria-label="Featured collections"
      {...handlers}
    >
      <div
        ref={trackRef}
        className={styles.track}
        onScroll={onScroll}
        aria-live={autoplays && !paused ? 'off' : 'polite'}
      >
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
                  sizes="100vw"
                  preload={slideIndex === 0}
                  className={styles.image}
                />
              </SmartLink>
            </div>
          )
        })}
      </div>

      {hasMany ? (
        <>
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowPrev}`}
            onClick={prev}
            aria-label="Previous slide"
          >
            <ChevronLeftIcon className={styles.arrowIcon} />
          </button>
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowNext}`}
            onClick={next}
            aria-label="Next slide"
          >
            <ChevronRightIcon className={styles.arrowIcon} />
          </button>

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
        </>
      ) : null}
    </section>
  )
}
