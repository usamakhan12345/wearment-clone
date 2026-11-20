import { cache } from 'react'

import { getPayloadClient } from '@/lib/payload'

/**
 * Data-access layer for content shared by every product page. `overrideAccess: false` makes the
 * Local API honour the global's read rule. Wrapped in React `cache` so `generateMetadata` and the
 * page share one query per request.
 *
 * A global that was never saved can have missing fields at runtime, so callers must treat every
 * value as optional.
 */

/** Notices, coupons, info panels, trust badges and testimonials; `depth: 1` populates images. */
export const getProductPageSettings = cache(async () => {
  const payload = await getPayloadClient()

  return payload.findGlobal({
    slug: 'product-page-settings',
    depth: 1,
    overrideAccess: false,
  })
})
