import Image from 'next/image'

import { isSvgUrl } from '@/components/layout/shared/imageSize'
import type { FeatureStripBlock } from '@/payload-types'
import { toImageData } from '@/services/products'

import styles from './FeatureStrip.module.scss'

// Icons are small SVGs; used when the file reports no intrinsic size.
const FALLBACK_ICON_SIZE = 32

/** Row of reassurance points (shipping, returns, support...) under a thin top border. */
export function FeatureStrip({ block }: { block: FeatureStripBlock }) {
  const items = (block.items ?? []).flatMap((item, index) => {
    const title = item.title?.trim()

    return title
      ? [
          {
            id: item.id ?? String(index),
            title,
            text: item.text?.trim() ?? '',
            icon: toImageData(item.icon, 'original'),
          },
        ]
      : []
  })

  if (items.length === 0) return null

  return (
    <section className={styles.section}>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id} className={styles.item}>
            <span className={styles.icon}>
              {item.icon ? (
                <Image
                  src={item.icon.url}
                  // Decorative: the adjacent title carries the meaning.
                  alt=""
                  width={item.icon.width ?? FALLBACK_ICON_SIZE}
                  height={item.icon.height ?? FALLBACK_ICON_SIZE}
                  unoptimized={isSvgUrl(item.icon.url)}
                  className={styles.iconImage}
                />
              ) : null}
            </span>

            <div>
              <h2 className={styles.title}>{item.title}</h2>
              {item.text ? <p className={styles.text}>{item.text}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
