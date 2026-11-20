'use client'

import { useEffect, useRef, useState } from 'react'

import { ProductCard } from '@/components/product/ProductCard/ProductCard'
import type { ProductCardData } from '@/services/products'

import styles from './ProductShowcase.module.scss'

/** How many more products each click of the button reveals. */
const REVEAL_STEP = 4

type ProductShowcaseGridProps = {
  products: ProductCardData[]
  /** Products visible before the first click. */
  initialCount: number
  buttonLabel: string
}

export function ProductShowcaseGrid({
  products,
  initialCount,
  buttonLabel,
}: ProductShowcaseGridProps) {
  const [visibleCount, setVisibleCount] = useState(Math.max(1, initialCount))
  const listRef = useRef<HTMLUListElement>(null)
  // Index of the first product revealed by the latest click; focus moves there so keyboard and
  // screen-reader users land on the new content (and not on a button that may have just vanished).
  const focusIndexRef = useRef<number | null>(null)

  const visible = products.slice(0, visibleCount)
  const hasMore = visible.length < products.length

  useEffect(() => {
    const index = focusIndexRef.current
    if (index === null) return

    focusIndexRef.current = null

    const links = listRef.current?.querySelectorAll<HTMLAnchorElement>('li a')
    links?.[index]?.focus({ preventScroll: true })
  }, [visibleCount])

  const showMore = () => {
    focusIndexRef.current = visible.length
    setVisibleCount((count) => count + REVEAL_STEP)
  }

  return (
    <>
      <ul ref={listRef} className={styles.grid}>
        {visible.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} variant="home" />
          </li>
        ))}
      </ul>

      <p className={styles.status} role="status">
        Showing {visible.length} of {products.length} products
      </p>

      {hasMore ? (
        <div className={styles.actions}>
          <button type="button" className={styles.more} onClick={showMore}>
            {buttonLabel}
          </button>
        </div>
      ) : null}
    </>
  )
}
