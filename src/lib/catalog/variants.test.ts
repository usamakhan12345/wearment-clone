import { describe, expect, it } from 'vitest'

import {
  findVariant,
  getDefaultSelection,
  getOptionValueStates,
  isDefaultOption,
  selectOption,
  toOptionData,
  toVariantData,
  type VariantData,
} from './variants'

const sizeOption = toOptionData([{ name: 'Size', values: ['S', 'M', 'L', 'XL'] }])

const sizeVariants = toVariantData(
  [
    { title: 'S', option1: 'S', price: 2990, compareAtPrice: 4500, available: false },
    { title: 'M', option1: 'M', price: 2990, compareAtPrice: 4500, available: false },
    { title: 'L', option1: 'L', price: 2990, compareAtPrice: 4500, available: true },
    { title: 'XL', option1: 'XL', price: 3190, compareAtPrice: null, available: false },
  ],
  1,
)

describe('toVariantData', () => {
  it('drops compare-at prices that are not above the price', () => {
    const [variant] = toVariantData(
      [{ title: 'S', option1: 'S', price: 100, compareAtPrice: 100 }],
      1,
    )
    expect(variant?.compareAtPrice).toBeNull()
  })

  it('treats a missing availability flag as available and generates ids', () => {
    const [variant] = toVariantData([{ title: 'S', option1: 'S', price: 100 }], 1)
    expect(variant).toMatchObject({ available: true, id: 'variant-0' })
  })

  it('recovers option values from the title when option fields are empty', () => {
    const [variant] = toVariantData([{ title: 'Red / M', price: 100 }], 2)
    expect(variant?.options).toEqual(['Red', 'M'])
  })

  it('keeps option fields aligned to the option count', () => {
    const [variant] = toVariantData([{ title: 'S', option1: 'S', option2: 'x', price: 100 }], 1)
    expect(variant?.options).toEqual(['S'])
  })
})

describe('isDefaultOption', () => {
  it('detects the Shopify placeholder option', () => {
    expect(isDefaultOption({ name: 'Title', values: ['Default Title'] })).toBe(true)
    expect(isDefaultOption({ name: 'Size', values: ['Default Title'] })).toBe(false)
    expect(isDefaultOption({ name: 'Title', values: ['A', 'B'] })).toBe(false)
  })
})

describe('getDefaultSelection', () => {
  it('selects the first available variant', () => {
    expect(getDefaultSelection(sizeOption, sizeVariants)).toEqual(['L'])
  })

  it('falls back to the first variant when everything is sold out', () => {
    const soldOut = sizeVariants.map((variant) => ({ ...variant, available: false }))
    expect(getDefaultSelection(sizeOption, soldOut)).toEqual(['S'])
  })

  it('returns an empty selection for products without options', () => {
    expect(getDefaultSelection([], sizeVariants)).toEqual([])
  })
})

describe('findVariant', () => {
  it('finds the variant matching the selection', () => {
    expect(findVariant(sizeOption, sizeVariants, ['XL'])?.price).toBe(3190)
  })

  it('returns null for a combination that does not exist', () => {
    expect(findVariant(sizeOption, sizeVariants, ['XXL'])).toBeNull()
  })

  it('returns the default variant when the product has no options', () => {
    expect(findVariant([], sizeVariants, [])?.title).toBe('L')
  })
})

describe('getOptionValueStates', () => {
  it('marks sold-out values as unavailable and disabled', () => {
    const states = getOptionValueStates(sizeOption, sizeVariants, ['L'], 0)

    expect(
      states.map(({ value, selected, unavailable, disabled }) => ({
        value,
        selected,
        unavailable,
        disabled,
      })),
    ).toEqual([
      { value: 'S', selected: false, unavailable: true, disabled: true },
      { value: 'M', selected: false, unavailable: true, disabled: true },
      { value: 'L', selected: true, unavailable: false, disabled: false },
      { value: 'XL', selected: false, unavailable: true, disabled: true },
    ])
  })

  it('keeps a selected sold-out value enabled', () => {
    const states = getOptionValueStates(sizeOption, sizeVariants, ['S'], 0)
    expect(states[0]).toMatchObject({
      value: 'S',
      selected: true,
      unavailable: true,
      disabled: false,
    })
  })

  describe('with two options', () => {
    const options = toOptionData([
      { name: 'Color', values: ['Red', 'Blue'] },
      { name: 'Size', values: ['M', 'L'] },
    ])
    const variants: VariantData[] = toVariantData(
      [
        { title: 'Red / M', option1: 'Red', option2: 'M', price: 100, available: true },
        { title: 'Red / L', option1: 'Red', option2: 'L', price: 100, available: false },
        { title: 'Blue / M', option1: 'Blue', option2: 'M', price: 100, available: false },
        { title: 'Blue / L', option1: 'Blue', option2: 'L', price: 100, available: true },
      ],
      2,
    )

    it('strikes out values that cannot be combined with the other selection yet stay choosable', () => {
      const sizes = getOptionValueStates(options, variants, ['Red', 'M'], 1)

      // L exists in stock (as Blue / L) so it stays selectable, but Red / L is sold out.
      expect(sizes[1]).toMatchObject({ value: 'L', unavailable: true, disabled: false })
      expect(sizes[0]).toMatchObject({ value: 'M', unavailable: false, disabled: false })
    })

    it('lets the user reach every in-stock combination', () => {
      let selection = getDefaultSelection(options, variants)
      expect(selection).toEqual(['Red', 'M'])

      selection = selectOption(selection, 1, 'L')
      expect(findVariant(options, variants, selection)?.available).toBe(false)

      selection = selectOption(selection, 0, 'Blue')
      expect(findVariant(options, variants, selection)?.available).toBe(true)
    })
  })
})

describe('selectOption', () => {
  it('returns a new array with one value replaced', () => {
    const original = ['Red', 'M']
    const next = selectOption(original, 1, 'L')

    expect(next).toEqual(['Red', 'L'])
    expect(original).toEqual(['Red', 'M'])
  })
})
