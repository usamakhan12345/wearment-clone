import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { isAuthenticated, isAuthenticatedOrPublished } from '@/access'
import { handleField } from '@/fields/handle'
import { deriveProductPricing, type PricedVariant } from '@/lib/product-pricing'

/**
 * Keeps the listing/sort/filter fields (`price`, `compareAtPrice`, `available`) in sync with the
 * variants so editors only maintain one source of truth.
 */
const syncPricingFromVariants: CollectionBeforeChangeHook = ({ data }) => {
  const derived = deriveProductPricing(data.variants as PricedVariant[] | undefined)

  return derived ? { ...data, ...derived } : data
}

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'price', 'available', '_status', 'updatedAt'],
  },
  access: {
    read: isAuthenticatedOrPublished,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  versions: { drafts: true },
  hooks: { beforeChange: [syncPricingFromVariants] },
  fields: [
    { name: 'title', type: 'text', required: true },
    handleField(),
    { name: 'description', type: 'richText' },
    {
      name: 'images',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      admin: { description: 'The first image is the main one. Drag to reorder.' },
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      index: true,
    },
    {
      name: 'options',
      type: 'array',
      admin: { description: 'e.g. Size with values S, M, L.' },
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'values', type: 'text', hasMany: true, required: true },
      ],
    },
    {
      name: 'variants',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'title', type: 'text', required: true, admin: { description: 'e.g. "L" or "Red / M".' } },
        { name: 'option1', type: 'text' },
        { name: 'option2', type: 'text' },
        { name: 'option3', type: 'text' },
        { name: 'sku', type: 'text' },
        { name: 'price', type: 'number', required: true, min: 0 },
        { name: 'compareAtPrice', type: 'number', min: 0 },
        { name: 'available', type: 'checkbox', defaultValue: true },
      ],
    },
    { name: 'tags', type: 'text', hasMany: true },
    { name: 'vendor', type: 'text' },
    {
      name: 'shopifyId',
      type: 'text',
      index: true,
      admin: { readOnly: true, position: 'sidebar' },
    },
    // Derived from variants by `syncPricingFromVariants`; read-only in the admin UI.
    { name: 'price', type: 'number', index: true, admin: { readOnly: true, position: 'sidebar' } },
    { name: 'compareAtPrice', type: 'number', admin: { readOnly: true, position: 'sidebar' } },
    {
      name: 'available',
      type: 'checkbox',
      index: true,
      defaultValue: true,
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
}
