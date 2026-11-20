import type { TextField } from 'payload'

/**
 * Plain-text link. Stored as a string so imported Shopify-style paths (`/collections/linen`) and
 * external URLs both work without a relationship lookup on every render.
 */
export function linkField(name = 'link', overrides: Partial<TextField> = {}): TextField {
  return {
    name,
    type: 'text',
    admin: { description: 'Site path (e.g. /collections/linen) or full URL.' },
    ...overrides,
  } as TextField
}
