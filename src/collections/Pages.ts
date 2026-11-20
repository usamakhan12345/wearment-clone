import type { CollectionConfig } from 'payload'

import { isAuthenticated, isAuthenticatedOrPublished } from '@/access'
import { pageBlocks } from '@/blocks'
import { handleField } from '@/fields/handle'

/** Slug of the page rendered at `/`. */
export const HOME_PAGE_SLUG = 'home'

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
  },
  access: {
    read: isAuthenticatedOrPublished,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  versions: {
    drafts: true,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    handleField({ name: 'slug' }),
    {
      name: 'layout',
      type: 'blocks',
      blocks: pageBlocks,
      admin: { description: 'Page sections, rendered top to bottom (used by the home page).' },
    },
    {
      name: 'content',
      type: 'richText',
      admin: { description: 'Free-form body, used by text pages such as policies and FAQs.' },
    },
  ],
}
