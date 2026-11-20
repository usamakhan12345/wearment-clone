import type { Block } from 'payload'

export const ProductShowcase: Block = {
  slug: 'productShowcase',
  interfaceName: 'ProductShowcaseBlock',
  labels: { singular: 'Product showcase (grid)', plural: 'Product showcases' },
  fields: [
    { name: 'heading', type: 'text', required: true },
    {
      name: 'products',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      admin: {
        description:
          'Hand-picked products, shown in this order. Leave empty to use the newest products of the collection below.',
      },
    },
    {
      // Not named `collection`: Mongoose reserves that key and warns on every startup.
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      label: 'Collection',
      admin: { description: 'Used when no products are picked above.' },
    },
    {
      name: 'limit',
      type: 'number',
      defaultValue: 12,
      min: 1,
      max: 48,
      admin: { description: 'Most products this section can reveal (collection mode).' },
    },
    {
      name: 'initialCount',
      type: 'number',
      defaultValue: 4,
      min: 1,
      admin: { description: 'Products shown before the visitor clicks the button.' },
    },
    { name: 'buttonLabel', type: 'text', defaultValue: 'Show More Products' },
  ],
}
