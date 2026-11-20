import { convertHTMLToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import { JSDOM } from 'jsdom'
import type { Payload } from 'payload'

const REMOVE_SELECTOR =
  'meta, style, script, noscript, template, svg, iframe, form, button, img, picture, video'

/** Elements whose wrapper adds nothing once the inline styling is stripped. */
const UNWRAP_SELECTOR = 'span, font, div, section, article, header, footer, main'

/** Links the rich-text editor accepts; anything else (empty, `#`, site-relative) is unwrapped. */
const USABLE_HREF = /^(?:https?:\/\/|mailto:|tel:)\S+$/i
const isUsableHref = (href: string | null) => Boolean(href && USABLE_HREF.test(href))

const isBlank = (text: string | null) => !text || text.replace(/[\s ​]/g, '') === ''

/**
 * Normalises messy CMS/page-builder HTML: drops scripts, images and inline styling, unwraps
 * presentational containers and removes empty paragraphs, so the Lexical conversion is clean.
 */
export function sanitizeHtml(html: string): string {
  const { document } = new JSDOM(`<body>${html}</body>`).window

  document.querySelectorAll(REMOVE_SELECTOR).forEach((node) => node.remove())

  document.querySelectorAll('a').forEach((link) => {
    if (!isUsableHref(link.getAttribute('href'))) link.replaceWith(...link.childNodes)
  })

  for (let pass = 0; pass < 4; pass++) {
    document
      .querySelectorAll(UNWRAP_SELECTOR)
      .forEach((node) => node.replaceWith(...node.childNodes))
  }

  document.querySelectorAll('*').forEach((node) => {
    for (const { name } of Array.from(node.attributes)) {
      if (!(node.tagName === 'A' && name === 'href')) node.removeAttribute(name)
    }
  })

  document.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6').forEach((node) => {
    if (isBlank(node.textContent) && !node.querySelector('br')) node.remove()
  })

  return document.body.innerHTML.trim()
}

/** Visible text of an HTML fragment, used for short plain-text fields. */
export function htmlToPlainText(html: string): string {
  const { document } = new JSDOM(`<body>${html}</body>`).window
  document.querySelectorAll('style, script').forEach((node) => node.remove())
  // Separate adjacent blocks so "<p>a</p><p>b</p>" reads "a b", not "ab".
  document
    .querySelectorAll('p, li, br, div, tr, h1, h2, h3, h4, h5, h6')
    .forEach((node) => node.after(' '))

  return (document.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}

export type LexicalState = ReturnType<typeof convertHTMLToLexical>

/** Builds an HTML -> Lexical converter bound to the project's editor configuration. */
export async function createHtmlConverter(payload: Payload) {
  const editorConfig = await editorConfigFactory.default({ config: payload.config })

  return (html: string): LexicalState | null => {
    const clean = sanitizeHtml(html)
    if (!clean) return null

    return convertHTMLToLexical({ editorConfig, html: clean, JSDOM })
  }
}
