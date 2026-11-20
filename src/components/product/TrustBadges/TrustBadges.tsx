import Image from 'next/image'

import type { ImageData } from '@/services/products'

import styles from './TrustBadges.module.scss'

export type TrustBadge = {
  title: string
  text?: string | null
  icon: ImageData | null
}

type TrustBadgesProps = {
  badges: TrustBadge[]
}

/** Row of reassurance badges (icon, title, short text): four columns, two on mobile. */
export function TrustBadges({ badges }: TrustBadgesProps) {
  if (badges.length === 0) return null

  return (
    <ul className={styles.list}>
      {badges.map((badge, index) => (
        <li key={`${badge.title}-${index}`} className={styles.item}>
          {badge.icon ? (
            // Small icons (often SVG): served as stored instead of going through the optimizer.
            <Image
              src={badge.icon.url}
              alt=""
              width={48}
              height={48}
              unoptimized
              className={styles.icon}
            />
          ) : null}
          <p className={styles.title}>{badge.title}</p>
          {badge.text ? <p className={styles.text}>{badge.text}</p> : null}
        </li>
      ))}
    </ul>
  )
}
