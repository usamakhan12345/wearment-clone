import type { Where } from 'payload'

import type { Availability, SortValue } from './query'

/** Maps a validated sort value to Payload's sort syntax (`-` prefix means descending). */
export function toPayloadSort(sort: SortValue): string {
  switch (sort) {
    case 'created-ascending':
      return 'createdAt'
    case 'price-ascending':
      return 'price'
    case 'price-descending':
      return '-price'
    case 'title-ascending':
      return 'title'
    case 'title-descending':
      return '-title'
    case 'created-descending':
    default:
      return '-createdAt'
  }
}

export type ProductFilter = {
  /** Category id; `null` means no category restriction (the virtual "all" collection). */
  collectionId?: string | null
  availability?: Availability | null
  priceMin?: number | null
  priceMax?: number | null
  /** Free-text title search (case-insensitive, every word must match). */
  search?: string | null
}

/** Builds the Payload `where` clause for the products listing from already-validated input. */
export function buildProductWhere(filter: ProductFilter): Where {
  const conditions: Where[] = []

  if (filter.collectionId) conditions.push({ categories: { equals: filter.collectionId } })

  if (filter.availability === 'in') conditions.push({ available: { equals: true } })
  if (filter.availability === 'out') conditions.push({ available: { equals: false } })

  if (filter.priceMin !== null && filter.priceMin !== undefined) {
    conditions.push({ price: { greater_than_equal: filter.priceMin } })
  }
  if (filter.priceMax !== null && filter.priceMax !== undefined) {
    conditions.push({ price: { less_than_equal: filter.priceMax } })
  }

  if (filter.search) conditions.push({ title: { like: filter.search } })

  return conditions.length > 0 ? { and: conditions } : {}
}
