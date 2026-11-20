import { Container } from '@/components/ui/Container/Container'
import type { ProductCarouselBlock } from '@/payload-types'
import { getProductsByIds } from '@/services/products'

import { relationIds } from '../shared/relations'
import styles from './ProductCarousel.module.scss'
import { ProductCarouselTrack } from './ProductCarouselTrack'

/** Centred heading above a horizontally scrolling row of hand-picked products. */
export async function ProductCarousel({ block }: { block: ProductCarouselBlock }) {
  const products = await getProductsByIds(relationIds(block.products))

  if (products.length === 0) return null

  return (
    <section className={styles.section} aria-label={block.heading}>
      <Container>
        <h2 className={styles.heading}>{block.heading}</h2>
        {block.subheading ? <p className={styles.subheading}>{block.subheading}</p> : null}

        <ProductCarouselTrack products={products} label={block.heading} />
      </Container>
    </section>
  )
}
