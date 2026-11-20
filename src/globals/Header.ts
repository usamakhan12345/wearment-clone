import type { GlobalConfig } from 'payload'

import { isAuthenticated } from '@/access'
import { linkField } from '@/fields/link'
import { navLinksField } from '@/fields/navLinks'

export const Header: GlobalConfig = {
  slug: 'header',
  access: { read: () => true, update: isAuthenticated },
  fields: [
    {
      name: 'announcement',
      type: 'group',
      fields: [
        {
          name: 'messages',
          type: 'array',
          fields: [{ name: 'text', type: 'text', required: true }, linkField()],
        },
        {
          name: 'autoplaySeconds',
          type: 'number',
          defaultValue: 4,
          min: 0,
          admin: { description: 'Seconds between messages. 0 disables rotation.' },
        },
      ],
    },
    navLinksField('primaryNav', 'Menu (main links)'),
    navLinksField('secondaryNav', 'Menu (secondary links)'),
  ],
}
