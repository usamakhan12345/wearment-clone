import Link from 'next/link'
import type { ReactNode } from 'react'

import styles from './EmptyState.module.scss'

type EmptyStateProps = {
  title: string
  children?: ReactNode
  action?: { href: string; label: string }
}

/** Shown when a listing has no results. */
export function EmptyState({ title, children, action }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <h2 className={styles.title}>{title}</h2>
      {children ? <p className={styles.text}>{children}</p> : null}
      {action ? (
        <Link href={action.href} className={styles.action}>
          {action.label}
        </Link>
      ) : null}
    </div>
  )
}
