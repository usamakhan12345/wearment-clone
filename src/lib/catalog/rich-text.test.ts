import { describe, expect, it } from 'vitest'

import { hasLexicalContent, lexicalToPlainText, truncateText } from './rich-text'

const text = (value: string) => ({ type: 'text', text: value, version: 1 })
const paragraph = (...children: unknown[]) => ({ type: 'paragraph', children, version: 1 })
const doc = (...children: unknown[]) => ({
  root: { type: 'root', children, direction: 'ltr', format: '', indent: 0, version: 1 },
})

describe('lexicalToPlainText', () => {
  it('joins blocks with single spaces', () => {
    const data = doc(
      paragraph(text('Soft linen.')),
      paragraph(text('Two '), { type: 'linebreak' }, text('pieces.')),
      { type: 'list', children: [{ type: 'listitem', children: [text('Breathable')] }] },
    )

    expect(lexicalToPlainText(data)).toBe('Soft linen. Two pieces. Breathable')
  })

  it('does not split words around inline links', () => {
    const data = doc(
      paragraph(text('See the '), { type: 'link', children: [text('guide')] }, text('.')),
    )

    expect(lexicalToPlainText(data)).toBe('See the guide.')
  })

  it('is safe for missing or malformed input', () => {
    expect(lexicalToPlainText(null)).toBe('')
    expect(lexicalToPlainText(undefined)).toBe('')
    expect(lexicalToPlainText({})).toBe('')
    expect(lexicalToPlainText({ root: { children: 'nope' } })).toBe('')
  })
})

describe('hasLexicalContent', () => {
  it('is false for empty documents and blank paragraphs', () => {
    expect(hasLexicalContent(null)).toBe(false)
    expect(hasLexicalContent(doc())).toBe(false)
    expect(hasLexicalContent(doc(paragraph(), paragraph(text('   '))))).toBe(false)
  })

  it('is true for text and for media-only content', () => {
    expect(hasLexicalContent(doc(paragraph(text('Size chart'))))).toBe(true)
    expect(hasLexicalContent(doc({ type: 'upload', value: 'abc' }))).toBe(true)
  })

  it('finds nested text', () => {
    const data = doc({ type: 'list', children: [{ type: 'listitem', children: [text('x')] }] })

    expect(hasLexicalContent(data)).toBe(true)
  })
})

describe('truncateText', () => {
  it('leaves short text alone', () => {
    expect(truncateText('short', 160)).toBe('short')
  })

  it('cuts on a word boundary within the limit and adds an ellipsis', () => {
    const result = truncateText('alpha beta gamma delta epsilon zeta', 20)

    expect(result).toBe('alpha beta gamma…')
    expect(result.length).toBeLessThanOrEqual(20)
  })

  it('hard-cuts text without usable word boundaries', () => {
    const result = truncateText('x'.repeat(50), 10)

    expect(result).toHaveLength(10)
    expect(result.endsWith('…')).toBe(true)
  })
})
