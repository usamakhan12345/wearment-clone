import Link from 'next/link'

import { getPageItems } from '@/lib/catalog/pagination'

import styles from './Pagination.module.scss'

type PaginationProps = {
  page: number
  totalPages: number
  /** Builds the URL of a page; keeps filters/sort/search term in sync with the current view. */
  buildHref: (page: number) => string
}

/** Numbered pager with real links, so every page is crawlable and works without JavaScript. */
export function Pagination({ page, totalPages, buildHref }: PaginationProps) {
  if (totalPages <= 1) return null

  const items = getPageItems(page, totalPages)

  return (
    <nav className={styles.nav} aria-label="Pagination">
      <ul className={styles.list}>
        {page > 1 ? (
          <li>
            <Link href={buildHref(page - 1)} className={styles.step} rel="prev">
              <span aria-hidden="true">&lsaquo;</span>
              <span className={styles.stepLabel}>Previous</span>
            </Link>
          </li>
        ) : null}

        {items.map((item, index) =>
          item === 'ellipsis' ? (
            <li key={`ellipsis-${index}`} className={styles.ellipsis} aria-hidden="true">
              &hellip;
            </li>
          ) : (
            <li key={item}>
              {item === page ? (
                <span className={styles.current} aria-current="page">
                  <span className={styles.srOnly}>Page </span>
                  {item}
                </span>
              ) : (
                <Link href={buildHref(item)} className={styles.link} aria-label={`Page ${item}`}>
                  {item}
                </Link>
              )}
            </li>
          ),
        )}

        {page < totalPages ? (
          <li>
            <Link href={buildHref(page + 1)} className={styles.step} rel="next">
              <span className={styles.stepLabel}>Next</span>
              <span aria-hidden="true">&rsaquo;</span>
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  )
}
