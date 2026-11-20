import Image from 'next/image'
import Link from 'next/link'

import { formatPrice } from '@/lib/format'
import { discountPercent } from '@/lib/product-pricing'
import type { ProductCardData } from '@/services/products'

import styles from './ProductCard.module.scss'

type ProductCardProps = {
  product: ProductCardData
  /**
   * `home`: red "-20%" discount badge (homepage sections).
   * `catalog`: dark "Sale" / "Sold out" pill (collection pages).
   */
  variant?: 'home' | 'catalog'
  /** Set for above-the-fold cards so the image is preloaded. */
  priority?: boolean
}

export function ProductCard({ product, variant = 'home', priority = false }: ProductCardProps) {
  const { title, handle, price, compareAtPrice, available, image } = product
  const discount = discountPercent(price, compareAtPrice)

  return (
    <article className={`${styles.card} ${styles[variant]}`}>
      <Link href={`/products/${handle}`} className={styles.link}>
        <div className={styles.media}>
          {image ? (
            <Image
              src={image.url}
              alt={image.alt || title}
              fill
              sizes="(min-width: 1100px) 25vw, (min-width: 640px) 33vw, 50vw"
              priority={priority}
              className={styles.image}
            />
          ) : null}

          {variant === 'home' && discount ? (
            <span className={styles.discountBadge}>- {discount}%</span>
          ) : null}
          {variant === 'catalog' && (!available || discount) ? (
            <span className={styles.pill}>{available ? 'Sale' : 'Sold out'}</span>
          ) : null}
        </div>

        <h3 className={styles.title}>{title}</h3>

        <p className={styles.prices}>
          {variant === 'catalog' && compareAtPrice && discount ? (
            <s className={styles.compare}>{formatPrice(compareAtPrice)} PKR</s>
          ) : null}
          <span className={styles.price}>
            {formatPrice(price)}
            {variant === 'catalog' ? ' PKR' : ''}
          </span>
          {variant === 'home' && compareAtPrice && discount ? (
            <s className={styles.compare}>{formatPrice(compareAtPrice)}</s>
          ) : null}
        </p>
      </Link>
    </article>
  )
}
