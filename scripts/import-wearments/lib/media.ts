import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'

import type { Payload } from 'payload'

import { slugify } from '../../../src/lib/slugify'
import { fetchWithRetry, mapLimit } from './http'

export type MediaRequest = {
  url: string
  alt: string
  /** Shopify CDN only: ask for a resized rendition to keep downloads small. */
  width?: number
}

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'image/svg+xml': '.svg',
}

const isShopifyCdn = (url: URL) =>
  url.hostname === 'cdn.shopify.com' || url.pathname.includes('/cdn/shop/')

/** Stable identity for a remote image: origin + path, without volatile query strings. */
export function mediaKey(rawUrl: string): string {
  const url = new URL(rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl)
  return `${url.origin}${url.pathname}`
}

/**
 * Downloads remote images once (cached on disk) and creates Payload media docs for them.
 * Re-running is cheap: files already on disk are not downloaded again, and images that already
 * have a media doc (matched by `sourceUrl`) are reused.
 */
export class MediaImporter {
  private readonly idByKey = new Map<string, string>()
  private readonly inFlight = new Map<string, Promise<string | null>>()
  private readonly cachedFileByHash = new Map<string, string>()
  readonly stats = { created: 0, reused: 0, downloaded: 0, failed: 0 }

  constructor(
    private readonly payload: Payload,
    private readonly cacheDir: string,
  ) {}

  async init() {
    await fs.mkdir(this.cacheDir, { recursive: true })

    for (const file of await fs.readdir(this.cacheDir)) {
      const hash = /-([0-9a-f]{10})\.[a-z0-9]+$/.exec(file)?.[1]
      if (hash) this.cachedFileByHash.set(hash, file)
    }

    const existing = await this.payload.find({
      collection: 'media',
      pagination: false,
      depth: 0,
      select: { sourceUrl: true },
    })
    for (const doc of existing.docs) {
      if (doc.sourceUrl) this.idByKey.set(doc.sourceUrl, doc.id)
    }
  }

  /** Returns the media id for the image, or `null` if it could not be downloaded/created. */
  ensure(request: MediaRequest): Promise<string | null> {
    const key = mediaKey(request.url)

    const known = this.idByKey.get(key)
    if (known) {
      this.stats.reused++
      return Promise.resolve(known)
    }

    const pending = this.inFlight.get(key)
    if (pending) return pending

    const job = this.createMedia(key, request)
      .catch((error: unknown) => {
        this.stats.failed++
        console.warn(`  ! media failed (${key}): ${error instanceof Error ? error.message : error}`)
        return null
      })
      .finally(() => this.inFlight.delete(key))

    this.inFlight.set(key, job)
    return job
  }

  /** Ensures many images with bounded concurrency; result order matches `requests`. */
  ensureMany(requests: readonly MediaRequest[], concurrency = 4): Promise<(string | null)[]> {
    return mapLimit(requests, concurrency, (request) => this.ensure(request))
  }

  private async createMedia(key: string, request: MediaRequest): Promise<string | null> {
    const hash = crypto.createHash('sha1').update(key).digest('hex').slice(0, 10)
    const filePath = await this.download(key, request, hash)

    const doc = await this.payload.create({
      collection: 'media',
      data: { alt: request.alt || 'Image', sourceUrl: key },
      filePath,
    })

    this.idByKey.set(key, doc.id)
    this.stats.created++
    return doc.id
  }

  private async download(key: string, request: MediaRequest, hash: string): Promise<string> {
    const cached = this.cachedFileByHash.get(hash)
    if (cached) return path.join(this.cacheDir, cached)

    const source = new URL(request.url.startsWith('//') ? `https:${request.url}` : request.url)
    if (isShopifyCdn(source)) {
      source.search = request.width ? `?width=${request.width}` : ''
    }

    const response = await fetchWithRetry(source.toString())
    const contentType = (response.headers.get('content-type') ?? '').split(';')[0]?.trim() ?? ''
    const extension =
      EXTENSION_BY_TYPE[contentType] ?? (path.extname(new URL(key).pathname) || '.jpg')

    const fileName = `${slugify(request.alt).slice(0, 50) || 'image'}-${hash}${extension}`
    const filePath = path.join(this.cacheDir, fileName)

    await fs.writeFile(filePath, Buffer.from(await response.arrayBuffer()))
    this.cachedFileByHash.set(hash, fileName)
    this.stats.downloaded++

    return filePath
  }
}
