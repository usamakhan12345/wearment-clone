/**
 * Parsing and serialising of catalog (collection / search) query parameters.
 *
 * URL params are untrusted input: every value is validated here, once, and unknown or malformed
 * values fall back to defaults instead of reaching the database layer.
 */

export const SORT_OPTIONS = [
  { value: 'created-descending', label: 'Date, new to old' },
  { value: 'created-ascending', label: 'Date, old to new' },
  { value: 'price-ascending', label: 'Price, low to high' },
  { value: 'price-descending', label: 'Price, high to low' },
  { value: 'title-ascending', label: 'Alphabetically, A-Z' },
  { value: 'title-descending', label: 'Alphabetically, Z-A' },
] as const

export type SortValue = (typeof SORT_OPTIONS)[number]['value']
export type Availability = 'in' | 'out'

export const DEFAULT_SORT: SortValue = 'created-descending'
/** Large enough that a typical collection (the live store's Linen has 27) fits on one page. */
export const PAGE_SIZE = 50

const MAX_PAGE = 10_000
const MAX_PRICE = 10_000_000

export type CatalogQuery = {
  sort: SortValue
  page: number
  availability: Availability | null
  priceMin: number | null
  priceMax: number | null
}

/** Shape of Next's `searchParams` (or `Object.fromEntries` of a form). */
export type RawSearchParams = Record<string, string | string[] | undefined>

const SORT_VALUES: readonly string[] = SORT_OPTIONS.map((option) => option.value)

function firstValue(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw
}

/** Reads the first non-empty value among `keys`, so Shopify's legacy param names still work. */
function readParam(params: RawSearchParams, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = firstValue(params[key])?.trim()
    if (value) return value
  }

  return undefined
}

export function parseSort(raw: string | undefined): SortValue {
  const value = raw?.trim().toLowerCase()

  return value && SORT_VALUES.includes(value) ? (value as SortValue) : DEFAULT_SORT
}

export function parseAvailability(raw: string | undefined): Availability | null {
  switch (raw?.trim().toLowerCase()) {
    case 'in':
    case '1':
      return 'in'
    case 'out':
    case '0':
      return 'out'
    default:
      return null
  }
}

/** Accepts plain non-negative decimals with at most two fraction digits. */
export function parsePrice(raw: string | undefined): number | null {
  const value = raw?.trim()
  if (!value || !/^\d+(\.\d{1,2})?$/.test(value)) return null

  const amount = Number(value)

  return Number.isFinite(amount) && amount <= MAX_PRICE ? amount : null
}

export function parsePage(raw: string | undefined): number {
  const value = raw?.trim()
  if (!value || !/^\d+$/.test(value)) return 1

  const page = Number(value)

  return Number.isSafeInteger(page) && page >= 1 ? Math.min(page, MAX_PAGE) : 1
}

/**
 * Turns raw URL params into a validated query. Garbage is ignored; a reversed price range is
 * swapped rather than producing an always-empty result.
 */
export function parseCatalogSearchParams(params: RawSearchParams): CatalogQuery {
  let priceMin = parsePrice(readParam(params, 'price_min', 'filter.v.price.gte'))
  let priceMax = parsePrice(readParam(params, 'price_max', 'filter.v.price.lte'))

  if (priceMin !== null && priceMax !== null && priceMin > priceMax) {
    ;[priceMin, priceMax] = [priceMax, priceMin]
  }

  return {
    sort: parseSort(readParam(params, 'sort_by')),
    page: parsePage(readParam(params, 'page')),
    availability: parseAvailability(readParam(params, 'availability', 'filter.v.availability')),
    priceMin,
    priceMax,
  }
}

/** Reads the free-text search term: trimmed, whitespace collapsed, length-capped. */
export function parseSearchTerm(
  raw: string | string[] | undefined,
  maxLength = 100,
): string | null {
  const value = firstValue(raw)?.replace(/\s+/g, ' ').trim().slice(0, maxLength).trim()

  return value ? value : null
}

export function hasActiveFilters(query: CatalogQuery): boolean {
  return query.availability !== null || query.priceMin !== null || query.priceMax !== null
}

/**
 * Builds a link to `basePath` carrying `query`, leaving out default values so URLs stay short
 * and canonical. `extra` params (e.g. the search term) are kept as given.
 */
export function buildCatalogHref(
  basePath: string,
  query: Partial<CatalogQuery>,
  extra: Record<string, string | null | undefined> = {},
): string {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, value)
  }

  if (query.sort && query.sort !== DEFAULT_SORT) params.set('sort_by', query.sort)
  if (query.availability) params.set('availability', query.availability)
  if (query.priceMin !== null && query.priceMin !== undefined) {
    params.set('price_min', String(query.priceMin))
  }
  if (query.priceMax !== null && query.priceMax !== undefined) {
    params.set('price_max', String(query.priceMax))
  }
  if (query.page && query.page > 1) params.set('page', String(query.page))

  const search = params.toString()

  return search ? `${basePath}?${search}` : basePath
}
