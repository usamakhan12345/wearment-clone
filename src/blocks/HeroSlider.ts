import type { Block } from 'payload'

import { linkField } from '@/fields/link'

export const HeroSlider: Block = {
  slug: 'heroSlider',
  interfaceName: 'HeroSliderBlock',
  labels: { singular: 'Hero slider', plural: 'Hero sliders' },
  fields: [
    {
      name: 'slides',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [{ name: 'image', type: 'upload', relationTo: 'media', required: true }, linkField()],
    },
    {
      name: 'autoplaySeconds',
      type: 'number',
      defaultValue: 5,
      min: 0,
      admin: { description: 'Seconds between slides. 0 disables autoplay.' },
    },
  ],
}
