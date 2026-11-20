import type { Block } from 'payload'

import { linkField } from '@/fields/link'

export const PromoCountdown: Block = {
  slug: 'promoCountdown',
  interfaceName: 'PromoCountdownBlock',
  labels: { singular: 'Countdown + promo slider', plural: 'Countdown + promo sliders' },
  fields: [
    { name: 'heading', type: 'text', required: true },
    {
      name: 'endsAt',
      type: 'date',
      required: true,
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'restartDaily',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'When the countdown ends, restart it in 24-hour cycles.' },
    },
    {
      name: 'eyebrow',
      type: 'text',
      admin: { description: 'Small label above the text, e.g. NEW ARRIVALS.' },
    },
    { name: 'text', type: 'textarea' },
    { name: 'buttonLabel', type: 'text' },
    linkField('buttonLink'),
    {
      name: 'slides',
      type: 'array',
      fields: [{ name: 'image', type: 'upload', relationTo: 'media', required: true }, linkField()],
    },
  ],
}
