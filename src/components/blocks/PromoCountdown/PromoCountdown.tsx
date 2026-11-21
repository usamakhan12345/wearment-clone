import { resolveHref } from '@/components/layout/shared/links'
import { SmartLink } from '@/components/layout/shared/SmartLink'
import { Container } from '@/components/ui/Container/Container'
import type { PromoCountdownBlock } from '@/payload-types'
import { toImageData } from '@/services/products'

import { CountdownTimer } from './CountdownTimer'
import styles from './PromoCountdown.module.scss'
import { PromoSlides, type PromoSlide } from './PromoSlides'

// Reading the clock is impure, so it lives outside the component. This is the server's request
// time: it seeds the timer so the server HTML and the first client render agree exactly.
const requestTime = () => Date.now()

/** Left: heading and live countdown. Right: grey panel with promo copy, a button and a slider. */
export function PromoCountdown({ block }: { block: PromoCountdownBlock }) {
  const slides = (block.slides ?? []).flatMap<PromoSlide>((slide, index) => {
    const image = toImageData(slide.image, 'original')

    return image ? [{ id: slide.id ?? String(index), image, href: slide.link ?? null }] : []
  })

  const showButton = Boolean(block.buttonLabel && resolveHref(block.buttonLink))
  const hasCopy = Boolean(block.eyebrow || block.text || showButton)

  return (
    <section className={styles.section} aria-label={block.heading}>
      <Container className={styles.inner}>
        <div className={styles.countdown}>
          <h2 className={styles.heading}>{block.heading}</h2>
          <CountdownTimer
            endsAt={block.endsAt}
            restartDaily={block.restartDaily ?? true}
            initialNow={requestTime()}
          />
        </div>

        {hasCopy || slides.length > 0 ? (
          <div className={styles.panel}>
            {hasCopy ? (
              <div className={styles.copy}>
                {block.eyebrow ? <p className={styles.eyebrow}>{block.eyebrow}</p> : null}
                {block.text ? <p className={styles.text}>{block.text}</p> : null}
                {showButton ? (
                  <SmartLink href={block.buttonLink} className={styles.button}>
                    {block.buttonLabel}
                  </SmartLink>
                ) : null}
              </div>
            ) : null}

            {slides.length > 0 ? <PromoSlides slides={slides} /> : null}
          </div>
        ) : null}
      </Container>
    </section>
  )
}
