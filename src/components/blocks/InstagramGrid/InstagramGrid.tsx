import Image from 'next/image'

import { SmartLink } from '@/components/layout/shared/SmartLink'
import type { InstagramGridBlock } from '@/payload-types'
import { toImageData } from '@/services/products'

import styles from './InstagramGrid.module.scss'

/** Tight grid of cover-cropped social posts, each linking out to the post or the profile. */
export function InstagramGrid({ block }: { block: InstagramGridBlock }) {
  const items = (block.items ?? []).flatMap((item, index) => {
    const image = toImageData(item.image, 'card')
    if (!image) return []

    const caption = item.caption?.trim() ?? ''

    return [
      {
        id: item.id ?? String(index),
        image,
        href: item.link || block.profileUrl || null,
        // Posts without a caption fall back to the image's own alt text.
        alt: caption || image.alt,
        // Keeps the link named even when there is no caption and no alt text.
        label: caption || image.alt || `${block.heading} ${index + 1}`,
      },
    ]
  })

  if (items.length === 0) return null

  return (
    <section className={styles.section} aria-label={block.heading}>
      <h2 className={styles.heading}>{block.heading}</h2>

      <ul className={styles.grid}>
        {items.map((item) => (
          <li key={item.id} className={styles.cell}>
            <SmartLink href={item.href} newTab className={styles.link} aria-label={item.label}>
              <Image
                src={item.image.url}
                alt={item.alt}
                fill
                sizes="(min-width: 64rem) 14vw, 33vw"
                className={styles.image}
              />
            </SmartLink>
          </li>
        ))}
      </ul>
    </section>
  )
}
