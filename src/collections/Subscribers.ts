import type { CollectionConfig } from 'payload'

import { isAuthenticated } from '@/access'

/**
 * Newsletter sign-ups from the storefront footer. Anyone may add an email address; only admins can
 * read, edit or remove them, so the list is never exposed through the public API.
 */
export const Subscribers: CollectionConfig = {
  slug: 'subscribers',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'createdAt'],
  },
  access: {
    create: () => true,
    read: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      index: true,
    },
  ],
}
