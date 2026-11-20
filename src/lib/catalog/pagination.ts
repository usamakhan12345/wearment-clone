export type PageItem = number | 'ellipsis'

/**
 * Page numbers to render in a numbered pager: always the first and last page and the current
 * page with one neighbour on each side; gaps become a single `'ellipsis'` (a gap of exactly one
 * page shows that page instead). Short ranges are listed in full.
 */
export function getPageItems(current: number, total: number): PageItem[] {
  if (total < 1) return []
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)

  const page = Math.min(Math.max(current, 1), total)
  const visible = [...new Set([1, page - 1, page, page + 1, total])]
    .filter((value) => value >= 1 && value <= total)
    .sort((a, b) => a - b)

  const items: PageItem[] = []
  let previous = 0

  for (const value of visible) {
    const gap = value - previous
    if (previous > 0 && gap === 2) items.push(previous + 1)
    else if (previous > 0 && gap > 2) items.push('ellipsis')
    items.push(value)
    previous = value
  }

  return items
}
