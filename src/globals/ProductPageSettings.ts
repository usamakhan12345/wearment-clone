import type { GlobalConfig } from 'payload'

import { isAuthenticated } from '@/access'

/** Content shared by every product page: notices, coupons, info panels and trust badges. */
export const ProductPageSettings: GlobalConfig = {
  slug: 'product-page-settings',
  label: 'Product page settings',
  access: { read: () => true, update: isAuthenticated },
  fields: [
    { name: 'shippingNotice', type: 'text' },
    {
      name: 'sizeHelp',
      type: 'group',
      fields: [
        { name: 'heading', type: 'text' },
        { name: 'text', type: 'text' },
      ],
    },
    {
      name: 'deals',
      type: 'group',
      fields: [
        { name: 'heading', type: 'text' },
        {
          name: 'items',
          type: 'array',
          fields: [
            { name: 'code', type: 'text', required: true },
            { name: 'description', type: 'text', required: true },
          ],
        },
      ],
    },
    {
      name: 'infoPanels',
      type: 'array',
      admin: { description: 'Buttons below the add-to-cart area (e.g. Size chart, Returns).' },
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'content', type: 'richText' },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          admin: { description: 'Optional image shown in the panel, e.g. a size chart.' },
        },
      ],
    },
    {
      name: 'trustBadges',
      type: 'array',
      fields: [
        { name: 'icon', type: 'upload', relationTo: 'media' },
        { name: 'title', type: 'text', required: true },
        { name: 'text', type: 'text' },
      ],
    },
    {
      name: 'testimonials',
      type: 'group',
      fields: [
        { name: 'heading', type: 'text' },
        {
          name: 'items',
          type: 'array',
          fields: [
            { name: 'name', type: 'text', required: true },
            { name: 'rating', type: 'number', min: 1, max: 5, defaultValue: 5 },
            { name: 'quote', type: 'textarea', required: true },
          ],
        },
      ],
    },
    { name: 'relatedHeading', type: 'text', defaultValue: 'Check More Collection' },
  ],
}
