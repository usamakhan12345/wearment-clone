import { Container } from '@/components/ui/Container/Container'
import type { ProductShowcaseBlock } from '@/payload-types'
import {
  getProductsByCollection,
  getProductsByIds,
  type ProductCardData,
} from '@/services/products'

import { relationId, relationIds } from '../shared/relations'
import styles from './ProductShowcase.module.scss'
import { ProductShowcaseGrid } from './ProductShowcaseGrid'

const DEFAULT_LIMIT = 12
const DEFAULT_INITIAL_COUNT = 4
const DEFAULT_BUTTON_LABEL = 'Show More Products'

/** Hand-picked products win; otherwise the newest products of the chosen collection. */
async function loadProducts(block: ProductShowcaseBlock): Promise<ProductCardData[]> {
  const pickedIds = relationIds(block.products)

  if (pickedIds.length > 0) return getProductsByIds(pickedIds)
  if (block.category) {
    return getProductsByCollection(relationId(block.category), block.limit ?? DEFAULT_LIMIT)
  }

  return []
}

/**
 * Headed product grid. Products are fetched here so only plain card data reaches the client-side
 * "show more" wrapper.
 */
export async function ProductShowcase({ block }: { block: ProductShowcaseBlock }) {
  const products = await loadProducts(block)

  if (products.length === 0) return null

  return (
    <section className={styles.section} aria-label={block.heading}>
      <Container>
        <h2 className={styles.heading}>{block.heading}</h2>

        <ProductShowcaseGrid
          products={products}
          initialCount={block.initialCount ?? DEFAULT_INITIAL_COUNT}
          buttonLabel={block.buttonLabel || DEFAULT_BUTTON_LABEL}
        />
      </Container>
    </section>
  )
}
