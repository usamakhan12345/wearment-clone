/** READ-ONLY. Prints each text paragraph that mentions the old brand, with the page title. */
import { getPayload } from 'payload'

import config from '../../src/payload.config'

type Node = { type?: string; text?: string; children?: Node[]; fields?: { url?: string } }

const paragraphText = (node: Node): string =>
  node.text ??
  (node.children ?? [])
    .map((child) =>
      child.type === 'link' ? `[LINK ${child.fields?.url}: ${paragraphText(child)}]` : paragraphText(child),
    )
    .join('')

function collect(node: Node, out: string[]) {
  const text = paragraphText(node)
  if (/wearments/i.test(text) && !(node.children ?? []).some((c) => /wearments/i.test(paragraphText(c)) && c.children)) {
    out.push(text)
    return
  }
  for (const child of node.children ?? []) collect(child, out)
}

async function main() {
  const payload = await getPayload({ config })
  const pages = await payload.find({ collection: 'pages', pagination: false, depth: 0, draft: true })
  for (const page of pages.docs) {
    const out: string[] = []
    const root = (page as { content?: { root?: Node } }).content?.root
    if (root) collect(root, out)
    if (out.length) {
      console.log(`\n## ${page.title} (/${page.slug})`)
      out.forEach((line) => console.log(`  - ${line.replace(/\s+/g, ' ').slice(0, 260)}`))
    }
  }
}

try {
  await main()
  process.exit(0)
} catch (error) {
  console.error(error)
  process.exit(1)
}
