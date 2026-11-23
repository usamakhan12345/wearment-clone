/**
 * Exports every content collection and global to JSON before the rebrand writes anything.
 * READ-ONLY on the database. Output goes to `.rebrand-backup/<timestamp>/` (gitignored).
 *
 *   npx cross-env NODE_OPTIONS=--no-deprecation payload run scripts/rebrand/backup.ts
 *
 * Image files are not copied: the old logo and banners are still in `.import-cache/images`, and
 * `npm run media:migrate` can push them back into GridFS.
 */
import fs from 'node:fs/promises'
import path from 'node:path'

import { getPayload } from 'payload'

import config from '../../src/payload.config'

const COLLECTIONS = ['products', 'categories', 'pages', 'media', 'subscribers', 'users'] as const
const GLOBALS = ['site-settings', 'header', 'footer', 'product-page-settings'] as const

async function main() {
  const payload = await getPayload({ config })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dir = path.resolve('.rebrand-backup', stamp)
  await fs.mkdir(dir, { recursive: true })

  for (const slug of COLLECTIONS) {
    const { docs } = await payload.find({
      collection: slug,
      pagination: false,
      depth: 0,
      draft: slug === 'pages' || slug === 'products' || slug === 'categories',
      // Users carry password hashes; export only what is needed to recreate accounts' identities.
      select: slug === 'users' ? { email: true } : undefined,
    })
    await fs.writeFile(path.join(dir, `${slug}.json`), JSON.stringify(docs, null, 2))
    console.log(`${slug}: ${docs.length} docs`)
  }

  for (const slug of GLOBALS) {
    const doc = await payload.findGlobal({ slug, depth: 0 })
    await fs.writeFile(path.join(dir, `global-${slug}.json`), JSON.stringify(doc, null, 2))
    console.log(`global ${slug}: saved`)
  }

  console.log(`\nBackup written to ${dir}`)
}

try {
  await main()
  process.exit(0)
} catch (error) {
  console.error(error)
  process.exit(1)
}
