'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react'

import {
  buildCatalogHref,
  hasActiveFilters,
  parseCatalogSearchParams,
  SORT_OPTIONS,
  type CatalogQuery,
  type SortValue,
} from '@/lib/catalog/query'

import styles from './CatalogControls.module.scss'

type CatalogControlsProps = {
  /** Path of the listing; filters are applied as GET params on this URL. */
  basePath: string
  /** The validated query the server rendered the page with. */
  query: CatalogQuery
  /** Total number of matching products. */
  total: number
}

type FormValues = {
  sort: SortValue
  availability: '' | 'in' | 'out'
  priceMin: string
  priceMax: string
}

function toFormValues(query: CatalogQuery): FormValues {
  return {
    sort: query.sort,
    availability: query.availability ?? '',
    priceMin: query.priceMin === null ? '' : String(query.priceMin),
    priceMax: query.priceMax === null ? '' : String(query.priceMax),
  }
}

function Chevron() {
  return (
    <svg className={styles.chevron} viewBox="0 0 12 8" width="12" height="8" aria-hidden="true">
      <path d="m1 1.5 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

/**
 * Filter and sort controls for a listing. State lives in the URL: the controls are a plain GET
 * form (works without JavaScript) that, when JavaScript is available, navigates client-side
 * to the same URL it would have submitted to.
 */
export function CatalogControls({ basePath, query, total }: CatalogControlsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const filtersRef = useRef<HTMLDivElement>(null)

  const [values, setValues] = useState(() => toFormValues(query))

  // Keep the inputs in sync when the URL changes from outside (back button, "clear" link).
  const queryKey = `${query.sort}|${query.availability}|${query.priceMin}|${query.priceMax}`
  const [syncedKey, setSyncedKey] = useState(queryKey)
  if (syncedKey !== queryKey) {
    setSyncedKey(queryKey)
    setValues(toFormValues(query))
  }

  // Close an open dropdown on outside click, when focus leaves it, or on Escape.
  useEffect(() => {
    const container = filtersRef.current
    if (!container) return

    const closeOthers = (event: Event) => {
      container.querySelectorAll<HTMLDetailsElement>('details[open]').forEach((details) => {
        if (!(event.target instanceof Node) || !details.contains(event.target)) details.open = false
      })
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return

      container.querySelectorAll<HTMLDetailsElement>('details[open]').forEach((details) => {
        details.open = false
        details.querySelector('summary')?.focus()
      })
    }

    document.addEventListener('pointerdown', closeOthers)
    document.addEventListener('focusin', closeOthers)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('pointerdown', closeOthers)
      document.removeEventListener('focusin', closeOthers)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  function apply(next: FormValues) {
    // Re-validate through the same parser the server uses; applying filters returns to page 1.
    const parsed = parseCatalogSearchParams({
      sort_by: next.sort,
      availability: next.availability,
      price_min: next.priceMin,
      price_max: next.priceMax,
    })

    filtersRef.current
      ?.querySelectorAll<HTMLDetailsElement>('details[open]')
      .forEach((details) => (details.open = false))

    startTransition(() => router.push(buildCatalogHref(basePath, parsed), { scroll: false }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    apply(values)
  }

  const filtersActive = hasActiveFilters(query)
  const availabilityCount = query.availability ? 1 : 0
  const priceCount = query.priceMin !== null || query.priceMax !== null ? 1 : 0

  return (
    <form
      className={styles.bar}
      method="get"
      action={basePath}
      onSubmit={handleSubmit}
      aria-busy={isPending}
    >
      <div className={styles.filters} ref={filtersRef} role="group" aria-labelledby="filter-label">
        <span className={styles.label} id="filter-label">
          Filter:
        </span>

        <details className={styles.dropdown}>
          <summary className={styles.summary}>
            Availability{availabilityCount > 0 ? ` (${availabilityCount})` : ''}
            <Chevron />
          </summary>
          <fieldset className={styles.panel}>
            <legend className={styles.panelLegend}>Availability</legend>
            {(
              [
                { value: '', label: 'All' },
                { value: 'in', label: 'In stock' },
                { value: 'out', label: 'Out of stock' },
              ] as const
            ).map((option) => (
              <label key={option.value} className={styles.choice}>
                <input
                  type="radio"
                  name="availability"
                  value={option.value}
                  checked={values.availability === option.value}
                  onChange={() => {
                    const next = { ...values, availability: option.value }
                    setValues(next)
                    apply(next)
                  }}
                />
                {option.label}
              </label>
            ))}
          </fieldset>
        </details>

        <details className={styles.dropdown}>
          <summary className={styles.summary}>
            Price{priceCount > 0 ? ` (${priceCount})` : ''}
            <Chevron />
          </summary>
          <fieldset className={styles.panel}>
            <legend className={styles.panelLegend}>Price (Rs.)</legend>
            <div className={styles.priceRow}>
              <label className={styles.priceField}>
                <span>From</span>
                <input
                  type="number"
                  name="price_min"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={values.priceMin}
                  onChange={(event) => setValues({ ...values, priceMin: event.target.value })}
                />
              </label>
              <label className={styles.priceField}>
                <span>To</span>
                <input
                  type="number"
                  name="price_max"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={values.priceMax}
                  onChange={(event) => setValues({ ...values, priceMax: event.target.value })}
                />
              </label>
            </div>
            <button type="submit" className={styles.apply}>
              Apply
            </button>
          </fieldset>
        </details>

        {filtersActive ? (
          <Link href={buildCatalogHref(basePath, { sort: query.sort })} className={styles.clear}>
            Clear filters
          </Link>
        ) : null}
      </div>

      <div className={styles.sorting}>
        <label className={styles.label} htmlFor="catalog-sort">
          Sort by:
        </label>
        <div className={styles.selectWrap}>
          <select
            id="catalog-sort"
            name="sort_by"
            className={styles.select}
            value={values.sort}
            onChange={(event) => {
              const next = { ...values, sort: event.target.value as SortValue }
              setValues(next)
              apply(next)
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Chevron />
        </div>

        <p className={styles.count} aria-live="polite">
          {total} {total === 1 ? 'product' : 'products'}
        </p>
      </div>
    </form>
  )
}
