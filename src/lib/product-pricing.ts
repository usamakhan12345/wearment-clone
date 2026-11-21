export type PricedVariant = {
  price: number
  compareAtPrice?: number | null
  available?: boolean | null
}

export type ProductPricing = {
  price: number
  compareAtPrice: number | null
  available: boolean
}

/**
 * Derives the product-level fields used for listing, sorting and filtering from its variants.
 * The cheapest variant sets the displayed price; the product is available if any variant is.
 * Returns `null` when there are no variants so callers can leave existing values untouched.
 */
export function deriveProductPricing(
  variants: PricedVariant[] | null | undefined,
): ProductPricing | null {
  if (!variants || variants.length === 0) return null

  const cheapest = variants.reduce((best, variant) => (variant.price < best.price ? variant : best))

  return {
    price: cheapest.price,
    compareAtPrice:
      cheapest.compareAtPrice && cheapest.compareAtPrice > cheapest.price
        ? cheapest.compareAtPrice
        : null,
    available: variants.some((variant) => variant.available !== false),
  }
}

/** Whole-number discount percentage, or `null` when the item is not discounted. */
export function discountPercent(
  price: number,
  compareAtPrice: number | null | undefined,
): number | null {
  if (!compareAtPrice || compareAtPrice <= price) return null

  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
}
