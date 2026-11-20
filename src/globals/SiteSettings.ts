import type { GlobalConfig } from 'payload'

import { isAuthenticated } from '@/access'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site settings',
  access: { read: () => true, update: isAuthenticated },
  fields: [
    { name: 'siteName', type: 'text', required: true },
    { name: 'tagline', type: 'text' },
    { name: 'logo', type: 'upload', relationTo: 'media' },
    {
      name: 'whatsapp',
      type: 'group',
      fields: [
        {
          name: 'number',
          type: 'text',
          admin: { description: 'International format without + or spaces, e.g. 923001234567.' },
        },
        { name: 'message', type: 'text', defaultValue: 'Hello! I need help with my order.' },
      ],
    },
    {
      name: 'social',
      type: 'group',
      fields: [
        { name: 'instagram', type: 'text' },
        { name: 'facebook', type: 'text' },
        { name: 'googleMaps', type: 'text' },
      ],
    },
  ],
}
