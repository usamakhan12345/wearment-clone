'use client'

import Image from 'next/image'
import { useState } from 'react'

import { cx } from '@/lib/cx'
import type { ImageData } from '@/services/products'

import styles from './ProductGallery.module.scss'

export type GalleryImage = {
  /** Large rendition shown in the main frame. */
  main: ImageData
  /** Small rendition for the thumbnail strip. */
  thumb: ImageData
}

type ProductGalleryProps = {
  images: GalleryImage[]
  /** Fallback alt text for images without one. */
  title: string
}

/** Main image (3:4) with a thumbnail strip; thumbnails are buttons, so the keyboard works. */
export function ProductGallery({ images, title }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  const active = images[Math.min(activeIndex, images.length - 1)]

  if (!active) {
    return <div className={styles.frame} role="img" aria-label={`${title} (no image available)`} />
  }

  return (
    <div className={styles.gallery}>
      <div className={styles.frame}>
        <Image
          key={active.main.url}
          src={active.main.url}
          alt={active.main.alt || title}
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          priority
          className={styles.image}
        />
      </div>

      {images.length > 1 ? (
        <ul className={styles.thumbs} aria-label="Product images">
          {images.map((image, index) => {
            const isActive = index === activeIndex

            return (
              <li key={image.thumb.url}>
                <button
                  type="button"
                  className={cx(styles.thumb, isActive && styles.active)}
                  aria-label={`Show image ${index + 1} of ${images.length}`}
                  aria-pressed={isActive}
                  onClick={() => setActiveIndex(index)}
                >
                  <Image
                    src={image.thumb.url}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 10vw, 20vw"
                    className={styles.thumbImage}
                  />
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
