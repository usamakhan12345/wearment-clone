import type { Where } from 'payload'
import { cache } from 'react'

import type { Media, Product } from '@/payload-types'
import {
  DEFAULT_SORT,
  PAGE_SIZE,
  parseSearchTerm,
  type CatalogQuery,
  type SortValue,
} from '@/lib/catalog/query'
import { buildProductWhere, toPayloadSort } from '@/lib/catalog/where'
import { getPayloadClient } from '@/lib/payload'

/**
 * Data-access layer for products. All queries pass `overrideAccess: false` so the Local API
 * enforces the collection's access rules (drafts stay private).
 */

/** Hard upper bound for any listing page, regardless of what a caller asks for. */
const MAX_PAGE_SIZE = 60

export type ImageData = {
  url: string
  alt: string
  width: number | null
  height: number | null
}

/** Minimal shape the storefront cards need; keeps components decoupled from the CMS document. */
export type ProductCardData = {
  id: string
  title: string
  handle: string
  price: number
  compareAtPrice: number | null
  available: boolean
  image: ImageData | null
}

/** Picks a rendition from an uploaded media doc. Returns `null` for unpopulated relationships. */
export function toImageData(
  media: Media | string | null | undefined,
  size: 'card' | 'original' = 'original',
): ImageData | null {
  if (!media || typeof media === 'string' || !media.url) return null

  const rendition = size === 'card' ? media.sizes?.card : null
  const source = rendition?.url ? rendition : media

  return {
    url: source.url ?? media.url,
    alt: media.alt,
    width: source.width ?? null,
    height: source.height ?? null,
  }
}

export function toProductCardData(product: Product): ProductCardData {
  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    price: product.price ?? 0,
    compareAtPrice: product.compareAtPrice ?? null,
    available: product.available ?? true,
    image: toImageData(product.images?.[0], 'card'),
  }
}

/** Newest products first; `depth: 1` populates the images the cards need. */
export const getProductsByCollection = cache(async (collectionId: string, limit: number) => {
  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'products',
    depth: 1,
    limit,
    sort: '-createdAt',
    where: { categories: { equals: collectionId } },
    overrideAccess: false,
  })

  return docs.map(toProductCardData)
})

/** Returns the requested products in the same order as `ids`, skipping any that are not visible. */
export const getProductsByIds = cache(async (ids: string[]) => {
  if (ids.length === 0) return []

  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'products',
    depth: 1,
    limit: ids.length,
    pagination: false,
    where: { id: { in: ids } },
    overrideAccess: false,
  })

  const byId = new Map(docs.map((doc) => [doc.id, doc]))

  return ids.flatMap((id) => {
    const doc = byId.get(id)
    return doc ? [toProductCardData(doc)] : []
  })
})

/** One page of storefront product cards plus the totals needed to render a pager. */
export type ProductPage = {
  products: ProductCardData[]
  totalDocs: number
  totalPages: number
  page: number
}

async function findProductPage(
  where: Where,
  sort: SortValue,
  page: number,
  pageSize: number,
): Promise<ProductPage> {
  const payload = await getPayloadClient()

  const result = await payload.find({
    collection: 'products',
    depth: 1,
    limit: pageSize,
    page,
    sort: toPayloadSort(sort),
    where,
    overrideAccess: false,
  })

  return {
    products: result.docs.map(toProductCardData),
    totalDocs: result.totalDocs,
    totalPages: result.totalPages,
    page: result.page ?? page,
  }
}

export type CollectionProductsQuery = Partial<Omit<CatalogQuery, 'sort'>> & {
  /** Category id, or `null` for the virtual "all" collection. */
  collectionId: string | null
  sort?: SortValue
  pageSize?: number
}

/**
 * Filtered, sorted, paginated products of a collection. Inputs must already be validated (see
 * `parseCatalogSearchParams`); the page size is capped so a caller cannot request unbounded lists.
 */
export async function getCollectionProducts({
  collectionId,
  sort = DEFAULT_SORT,
  page = 1,
  availability = null,
  priceMin = null,
  priceMax = null,
  pageSize = PAGE_SIZE,
}: CollectionProductsQuery): Promise<ProductPage> {
  const where = buildProductWhere({ collectionId, availability, priceMin, priceMax })

  return findProductPage(
    where,
    sort,
    Math.max(page, 1),
    Math.min(Math.max(pageSize, 1), MAX_PAGE_SIZE),
  )
}

/** Case-insensitive title search (every word must match), newest first. */
export async function searchProducts(query: string, page = 1): Promise<ProductPage> {
  const search = parseSearchTerm(query)

  if (!search) return { products: [], totalDocs: 0, totalPages: 0, page: 1 }

  return findProductPage(buildProductWhere({ search }), DEFAULT_SORT, Math.max(page, 1), PAGE_SIZE)
}

/** Full product document for the product page; `depth: 2` populates images and categories. */
export const getProductByHandle = cache(async (handle: string) => {
  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'products',
    depth: 2,
    limit: 1,
    pagination: false,
    where: { handle: { equals: handle } },
    overrideAccess: false,
  })

  return docs[0] ?? null
})

/** Newest products from the product's first collection, excluding the product itself. */
export const getRelatedProducts = cache(async (product: Product, limit = 4) => {
  const first = product.categories?.[0]
  const categoryId = typeof first === 'string' ? first : first?.id

  if (!categoryId) return []

  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'products',
    depth: 1,
    limit,
    pagination: false,
    sort: '-createdAt',
    where: { and: [{ categories: { equals: categoryId } }, { id: { not_equals: product.id } }] },
    overrideAccess: false,
  })

  return docs.map(toProductCardData)
})
