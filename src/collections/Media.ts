import type { CollectionConfig } from 'payload'

import { isAuthenticated } from '@/access'

/**
 * Files are not kept on disk: the cloud-storage plugin in payload.config.ts stores them in
 * MongoDB GridFS (see src/storage/gridfs.ts) and Payload serves them at /api/media/file/<name>.
 *
 * Everything raster is converted to WebP, the original is capped at 2000px wide and one small
 * `card` rendition is generated. That keeps the database small (a free Atlas cluster holds
 * 512 MB). SVGs are stored untouched.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  admin: {
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'alt', 'mimeType', 'createdAt'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
    {
      // Original location of an imported file. Lets the importer skip files it already has.
      name: 'sourceUrl',
      type: 'text',
      index: true,
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
  upload: {
    mimeTypes: ['image/*'],
    formatOptions: { format: 'webp', options: { quality: 78 } },
    // Cap the stored original; the storefront never shows anything wider than ~1440px.
    resizeOptions: { width: 2000, withoutEnlargement: true },
    imageSizes: [
      {
        name: 'card',
        width: 640,
        withoutEnlargement: true,
        formatOptions: { format: 'webp', options: { quality: 76 } },
      },
    ],
    adminThumbnail: 'card',
  },
}
