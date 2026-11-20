import Link from 'next/link'

import { ProductGrid } from '@/components/catalog/ProductGrid/ProductGrid'
import { Container } from '@/components/ui/Container/Container'
import type { ProductCardData } from '@/services/products'

import styles from './RelatedProducts.module.scss'

type RelatedProductsProps = {
  heading?: string | null
  products: ProductCardData[]
  /** Collection the products come from; the "View all" link points there. */
  viewAllHref: string
}

/** "More from this collection" strip at the bottom of the product page. */
export function RelatedProducts({ heading, products, viewAllHref }: RelatedProductsProps) {
  if (products.length === 0) return null

  return (
    <section className={styles.section} aria-labelledby="related-products-heading">
      <Container>
        <h2 id="related-products-heading" className={styles.heading}>
          {heading || 'Check More Collection'}
        </h2>

        <ProductGrid products={products} strip />

        <div className={styles.more}>
          <Link href={viewAllHref} className={styles.button}>
            View all
          </Link>
        </div>
      </Container>
    </section>
  )
}
