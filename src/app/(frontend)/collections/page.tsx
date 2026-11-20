import { redirect } from 'next/navigation'

import { ALL_COLLECTION_HANDLE } from '@/services/categories'

/** Shopify's `/collections` index is not part of this build; send visitors to the full catalog. */
export default function CollectionsIndexPage() {
  redirect(`/collections/${ALL_COLLECTION_HANDLE}`)
}
