/**
 * READ-ONLY. Lists every place the old brand name appears in the Payload database.
 *
 *   npx cross-env NODE_OPTIONS=--no-deprecation payload run scripts/rebrand/scan.ts
 *
 * Groups hits by "collection.field.path" (array indexes collapsed to []) and shows a few samples.
 * Does not write anything.
 */
import { getPayload } from 'payload'

import config from '../../src/payload.config'
import { getPayloadBucket } from '../../src/storage/gridfs'

const OLD = /wearments?/i
const COLLECTIONS = ['products', 'categories', 'pages', 'media', 'subscribers'] as const
const GLOBALS = ['site-settings', 'header', 'footer', 'product-page-settings'] as const

type Hit = { where: string; id: string; value: string }
const hits: Hit[] = []

function walk(node: unknown, path: string, owner: string, id: string) {
  if (typeof node === 'string') {
    if (OLD.test(node)) hits.push({ where: `${owner}.${path}`, id, value: node })
    return
  }
  if (Array.isArray(node)) {
    node.forEach((item) => walk(item, `${path}[]`, owner, id))
    return
  }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      walk(value, path ? `${path}.${key}` : key, owner, id)
    }
  }
}

async function main() {
  const payload = await getPayload({ config })

  for (const slug of COLLECTIONS) {
    const { docs } = await payload.find({
      collection: slug,
      pagination: false,
      depth: 0,
      draft: slug === 'pages' || slug === 'products' || slug === 'categories',
    })
    console.log(`${slug}: ${docs.length} docs scanned`)
    for (const doc of docs) walk(doc, '', slug, String((doc as { id: unknown }).id))
  }

  for (const slug of GLOBALS) {
    const doc = await payload.findGlobal({ slug, depth: 0 })
    walk(doc, '', slug, slug)
    console.log(`global ${slug}: scanned`)
  }

  const groups = new Map<string, Hit[]>()
  for (const hit of hits) {
    const list = groups.get(hit.where) ?? []
    list.push(hit)
    groups.set(hit.where, list)
  }

  // Stored files: nothing in GridFS should still carry the old name.
  const bucket = getPayloadBucket(payload)
  const stored = await bucket.find({ filename: { $regex: OLD } }).toArray()
  const renamed = await bucket.find({ filename: { $regex: /^amora-/i } }).toArray()
  console.log(`\nGridFS: ${stored.length} file(s) with the old name, ${renamed.length} amora-* file(s)`)
  for (const file of stored) console.log(`    old: ${file.filename}`)

  console.log(`\n${hits.length} hit(s) in ${groups.size} field path(s)\n`)
  for (const [where, list] of [...groups.entries()].sort()) {
    console.log(`${where}  x${list.length}`)
    for (const hit of list.slice(0, 3)) {
      const idx = hit.value.search(OLD)
      const from = Math.max(0, idx - 40)
      console.log(`    [${hit.id}] ...${hit.value.slice(from, idx + 60).replace(/\s+/g, ' ')}...`)
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
