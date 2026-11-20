import type { Block } from 'payload'

import { linkField } from '@/fields/link'

export const CollectionTiles: Block = {
  slug: 'collectionTiles',
  interfaceName: 'CollectionTilesBlock',
  labels: { singular: 'Collection tiles', plural: 'Collection tiles' },
  fields: [
    {
      name: 'tiles',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
        linkField('link', { required: true }),
      ],
    },
  ],
}
