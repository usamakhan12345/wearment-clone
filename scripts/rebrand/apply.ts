/**
 * Renames the brand in the database: Wearments -> AMORA.
 *
 * DRY RUN by default (prints what would change, writes nothing). Set APPLY=1 to write.
 * Run `backup.ts` first. Safe to re-run: text already rebranded produces no diff, and media that
 * already has an `amora-` filename is skipped.
 *
 *   npx cross-env NODE_OPTIONS=--no-deprecation payload run scripts/rebrand/apply.ts
 *   APPLY=1 PHASES=text,globals,media npx cross-env ... payload run scripts/rebrand/apply.ts
 *
 * PHASES (comma separated, default all):
 *   text     products / categories / pages: vendor, tags, descriptions, page text, Instagram link
 *   globals  site name, copyright, coupon codes, social links
 *   media    swap the logo and banner files for the AMORA versions (same document ids)
 *
 * Only the capitalised brand name is replaced. Lower-case occurrences are email addresses, the
 * website domain and social handles; those are real, working identifiers and are left for the
 * owner to replace with the new ones.
 */
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import { getPayload, type Payload } from 'payload'

import config from '../../src/payload.config'
import { deleteStoredFile, getPayloadBucket } from '../../src/storage/gridfs'

const BRAND = 'AMORA'
const APPLY = process.env.APPLY === '1'
const PHASES = new Set((process.env.PHASES ?? 'text,globals,media').split(',').map((p) => p.trim()))

const BRAND_ASSETS = path.resolve('brand-assets/amora')
const CACHE = path.resolve('.import-cache/images')
const STAGING = path.resolve('.rebrand-backup/upload')

/** "Wearments Clothing", "Wearments", "WEARMENTS150" and the possessive "Wearments'" -> AMORA. */
export function rebrandText(text: string): string {
  return text
    .replace(/Wearments(['’])(?!s)/g, `${BRAND}$1s`)
    .replace(/Wearments Clothing/g, BRAND)
    .replace(/WEARMENTS/g, BRAND)
    .replace(/Wearments/g, BRAND)
}

function deepReplace<T>(value: T): T {
  if (typeof value === 'string') return rebrandText(value) as T
  if (Array.isArray(value)) return value.map(deepReplace) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, deepReplace(v)])) as T
  }
  return value
}

const SYSTEM_KEYS = new Set(['id', 'createdAt', 'updatedAt', '_status', '__v'])

/** Top-level keys whose value changes under `transform`, with the new values. */
function changedFields(doc: Record<string, unknown>, transform: (d: Record<string, unknown>) => Record<string, unknown>) {
  const next = transform(doc)
  const changed: Record<string, unknown> = {}
  for (const key of Object.keys(next)) {
    if (SYSTEM_KEYS.has(key)) continue
    if (JSON.stringify(next[key]) !== JSON.stringify(doc[key])) changed[key] = next[key]
  }
  return changed
}

/** Clears the Instagram profile link of instagramGrid blocks (the old brand's account). */
function dropInstagramProfile(layout: unknown): unknown {
  if (!Array.isArray(layout)) return layout
  return layout.map((block: Record<string, unknown>) =>
    block.blockType === 'instagramGrid' && block.profileUrl ? { ...block, profileUrl: '' } : block,
  )
}

async function textPhase(payload: Payload) {
  console.log('\n== text: products, categories, pages')
  const stats: Record<string, number> = {}

  for (const collection of ['products', 'categories', 'pages'] as const) {
    const { docs } = await payload.find({ collection, pagination: false, depth: 0, draft: true })
    let changedDocs = 0

    for (const doc of docs as unknown as Array<Record<string, unknown> & { id: string }>) {
      const changed = changedFields(doc, (d) => {
        const next = deepReplace(d)
        if (collection === 'pages' && 'layout' in next) next.layout = dropInstagramProfile(next.layout)
        return next
      })
      const keys = Object.keys(changed)
      if (keys.length === 0) continue
      changedDocs++
      if (changedDocs <= 2 || collection !== 'products') {
        console.log(`  ${collection}/${doc.id}: ${keys.join(', ')}`)
      }
      if (APPLY) {
        await payload.update({
          collection,
          id: doc.id,
          data: changed,
          depth: 0,
          draft: doc._status === 'draft',
        })
      }
    }
    stats[collection] = changedDocs
  }
  console.log(`  ${APPLY ? 'updated' : 'would update'}:`, stats)
}

async function globalsPhase(payload: Payload) {
  console.log('\n== globals')
  for (const slug of ['site-settings', 'header', 'footer', 'product-page-settings'] as const) {
    const doc = (await payload.findGlobal({ slug, depth: 0 })) as unknown as Record<string, unknown>
    const changed = changedFields(doc, (d) => {
      const next = deepReplace(d) as Record<string, unknown>
      if (slug === 'site-settings' && next.social && typeof next.social === 'object') {
        // The old brand's Instagram and Facebook pages; AMORA's are not known yet.
        next.social = { ...(next.social as object), instagram: '', facebook: '' }
      }
      return next
    })
    const keys = Object.keys(changed)
    console.log(`  ${slug}: ${keys.length ? keys.join(', ') : 'no change'}`)
    for (const key of keys) console.log(`      ${key}: ${JSON.stringify(changed[key]).slice(0, 200)}`)
    if (APPLY && keys.length) await payload.updateGlobal({ slug, data: changed, depth: 0 })
  }
}

type MediaDoc = { id: string; filename?: string | null; alt: string; sizes?: { card?: { filename?: string | null } } }

async function mediaPhase(payload: Payload) {
  console.log('\n== media: logos and banners')
  const bucket = getPayloadBucket(payload)

  const site = (await payload.findGlobal({ slug: 'site-settings', depth: 0 })) as { logo?: string | null }
  const footer = (await payload.findGlobal({ slug: 'footer', depth: 0 })) as { logo?: string | null }

  const { docs } = await payload.find({
    collection: 'media',
    where: { filename: { like: 'wearments' } },
    pagination: false,
    depth: 0,
  })

  type Job = { doc: MediaDoc; label: string; alt: string; source: string }
  const jobs: Job[] = []
  for (const doc of docs as unknown as MediaDoc[]) {
    const banner = /^wearments-banner-(\d)/.exec(doc.filename ?? '')
    if (banner) {
      const n = Number(banner[1])
      const source =
        n === 1
          ? path.join(CACHE, (await fs.readdir(CACHE)).find((f) => f.startsWith('wearments-banner-1-'))!)
          : path.join(BRAND_ASSETS, `banner-${n}.jpg`)
      jobs.push({ doc, label: `amora-banner-${n}`, alt: `${BRAND} banner ${n}`, source })
    } else if (doc.id === site.logo) {
      jobs.push({ doc, label: 'amora-logo', alt: BRAND, source: path.join(BRAND_ASSETS, 'logo-header.png') })
    } else if (doc.id === footer.logo) {
      jobs.push({ doc, label: 'amora-logo-footer', alt: BRAND, source: path.join(BRAND_ASSETS, 'logo-footer.png') })
    } else {
      console.log(`  ! unexpected media with the old name, left alone: ${doc.id} ${doc.filename}`)
    }
  }

  await fs.mkdir(STAGING, { recursive: true })
  for (const job of jobs) {
    const bytes = await fs.readFile(job.source)
    const hash = crypto.createHash('sha1').update(bytes).digest('hex').slice(0, 10)
    const staged = path.join(STAGING, `${job.label}-${hash}${path.extname(job.source)}`)
    console.log(`  ${job.doc.filename}  ->  ${path.basename(staged)}   (alt "${job.alt}")`)
    if (!APPLY) continue

    await fs.writeFile(staged, bytes)
    const oldNames = [job.doc.filename, job.doc.sizes?.card?.filename].filter((n): n is string => Boolean(n))

    await payload.update({
      collection: 'media',
      id: job.doc.id,
      data: { alt: job.alt },
      filePath: staged,
      depth: 0,
    })

    // Whatever the update left behind under the old names goes now.
    for (const name of oldNames) await deleteStoredFile(bucket, name)
    const after = (await payload.findByID({ collection: 'media', id: job.doc.id, depth: 0 })) as unknown as MediaDoc
    console.log(`      now ${after.filename}`)
  }
}

async function main() {
  console.log(APPLY ? 'APPLY mode: writing to the database' : 'DRY RUN: nothing will be written')
  const payload = await getPayload({ config })
  if (PHASES.has('text')) await textPhase(payload)
  if (PHASES.has('globals')) await globalsPhase(payload)
  if (PHASES.has('media')) await mediaPhase(payload)
  console.log('\nDone.')
}

try {
  await main()
  process.exit(0)
} catch (error) {
  console.error(error)
  process.exit(1)
}
