import { permanentRedirect } from 'next/navigation'

type PageProps = {
  params: Promise<{ productHandle: string }>
}

/** Old Shopify URLs (`/collections/x/products/y`) keep working by pointing at the canonical product URL. */
export default async function LegacyCollectionProductPage({ params }: PageProps) {
  const { productHandle } = await params

  permanentRedirect(`/products/${encodeURIComponent(productHandle)}`)
}
