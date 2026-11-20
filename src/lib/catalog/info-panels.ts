/**
 * Maps the CMS `infoPanels` entries onto the product page's fixed buttons. Panels are matched by
 * title keywords so editors can name them naturally ("Returns & Refunds", "Shipping Info", ...).
 */

export type InfoSlotKey = 'size-chart' | 'returns' | 'shipping'

export const INFO_SLOTS: readonly {
  key: InfoSlotKey
  label: string
  keywords: readonly string[]
}[] = [
  { key: 'size-chart', label: 'Size Chart', keywords: ['size'] },
  { key: 'returns', label: 'Returns & Refunds', keywords: ['return', 'refund', 'exchange'] },
  { key: 'shipping', label: 'Shipping Info', keywords: ['shipping', 'delivery'] },
]

export type MatchedInfoPanels<T> = {
  slots: Record<InfoSlotKey, T | null>
  /** Panels that fit none of the slots; still reachable so no CMS content is silently dropped. */
  extra: T[]
}

function normalise(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function matchInfoPanels<T extends { title: string }>(
  panels: readonly T[],
): MatchedInfoPanels<T> {
  const slots: Record<InfoSlotKey, T | null> = { 'size-chart': null, returns: null, shipping: null }
  const extra: T[] = []

  for (const panel of panels) {
    const title = normalise(panel.title)
    const slot = INFO_SLOTS.find(
      ({ key, keywords }) =>
        slots[key] === null && keywords.some((keyword) => title.includes(keyword)),
    )

    if (slot) slots[slot.key] = panel
    else extra.push(panel)
  }

  return { slots, extra }
}
