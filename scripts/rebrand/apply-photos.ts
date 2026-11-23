/**
 * Replaces product/Instagram photos in the CMS with the patched versions from
 * `brand-assets/amora/photos/` (made by replace-labels.ts): the old name on neck labels and hang
 * tags is gone from the pixels.
 *
 * DRY RUN by default; APPLY=1 writes. Safe to re-run: an image whose media document was already
 * swapped (filename ends `-am<hash>`) is skipped. Same document ids, so nothing referencing the
 * media needs re-linking.
 *
 *   npx cross-env NODE_OPTIONS=--no-deprecation payload run scripts/rebrand/apply-photos.ts
 *   APPLY=1 [LIMIT=5] [FILES=a,b] npx cross-env ... payload run scripts/rebrand/apply-photos.ts
 *
 * Every swap gets a NEW content-hashed filename: files are served `immutable` for a year, so
 * reusing the old name would leave browsers showing the old photo.
 */
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import { getPayload } from 'payload'

import config from '../../src/payload.config'
import { deleteStoredFile, getPayloadBucket } from '../../src/storage/gridfs'
import { mapLimit } from '../import-wearments/lib/http'

const APPLY = process.env.APPLY === '1'
const PHOTOS = path.resolve('brand-assets/amora/photos')
const STAGING = path.resolve('.rebrand-backup/upload-photos')

type MediaDoc = { id: string; filename?: string | null; sizes?: { card?: { filename?: string | null } } }

async function main() {
  console.log(APPLY ? 'APPLY mode: writing to the database' : 'DRY RUN: nothing will be written')
  const payload = await getPayload({ config })
  const bucket = getPayloadBucket(payload)

  let files = (await fs.readdir(PHOTOS)).filter((f) => f.endsWith('.jpg')).sort()
  const only = process.env.FILES?.split(',').filter(Boolean)
  if (only) files = files.filter((f) => only.some((o) => f.includes(o)))
  const limit = Number(process.env.LIMIT ?? 0)
  if (limit) files = files.slice(0, limit)
  console.log(`${files.length} patched photo(s)`)
  await fs.mkdir(STAGING, { recursive: true })

  const stats = { swapped: 0, alreadyDone: 0, noDocument: 0, failed: 0 }
  const problems: string[] = []
  let processed = 0

  await mapLimit(files, 3, async (file) => {
    const base = path.parse(file).name
    try {
      const found = await payload.find({
        collection: 'media',
        where: { filename: { equals: `${base}.webp` } },
        limit: 1,
        depth: 0,
      })
      const doc = found.docs[0] as unknown as MediaDoc | undefined
      if (!doc) {
        // Either swapped on an earlier run (new name) or never imported.
        const swapped = await payload.find({
          collection: 'media',
          where: { filename: { like: `${base}-am` } },
          limit: 1,
          depth: 0,
        })
        if (swapped.docs.length) stats.alreadyDone++
        else (stats.noDocument++, problems.push(`${file}: no media document`))
        return
      }
      if (!APPLY) {
        stats.swapped++
        return
      }

      const bytes = await fs.readFile(path.join(PHOTOS, file))
      const hash = crypto.createHash('sha1').update(bytes).digest('hex').slice(0, 8)
      const staged = path.join(STAGING, `${base}-am${hash}.jpg`)
      await fs.writeFile(staged, bytes)
      const oldNames = [doc.filename, doc.sizes?.card?.filename].filter((n): n is string => Boolean(n))

      await payload.update({ collection: 'media', id: doc.id, data: {}, filePath: staged, depth: 0 })
      for (const name of oldNames) await deleteStoredFile(bucket, name)
      stats.swapped++
    } catch (error) {
      stats.failed++
      problems.push(`${file}: ${error instanceof Error ? error.message : error}`)
    } finally {
      if (++processed % 25 === 0) console.log(`  ${processed}/${files.length}`)
    }
  })

  console.log(`\n${APPLY ? 'Result' : 'Would do'}:`, stats)
  if (problems.length) console.log(`\n${problems.length} problem(s):\n  - ${problems.slice(0, 20).join('\n  - ')}`)
  console.log('Done.')
}

try {
  await main()
  process.exit(0)
} catch (error) {
  console.error(error)
  process.exit(1)
}
