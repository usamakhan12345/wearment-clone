import type { Block } from 'payload'

export const Testimonials: Block = {
  slug: 'testimonials',
  interfaceName: 'TestimonialsBlock',
  labels: { singular: 'Testimonials', plural: 'Testimonials' },
  fields: [
    { name: 'heading', type: 'text', required: true },
    { name: 'badge', type: 'text', admin: { description: 'e.g. "5000+ 5 Star reviews".' } },
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'rating', type: 'number', min: 1, max: 5, defaultValue: 5 },
        { name: 'quote', type: 'textarea', required: true },
      ],
    },
  ],
}
