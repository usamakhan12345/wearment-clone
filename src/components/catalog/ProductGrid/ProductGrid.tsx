import { ProductCard } from '@/components/product/ProductCard/ProductCard'
import { cx } from '@/lib/cx'
import type { ProductCardData } from '@/services/products'

import styles from './ProductGrid.module.scss'

type ProductGridProps = {
  products: ProductCardData[]
  /** How many leading cards get a preloaded image (the first visible row). */
  priorityCount?: number
  /** Four columns from tablet up (used for short strips such as "related products"). */
  strip?: boolean
}

/** Responsive grid of catalog product cards: 2 columns on mobile, 3 on tablet, 4 on desktop. */
export function ProductGrid({ products, priorityCount = 0, strip = false }: ProductGridProps) {
  if (products.length === 0) return null

  return (
    <ul className={cx(styles.grid, strip && styles.strip)}>
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard product={product} variant="catalog" priority={index < priorityCount} />
        </li>
      ))}
    </ul>
  )
}
