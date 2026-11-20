import { describe, expect, it } from 'vitest'

import { htmlToPlainText, sanitizeHtml } from './html'

describe('sanitizeHtml', () => {
  it('removes scripts, meta tags, images and styles', () => {
    const html =
      '<meta charset="utf-8"><style>p{color:red}</style><p>Hello</p><img src="x.png"><script>alert(1)</script>'

    expect(sanitizeHtml(html)).toBe('<p>Hello</p>')
  })

  it('unwraps presentational containers and strips attributes but keeps link targets', () => {
    const html =
      '<div class="x"><p style="color:red"><span><strong>Bold</strong> and <a href="https://example.com/contact" target="_blank" class="y">link</a></span></p></div>'

    expect(sanitizeHtml(html)).toBe(
      '<p><strong>Bold</strong> and <a href="https://example.com/contact">link</a></p>',
    )
  })

  it('unwraps links the editor would reject (empty, anchor-only, site-relative)', () => {
    expect(
      sanitizeHtml(
        '<p><a>none</a> <a href="">empty</a> <a href="#x">hash</a> <a href="/pages/a">rel</a></p>',
      ),
    ).toBe('<p>none empty hash rel</p>')
    expect(sanitizeHtml('<p><a href="mailto:a@b.co">mail</a></p>')).toBe(
      '<p><a href="mailto:a@b.co">mail</a></p>',
    )
  })

  it('drops empty and whitespace-only blocks but keeps line-break paragraphs', () => {
    expect(sanitizeHtml('<p>&nbsp;</p><p> </p><p>Keep</p>')).toBe('<p>Keep</p>')
    expect(sanitizeHtml('<p>a<br>b</p>')).toBe('<p>a<br>b</p>')
  })

  it('returns an empty string when nothing meaningful remains', () => {
    expect(sanitizeHtml('<div><span> </span></div>')).toBe('')
  })
})

describe('htmlToPlainText', () => {
  it('returns collapsed visible text', () => {
    expect(htmlToPlainText('<style>x{}</style><p>One\n  <b>two</b></p><p>three</p>')).toBe(
      'One two three',
    )
  })
})
