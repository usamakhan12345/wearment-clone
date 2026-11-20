import { Container } from '@/components/ui/Container/Container'

import styles from './Testimonials.module.scss'

export type TestimonialItem = {
  name: string
  rating?: number | null
  quote: string
}

type TestimonialsProps = {
  heading?: string | null
  /** Small proof line above the heading, e.g. "5000+ 5 Star reviews". */
  badge?: string | null
  items: TestimonialItem[]
}

function Stars({ rating }: { rating: number }) {
  const rounded = Math.max(0, Math.min(5, Math.round(rating)))

  return (
    <span className={styles.stars} role="img" aria-label={`${rounded} out of 5 stars`}>
      {'★'.repeat(rounded)}
      {'☆'.repeat(5 - rounded)}
    </span>
  )
}

/** Presentational testimonial cards; used by the homepage block and the product page. */
export function Testimonials({ heading, badge, items }: TestimonialsProps) {
  if (items.length === 0) return null

  return (
    <section className={styles.section}>
      <Container>
        {badge ? <p className={styles.badge}>{badge}</p> : null}
        {heading ? <h2 className={styles.heading}>{heading}</h2> : null}

        <ul className={styles.list}>
          {items.map((item, index) => (
            <li key={`${item.name}-${index}`} className={styles.card}>
              <Stars rating={item.rating ?? 5} />
              <p className={styles.name}>{item.name}</p>
              <p className={styles.quote}>{item.quote}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
