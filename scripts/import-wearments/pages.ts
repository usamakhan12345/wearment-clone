import { JSDOM } from 'jsdom'
import type { Payload } from 'payload'

import type { Page } from '../../src/payload-types'
import type { LexicalState } from './lib/html'
import { fetchText, sleep } from './lib/http'

const BASE_URL = 'https://wearments.com'

/** Text pages linked from the storefront's menus. Handles are kept so old URLs keep working. */
export const TEXT_PAGES = [
  { handle: 'faqs-page-mar-19-11-21-25', title: 'FAQs' },
  { handle: 'returns-refunds-policy', title: 'Returns & Refunds Policy' },
  { handle: 'legal-page-mar-19-11-09-02', title: 'Privacy Policy' },
  { handle: 'terms-and-conditions', title: 'Terms & Condition' },
  { handle: 'about-page-mar-19-10-58-07', title: 'About Us' },
  { handle: 'shipping-policy', title: 'Shipping Policy' },
  { handle: 'contact', title: 'Contact Us' },
] as const

/** Main content of a storefront page, minus chrome and the page's own H1 (stored as the title). */
function extractMainHtml(html: string): string {
  const { document } = new JSDOM(html).window
  const main = document.querySelector('#MainContent') ?? document.querySelector('main')
  if (!main) return ''

  // Global sections (the footer with newsletter and social links) are rendered inside
  // #MainContent by the page builder; they are site chrome, not page content.
  main
    .querySelectorAll(
      '[id*="global_section"], script, style, noscript, template, svg, form, button, iframe, nav, h1',
    )
    .forEach((node) => node.remove())

  return main.innerHTML
}

export async function importTextPages(
  payload: Payload,
  htmlToLexical: (html: string) => LexicalState | null,
) {
  console.log('\n== Text pages')

  for (const { handle, title } of TEXT_PAGES) {
    const html = await fetchText(`${BASE_URL}/pages/${handle}`)
    const content = htmlToLexical(extractMainHtml(html)) as Page['content']

    const data = { title, slug: handle, content, _status: 'published' as const }

    const existing = await payload.find({
      collection: 'pages',
      where: { slug: { equals: handle } },
      limit: 1,
      depth: 0,
      draft: true,
    })
    const existingId = existing.docs[0]?.id

    if (existingId) {
      await payload.update({ collection: 'pages', id: existingId, data, draft: false })
    } else {
      await payload.create({ collection: 'pages', data, draft: false })
    }

    console.log(`  /pages/${handle} -> "${title}" ${content ? '' : '(EMPTY CONTENT!)'}`)
    await sleep(300)
  }
}
