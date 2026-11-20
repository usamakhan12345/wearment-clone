import { Testimonials as TestimonialCards } from '@/components/content/Testimonials/Testimonials'
import type { TestimonialsBlock } from '@/payload-types'

/** Page-builder wrapper around the shared testimonial cards (also used on product pages). */
export function Testimonials({ block }: { block: TestimonialsBlock }) {
  const items = (block.items ?? []).map(({ name, rating, quote }) => ({ name, rating, quote }))

  return <TestimonialCards heading={block.heading} badge={block.badge} items={items} />
}
