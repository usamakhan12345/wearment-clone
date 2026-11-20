import type { Block } from 'payload'

import { linkField } from '@/fields/link'

export const InstagramGrid: Block = {
  slug: 'instagramGrid',
  interfaceName: 'InstagramGridBlock',
  labels: { singular: 'Instagram grid', plural: 'Instagram grids' },
  fields: [
    { name: 'heading', type: 'text', required: true },
    linkField('profileUrl'),
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
        linkField('link'),
        { name: 'caption', type: 'text' },
      ],
    },
  ],
}
