import { Readable } from 'node:stream'

import type { Adapter, StaticHandler } from '@payloadcms/plugin-cloud-storage/types'
import { GridFSBucket, type Db } from 'mongodb'
import type { Payload, PayloadRequest } from 'payload'

/**
 * Stores uploaded media in MongoDB GridFS so the files live in the same database as the CMS
 * content instead of on a server's disk (which does not exist on serverless hosts like Vercel).
 *
 * Plugs into Payload via `@payloadcms/plugin-cloud-storage`. Payload keeps serving files at
 * `/api/media/file/<filename>`; this adapter's `staticHandler` answers that route from GridFS.
 */

export const GRIDFS_BUCKET_NAME = 'media_files'

/** Filenames are content-hashed (imports) or unique per upload (admin), so they never change. */
const CACHE_CONTROL = 'public, max-age=31536000, immutable'

/** Key a file is stored under: `<prefix>/<filename>`, or just the filename without a prefix. */
export function storageKey(filename: string, prefix?: string): string {
  return prefix ? `${prefix.replace(/\/+$/, '')}/${filename}` : filename
}

/** Opens the GridFS bucket on the connection Payload already holds. */
export function getBucket(db: Db | undefined): GridFSBucket {
  if (!db) throw new Error('MongoDB connection is not ready')

  return new GridFSBucket(db, { bucketName: GRIDFS_BUCKET_NAME })
}

/** Bucket on the connection of a running Payload instance (works in requests and scripts). */
export const getPayloadBucket = (payload: Payload) =>
  getBucket((payload.db as unknown as { connection: { db?: Db } }).connection.db)

const bucketFor = (req: PayloadRequest) => getPayloadBucket(req.payload)

/** Removes every stored version of `key`; resolves quietly when there is nothing to remove. */
export async function deleteStoredFile(bucket: GridFSBucket, key: string): Promise<void> {
  const files = await bucket.find({ filename: key }).toArray()

  await Promise.all(files.map((file) => bucket.delete(file._id)))
}

export async function storeFile(
  bucket: GridFSBucket,
  key: string,
  data: Buffer,
  contentType: string,
): Promise<void> {
  // Re-uploading the same key replaces it instead of piling up versions.
  await deleteStoredFile(bucket, key)

  await new Promise<void>((resolve, reject) => {
    const upload = bucket.openUploadStream(key, { metadata: { contentType } })
    upload.once('error', reject)
    upload.once('finish', () => resolve())
    upload.end(data)
  })
}

const staticHandler: StaticHandler = async (req, { headers, params }) => {
  const bucket = bucketFor(req)
  const key = storageKey(params.filename, params.prefix)

  const [file] = await bucket
    .find({ filename: key }, { limit: 1, sort: { uploadDate: -1 } })
    .toArray()

  if (!file) return new Response(null, { status: 404, statusText: 'Not Found' })

  const contentType =
    (file.metadata?.contentType as string | undefined) ?? 'application/octet-stream'
  const etag = `"${file._id.toString()}"`

  const responseHeaders = new Headers(headers)
  responseHeaders.set('Cache-Control', CACHE_CONTROL)
  responseHeaders.set('ETag', etag)
  responseHeaders.set('X-Content-Type-Options', 'nosniff')
  if (contentType === 'image/svg+xml') {
    // User-uploadable SVG can carry script; neutralise it if it is ever opened directly.
    responseHeaders.set(
      'Content-Security-Policy',
      "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    )
  }

  if (req.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers: responseHeaders })
  }

  responseHeaders.set('Content-Type', contentType)
  responseHeaders.set('Content-Length', String(file.length))

  const body = Readable.toWeb(bucket.openDownloadStream(file._id)) as ReadableStream

  return new Response(body, { status: 200, headers: responseHeaders })
}

export const gridfsAdapter: Adapter = () => ({
  name: 'gridfs',

  async handleUpload({ file, req, storageFilePath }) {
    await storeFile(bucketFor(req), storageFilePath, file.buffer, file.mimeType)
  },

  async handleDelete({ req, storageFilePath }) {
    await deleteStoredFile(bucketFor(req), storageFilePath)
  },

  staticHandler,
})
