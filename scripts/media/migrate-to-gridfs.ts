/**
 * Moves existing media files from local disk into MongoDB GridFS.
 *
 * Re-uploads each media document's file through Payload, so the cloud-storage plugin stores it in
 * GridFS (converted to WebP, with a small `card` rendition regenerated). Documents keep their
 * ids, so products, pages and globals that reference them need no changes.
 *
 * Safe to re-run: documents whose file is already in GridFS are skipped.
 *
 *   npm run media:migrate                         # everything
 *   MIGRATE_LIMIT=3 npm run media:migrate         # first 3 documents (trial run)
 *   MIGRATE_FORCE=1 npm run media:migrate         # redo documents even if already in GridFS
 *
 * Source files are looked up in ./media and then ./.import-cache/images by the document's
 * filename, ignoring the extension (a migrated document is named .webp but its source is .jpg).
 * It writes to whatever database `.env` points at.
 */
import fs from 'node:fs/promises'
import path from 'node:path'

import { getPayload } from 'payload'

import config from '../../src/payload.config'
import { deleteStoredFile, getPayloadBucket, storageKey } from '../../src/storage/gridfs'
import { mapLimit } from '../import-wearments/lib/http'

const SOURCE_DIRS = [
  path.resolve(process.cwd(), 'media'),
  path.resolve(process.cwd(), '.import-cache/images'),
]
const CONCURRENCY = 3

const SOURCE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg']

/** The source image for a document: exact filename first, then the same name with another extension. */
async function findLocalFile(filename: string): Promise<string | null> {
  const { name, ext } = path.parse(filename)
  const candidates = [filename, ...SOURCE_EXTENSIONS.filter((e) => e !== ext).map((e) => name + e)]

  for (const dir of SOURCE_DIRS) {
    for (const candidate of candidates) {
      const full = path.join(dir, candidate)
      try {
        await fs.access(full)
        return full
      } catch {
        // try the next candidate
      }
    }
  }
  return null
}

async function main() {
  const limit = Number.parseInt(process.env.MIGRATE_LIMIT ?? '', 10)
  const force = process.env.MIGRATE_FORCE === '1'

  const payload = await getPayload({ config })
  const bucket = getPayloadBucket(payload)

  const { docs: all } = await payload.find({
    collection: 'media',
    pagination: false,
    depth: 0,
    sort: 'createdAt',
  })
  const docs = Number.isFinite(limit) && limit > 0 ? all.slice(0, limit) : all
  console.log(`Migrating ${docs.length}/${all.length} media documents to GridFS`)

  const stats = { migrated: 0, skipped: 0 }
  const problems: string[] = []
  let processed = 0

  await mapLimit(docs, CONCURRENCY, async (doc) => {
    try {
      const alreadyStored =
        Boolean(doc.filename) && (await bucket.find({ filename: storageKey(doc.filename!) }).hasNext())
      if (alreadyStored && !force) {
        stats.skipped++
        return
      }

      const source = doc.filename ? await findLocalFile(doc.filename) : null
      if (!source) {
        problems.push(`${doc.id} ${doc.filename}: source file not found`)
        return
      }

      if (force) {
        // Clear every stored file of this document, including renditions that no longer exist in
        // the config (e.g. `<name>-1280x1707.webp`), so nothing is left orphaned in GridFS.
        const { name } = path.parse(doc.filename!)
        const variants = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(-\\d+x\\d+)?\\.[a-z0-9]+$`)
        const stale = await bucket.find({ filename: { $regex: variants } }).toArray()
        await Promise.all(stale.map((file) => deleteStoredFile(bucket, file.filename)))
      }

      await payload.update({
        collection: 'media',
        id: doc.id,
        data: {},
        filePath: source,
        overwriteExistingFiles: true,
      })
      stats.migrated++
    } catch (error) {
      problems.push(`${doc.id} ${doc.filename}: ${error instanceof Error ? error.message : error}`)
    } finally {
      if (++processed % 25 === 0) console.log(`  ${processed}/${docs.length} processed`)
    }
  })

  console.log('\nResult:', stats)
  if (problems.length > 0) {
    console.error(`\n${problems.length} problem(s):\n  - ${problems.join('\n  - ')}`)
    throw new Error('Migration finished with problems')
  }
  console.log('Done.')
}

// Top-level await: `payload run` exits as soon as this module finishes evaluating.
try {
  await main()
  process.exit(0)
} catch (error) {
  console.error(error)
  process.exit(1)
}
