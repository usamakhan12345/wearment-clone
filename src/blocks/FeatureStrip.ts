import type { Block } from 'payload'

export const FeatureStrip: Block = {
  slug: 'featureStrip',
  interfaceName: 'FeatureStripBlock',
  labels: { singular: 'Feature strip', plural: 'Feature strips' },
  fields: [
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'icon', type: 'upload', relationTo: 'media', required: true },
        { name: 'title', type: 'text', required: true },
        { name: 'text', type: 'textarea' },
      ],
    },
  ],
}
