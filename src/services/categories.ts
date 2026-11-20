import { cache } from 'react'

import { getPayloadClient } from '@/lib/payload'

import { toImageData, type ImageData } from './products'

/**
 * Data-access layer for collections (the `categories` collection; Shopify calls them
 * "collections"). Queries pass `overrideAccess: false` so the Local API enforces access rules.
 */

/** Handle of the virtual collection that lists every product. */
export const ALL_COLLECTION_HANDLE = 'all'

export type CollectionData = {
  /** `null` for the virtual "all" collection, which has no category filter. */
  id: string | null
  handle: string
  title: string
  description: string | null
  image: ImageData | null
}

const ALL_COLLECTION: CollectionData = {
  id: null,
  handle: ALL_COLLECTION_HANDLE,
  title: 'Products',
  description: null,
  image: null,
}

/** Resolves a collection by URL handle, or `null` when it does not exist. */
export const getCollectionByHandle = cache(
  async (handle: string): Promise<CollectionData | null> => {
    if (handle === ALL_COLLECTION_HANDLE) return ALL_COLLECTION

    const payload = await getPayloadClient()

    const { docs } = await payload.find({
      collection: 'categories',
      depth: 1,
      limit: 1,
      pagination: false,
      where: { handle: { equals: handle } },
      overrideAccess: false,
    })

    const category = docs[0]
    if (!category) return null

    return {
      id: category.id,
      handle: category.handle,
      title: category.title,
      description: category.description?.trim() || null,
      image: toImageData(category.image, 'large'),
    }
  },
)
