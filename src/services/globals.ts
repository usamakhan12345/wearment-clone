import { cache } from 'react'

import { getPayloadClient } from '@/lib/payload'

/**
 * Data-access layer for the site-wide globals (settings, header, footer). `depth: 1` populates the
 * logo / payment images. `overrideAccess: false` keeps the Local API honouring each global's read
 * rule. Wrapped in React `cache` so the layout, its children and `generateMetadata` share one query
 * per request.
 *
 * Fields on a global that was never saved can be missing at runtime even when the generated type
 * marks them required (e.g. `siteName`), so callers must treat every value as optional.
 */

export const getSiteSettings = cache(async () => {
  const payload = await getPayloadClient()

  return payload.findGlobal({ slug: 'site-settings', depth: 1, overrideAccess: false })
})

export const getHeader = cache(async () => {
  const payload = await getPayloadClient()

  return payload.findGlobal({ slug: 'header', depth: 1, overrideAccess: false })
})

export const getFooter = cache(async () => {
  const payload = await getPayloadClient()

  return payload.findGlobal({ slug: 'footer', depth: 1, overrideAccess: false })
})
