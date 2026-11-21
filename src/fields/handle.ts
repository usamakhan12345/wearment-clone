import type { TextField } from 'payload'

import { slugify } from '@/lib/slugify'

type HandleFieldOptions = {
  /** Field name; Shopify calls it `handle`, pages use `slug`. */
  name?: string
  /** Sibling field the handle is derived from when left empty. */
  from?: string
}

/** URL-safe unique identifier, generated from a sibling field when left empty. */
export function handleField({
  name = 'handle',
  from = 'title',
}: HandleFieldOptions = {}): TextField {
  return {
    name,
    type: 'text',
    required: true,
    unique: true,
    index: true,
    admin: {
      position: 'sidebar',
      description: `Used in the URL. Generated from "${from}" when left empty.`,
    },
    hooks: {
      beforeValidate: [({ value, data }) => slugify(value || data?.[from] || '')],
    },
  }
}
