/**
 * Helpers for Lexical rich-text documents as stored by Payload. Inputs are typed `unknown` and
 * narrowed here because the generated types describe children loosely.
 */

type LexicalNode = {
  type?: unknown
  text?: unknown
  children?: unknown
}

/** Nodes that carry content without any text of their own. */
const CONTENT_NODE_TYPES = new Set(['upload', 'horizontalrule', 'relationship', 'block', 'table'])

/** Inline containers: their text flows into the surrounding sentence without extra spacing. */
const INLINE_CONTAINER_TYPES = new Set(['link', 'autolink'])

function isNode(value: unknown): value is LexicalNode {
  return typeof value === 'object' && value !== null
}

function rootChildren(data: unknown): unknown[] {
  if (!isNode(data) || !isNode((data as { root?: unknown }).root)) return []

  const { children } = (data as { root: LexicalNode }).root

  return Array.isArray(children) ? children : []
}

function collectText(nodes: unknown[], parts: string[]): void {
  for (const node of nodes) {
    if (!isNode(node)) continue

    if (node.type === 'text' && typeof node.text === 'string') {
      parts.push(node.text)
      continue
    }

    if (node.type === 'linebreak' || node.type === 'tab') {
      parts.push(' ')
      continue
    }

    if (Array.isArray(node.children)) {
      collectText(node.children, parts)
      if (typeof node.type !== 'string' || !INLINE_CONTAINER_TYPES.has(node.type)) parts.push(' ')
    }
  }
}

/** Flattens a rich-text document to single-spaced plain text (for meta descriptions). */
export function lexicalToPlainText(data: unknown): string {
  const parts: string[] = []
  collectText(rootChildren(data), parts)

  return parts.join('').replace(/\s+/g, ' ').trim()
}

function containsContent(nodes: unknown[]): boolean {
  return nodes.some((node) => {
    if (!isNode(node)) return false
    if (node.type === 'text') return typeof node.text === 'string' && node.text.trim() !== ''
    if (typeof node.type === 'string' && CONTENT_NODE_TYPES.has(node.type)) return true

    return Array.isArray(node.children) && containsContent(node.children)
  })
}

/** True when the document has visible text or media; an empty paragraph does not count. */
export function hasLexicalContent(data: unknown): boolean {
  return containsContent(rootChildren(data))
}

/** Shortens `text` to at most `maxLength` characters on a word boundary, adding an ellipsis. */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text

  const slice = text.slice(0, Math.max(maxLength - 1, 0))
  const lastSpace = slice.lastIndexOf(' ')
  const cut = lastSpace > maxLength * 0.6 ? slice.slice(0, lastSpace) : slice

  return `${cut.replace(/[\s,.;:!-]+$/, '')}…`
}
