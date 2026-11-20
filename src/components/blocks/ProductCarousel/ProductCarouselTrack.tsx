'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { ChevronLeftIcon, ChevronRightIcon } from '@/components/layout/shared/icons'
import { usePrefersReducedMotion } from '@/components/layout/shared/usePrefersReducedMotion'
import { ProductCard } from '@/components/product/ProductCard/ProductCard'
import type { ProductCardData } from '@/services/products'

import styles from './ProductCarousel.module.scss'

type ProductCarouselTrackProps = {
  products: ProductCardData[]
  /** Accessible name of the carousel. */
  label: string
}

// Tolerance for sub-pixel scroll positions when deciding whether an end has been reached.
const EDGE_TOLERANCE = 2

export function ProductCarouselTrack({ products, label }: ProductCarouselTrackProps) {
  const trackRef = useRef<HTMLUListElement>(null)
  const reducedMotion = usePrefersReducedMotion()
  const [edges, setEdges] = useState({ atStart: true, atEnd: false })

  const updateEdges = useCallback(() => {
    const track = trackRef.current
    if (!track) return

    const atStart = track.scrollLeft <= EDGE_TOLERANCE
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - EDGE_TOLERANCE

    setEdges((current) =>
      current.atStart === atStart && current.atEnd === atEnd ? current : { atStart, atEnd },
    )
  }, [])

  // ResizeObserver fires once when observation starts, which also sets the initial state.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const observer = new ResizeObserver(updateEdges)
    observer.observe(track)

    return () => observer.disconnect()
  }, [updateEdges])

  const scrollByPage = (direction: 1 | -1) => {
    const track = trackRef.current
    if (!track) return

    track.scrollBy({
      left: direction * track.clientWidth,
      behavior: reducedMotion ? 'auto' : 'smooth',
    })
  }

  // aria-disabled (not `disabled`) so a keyboard user who reaches an end keeps their focus.
  const prev = () => {
    if (!edges.atStart) scrollByPage(-1)
  }
  const next = () => {
    if (!edges.atEnd) scrollByPage(1)
  }

  return (
    <div
      className={styles.carousel}
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
    >
      <button
        type="button"
        className={`${styles.arrow} ${styles.arrowPrev}`}
        onClick={prev}
        aria-label="Previous products"
        aria-disabled={edges.atStart}
      >
        <ChevronLeftIcon className={styles.arrowIcon} />
      </button>

      <ul ref={trackRef} className={styles.track} onScroll={updateEdges}>
        {products.map((product) => (
          <li key={product.id} className={styles.item}>
            <ProductCard product={product} variant="home" />
          </li>
        ))}
      </ul>

      <button
        type="button"
        className={`${styles.arrow} ${styles.arrowNext}`}
        onClick={next}
        aria-label="Next products"
        aria-disabled={edges.atEnd}
      >
        <ChevronRightIcon className={styles.arrowIcon} />
      </button>
    </div>
  )
}
