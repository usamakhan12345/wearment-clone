/** schema.org Product structured data for the product page. */

export type ProductJsonLdInput = {
  name: string
  description?: string | null
  /** Absolute URLs when possible. */
  images?: string[]
  url?: string | null
  sku?: string | null
  brand?: string | null
  price?: number | null
  currency?: string
  available: boolean
}

export type ProductJsonLd = Record<string, unknown>

export function buildProductJsonLd(input: ProductJsonLdInput): ProductJsonLd {
  const data: ProductJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
  }

  if (input.description) data.description = input.description
  if (input.images && input.images.length > 0) data.image = input.images
  if (input.sku) data.sku = input.sku
  if (input.brand) data.brand = { '@type': 'Brand', name: input.brand }

  if (typeof input.price === 'number' && Number.isFinite(input.price)) {
    data.offers = {
      '@type': 'Offer',
      ...(input.url ? { url: input.url } : {}),
      price: input.price.toFixed(2),
      priceCurrency: input.currency ?? 'PKR',
      availability: input.available
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    }
  }

  return data
}

// Characters that could terminate the inline script element or the JS string, as JSON escapes.
const ESCAPES: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  [String.fromCharCode(0x2028)]: '\\u2028',
  [String.fromCharCode(0x2029)]: '\\u2029',
}

/** JSON for an inline `<script type="application/ld+json">`; escapes characters that could close it. */
export function serializeJsonLd(data: ProductJsonLd): string {
  return JSON.stringify(data).replace(
    new RegExp(`[${Object.keys(ESCAPES).join('')}]`, 'g'),
    (character) => ESCAPES[character] ?? character,
  )
}
