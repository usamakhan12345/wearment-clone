import type { ArrayField } from 'payload'

import { linkField } from './link'

/** Repeatable label + link pairs, used by the header and footer menus. */
export function navLinksField(name: string, label?: string): ArrayField {
  return {
    name,
    type: 'array',
    label,
    fields: [
      { name: 'label', type: 'text', required: true },
      linkField('link', { required: true }),
    ],
  }
}
