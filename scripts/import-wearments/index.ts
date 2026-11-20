/**
 * Imports the wearments.com storefront (catalog, text pages, homepage, globals, images) into
 * Payload. Safe to re-run: records are matched by handle/slug and images by source URL.
 *
 * `payload run` does not forward CLI arguments, so options are environment variables:
 *   npm run import:wearments                           # everything
 *   IMPORT_ONLY=catalog npm run import:wearments       # catalog | pages | site (comma separated)
 *   IMPORT_LIMIT=10 npm run import:wearments           # first 10 products only (dry run)
 */
import path from 'path'

import { getPayload } from 'payload'

import config from '../../src/payload.config'
import { importCatalog, loadHandleMap } from './catalog'
import { createHtmlConverter } from './lib/html'
import { MediaImporter } from './lib/media'
import { importTextPages } from './pages'
import { importSite } from './site'

type Step = 'catalog' | 'pages' | 'site'
const ALL_STEPS: Step[] = ['catalog', 'pages', 'site']

function readOptions(env: NodeJS.ProcessEnv) {
  const only = env.IMPORT_ONLY?.split(',')
    .map((step) => step.trim())
    .filter((step): step is Step => (ALL_STEPS as string[]).includes(step))
  const limit = Number.parseInt(env.IMPORT_LIMIT ?? '', 10)

  return {
    steps: only?.length ? only : ALL_STEPS,
    limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
  }
}

async function main() {
  const { steps, limit } = readOptions(process.env)
  console.log(`Importing wearments.com: ${steps.join(', ')}${limit ? ` (limit ${limit})` : ''}`)

  const payload = await getPayload({ config })
  const media = new MediaImporter(payload, path.resolve(process.cwd(), '.import-cache/images'))
  await media.init()
  const htmlToLexical = await createHtmlConverter(payload)

  const failures: string[] = []
  let categoryIdByHandle = new Map<string, string>()
  let productIdByHandle = new Map<string, string>()

  if (steps.includes('catalog')) {
    const result = await importCatalog({ payload, media, htmlToLexical, limit })
    categoryIdByHandle = result.categoryIdByHandle
    productIdByHandle = result.productIdByHandle
    failures.push(...result.failures)
  } else if (steps.includes('site')) {
    categoryIdByHandle = await loadHandleMap(payload, 'categories')
    productIdByHandle = await loadHandleMap(payload, 'products')
  }

  if (steps.includes('pages')) await importTextPages(payload, htmlToLexical)

  if (steps.includes('site')) {
    await importSite({ payload, media, htmlToLexical, categoryIdByHandle, productIdByHandle })
  }

  console.log('\nMedia:', media.stats)
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
