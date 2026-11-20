import type { GlobalConfig } from 'payload'

import { isAuthenticated } from '@/access'
import { navLinksField } from '@/fields/navLinks'

export const Footer: GlobalConfig = {
  slug: 'footer',
  access: { read: () => true, update: isAuthenticated },
  fields: [
    {
      name: 'newsletter',
      type: 'group',
      fields: [
        { name: 'heading', type: 'text', defaultValue: 'Newsletter' },
        { name: 'text', type: 'textarea' },
        { name: 'placeholder', type: 'text', defaultValue: 'Your Email' },
      ],
    },
    {
      name: 'columns',
      type: 'array',
      fields: [
        { name: 'title', type: 'text', required: true },
        navLinksField('links'),
      ],
    },
    { name: 'logo', type: 'upload', relationTo: 'media' },
    { name: 'paymentImage', type: 'upload', relationTo: 'media' },
    { name: 'copyright', type: 'text' },
  ],
}
