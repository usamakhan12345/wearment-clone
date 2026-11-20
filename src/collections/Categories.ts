import type { CollectionConfig } from 'payload'

import { isAuthenticated } from '@/access'
import { handleField } from '@/fields/handle'

/** Shopify calls these "collections"; named `categories` here to avoid clashing with Payload's term. */
export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: { singular: 'Collection', plural: 'Collections' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'handle', 'updatedAt'],
  },
  access: {
    read: () => true,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    handleField(),
    { name: 'description', type: 'textarea' },
    { name: 'image', type: 'upload', relationTo: 'media' },
  ],
}
