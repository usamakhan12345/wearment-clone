import path from 'path'
import { fileURLToPath } from 'url'

import type { CollectionConfig } from 'payload'

import { isAuthenticated } from '@/access'

const dirname = path.dirname(fileURLToPath(import.meta.url))

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
    // Project-root /media (gitignored). Swap for a cloud storage adapter in production.
    staticDir: path.resolve(dirname, '../../media'),
    mimeTypes: ['image/*'],
    // Generated with sharp on upload. SVGs are stored as-is.
    imageSizes: [
      { name: 'card', width: 640, withoutEnlargement: true },
      { name: 'large', width: 1280, withoutEnlargement: true },
    ],
    adminThumbnail: 'card',
  },
}
