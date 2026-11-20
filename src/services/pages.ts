import { cache } from 'react'

import { getPayloadClient } from '@/lib/payload'

/**
 * Data-access layer for the `pages` collection. Route files call these functions instead of
 * touching the Payload client directly, so query details live in one place.
 *
 * `overrideAccess: false` makes the Local API enforce the collection's access rules (the Local
 * API bypasses them by default). With no user attached, that restricts results to published docs.
 *
 * Wrapped in React `cache` so `generateMetadata` and the page component share a single query per
 * request.
 */

const LIST_LIMIT = 50

export const getPublishedPages = cache(async () => {
  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'pages',
    depth: 0,
    limit: LIST_LIMIT,
    sort: 'title',
    select: { title: true, slug: true },
    overrideAccess: false,
  })

  return docs
})

export const getPageBySlug = cache(async (slug: string) => {
  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'pages',
    depth: 1,
    limit: 1,
    pagination: false,
    where: { slug: { equals: slug } },
    overrideAccess: false,
  })

  return docs[0] ?? null
})
