import { CopyButton } from '@/components/product/CopyButton/CopyButton'

import styles from './DealsBox.module.scss'

export type Deal = {
  code: string
  description: string
}

type DealsBoxProps = {
  heading?: string | null
  deals: Deal[]
}

/** Dashed "Exclusive Deals" box: each coupon code has a working copy-to-clipboard button. */
export function DealsBox({ heading, deals }: DealsBoxProps) {
  if (deals.length === 0) return null

  return (
    <section className={styles.box} aria-label={heading || 'Exclusive deals'}>
      {heading ? <h2 className={styles.heading}>{heading}</h2> : null}

      <ul className={styles.list}>
        {deals.map((deal, index) => (
          <li key={`${deal.code}-${index}`} className={styles.item}>
            <code className={styles.code}>{deal.code}</code>
            <CopyButton value={deal.code} />
            <span className={styles.description}>{deal.description}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
