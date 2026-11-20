/**
 * Pure helpers for the product page option selector: normalise CMS variants, pick the default
 * selection, resolve the selected variant and work out which option values can be bought.
 */

export type OptionData = {
  name: string
  values: string[]
}

export type VariantData = {
  id: string
  title: string
  /** Option values aligned with `OptionData[]` (index 0 = option1). */
  options: (string | null)[]
  price: number
  compareAtPrice: number | null
  available: boolean
}

export type OptionValueState = {
  value: string
  selected: boolean
  /** The value cannot be bought together with the other current selections (shown struck out). */
  unavailable: boolean
  /** No variant with this value is available at all, so it cannot be chosen. */
  disabled: boolean
}

type CmsOption = { name: string; values: string[] }
type CmsVariant = {
  id?: string | null
  title: string
  option1?: string | null
  option2?: string | null
  option3?: string | null
  price: number
  compareAtPrice?: number | null
  available?: boolean | null
}

const MAX_OPTIONS = 3

export function toOptionData(options: readonly CmsOption[] | null | undefined): OptionData[] {
  return (options ?? [])
    .slice(0, MAX_OPTIONS)
    .map((option) => ({ name: option.name, values: option.values ?? [] }))
}

/**
 * Normalises CMS variants. When the importer left `option1..3` empty but the product has options,
 * the values are recovered from the variant title ("Red / M" -> ["Red", "M"]).
 */
export function toVariantData(
  variants: readonly CmsVariant[] | null | undefined,
  optionCount: number,
): VariantData[] {
  return (variants ?? []).map((variant, index) => {
    let options: (string | null)[] = [
      variant.option1 ?? null,
      variant.option2 ?? null,
      variant.option3 ?? null,
    ].slice(0, Math.max(optionCount, 0))

    if (optionCount > 0 && options.every((value) => value === null)) {
      const parts = variant.title.split('/').map((part) => part.trim())
      options = options.map((_, optionIndex) => parts[optionIndex] || null)
    }

    const compareAtPrice =
      variant.compareAtPrice && variant.compareAtPrice > variant.price
        ? variant.compareAtPrice
        : null

    return {
      id: variant.id ?? `variant-${index}`,
      title: variant.title,
      options,
      price: variant.price,
      compareAtPrice,
      available: variant.available !== false,
    }
  })
}

/** Shopify's placeholder option for single-variant products; there is nothing to choose. */
export function isDefaultOption(option: OptionData): boolean {
  return (
    option.name.trim().toLowerCase() === 'title' &&
    option.values.length === 1 &&
    option.values[0]?.trim().toLowerCase() === 'default title'
  )
}

/** The first available variant (or the first variant when everything is sold out). */
export function pickDefaultVariant(variants: readonly VariantData[]): VariantData | null {
  return variants.find((variant) => variant.available) ?? variants[0] ?? null
}

/** Selection (one value per option) that corresponds to the default variant. */
export function getDefaultSelection(
  options: readonly OptionData[],
  variants: readonly VariantData[],
): string[] {
  const variant = pickDefaultVariant(variants)

  return options.map((option, index) => variant?.options[index] ?? option.values[0] ?? '')
}

export function selectOption(selection: readonly string[], index: number, value: string): string[] {
  const next = [...selection]
  next[index] = value

  return next
}

/** The variant matching the selection exactly, or `null` when that combination does not exist. */
export function findVariant(
  options: readonly OptionData[],
  variants: readonly VariantData[],
  selection: readonly string[],
): VariantData | null {
  if (options.length === 0) return pickDefaultVariant(variants)

  return (
    variants.find((variant) =>
      options.every((_, index) => variant.options[index] === selection[index]),
    ) ?? null
  )
}

/** State of every value of the option at `optionIndex`, given the current selection. */
export function getOptionValueStates(
  options: readonly OptionData[],
  variants: readonly VariantData[],
  selection: readonly string[],
  optionIndex: number,
): OptionValueState[] {
  const option = options[optionIndex]
  if (!option) return []

  return option.values.map((value) => {
    const withValue = variants.filter((variant) => variant.options[optionIndex] === value)
    const buyable = withValue.filter((variant) => variant.available)
    const matchesRest = (variant: VariantData) =>
      options.every(
        (_, index) => index === optionIndex || variant.options[index] === selection[index],
      )
    const selected = selection[optionIndex] === value

    return {
      value,
      selected,
      unavailable: !buyable.some(matchesRest),
      disabled: buyable.length === 0 && !selected,
    }
  })
}
