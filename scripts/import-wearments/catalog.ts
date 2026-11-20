import type { Payload } from 'payload'

import { slugify } from '../../src/lib/slugify'
import type { Product } from '../../src/payload-types'
import { htmlToPlainText, type LexicalState } from './lib/html'
import { fetchJson, mapLimit, sleep } from './lib/http'
import type { MediaImporter, MediaRequest } from './lib/media'

const BASE_URL = 'https://wearments.com'
const PRODUCT_IMAGE_WIDTH = 1400
const COLLECTION_IMAGE_WIDTH = 1200
const PAGE_SIZE = 250

type ShopifyVariant = {
  title: string
  option1: string | null
  option2: string | null
  option3: string | null
  sku: string | null
  price: string
  compare_at_price: string | null
  available?: boolean
}

type ShopifyProduct = {
  id: number
  title: string
  handle: string
  body_html: string | null
  vendor: string | null
  tags: string[] | string
  created_at: string
  options: { name: string; values: string[] }[]
  variants: ShopifyVariant[]
  images: { src: string }[]
}

type ShopifyCollection = {
  handle: string
  title: string
  body_html: string | null
  products_count: number
  image: { src: string } | null
}

export type CatalogResult = {
  categoryIdByHandle: Map<string, string>
  /** Keyed by the stored handle (`slugify(shopifyHandle)`; a few Shopify handles contain emoji). */
  productIdByHandle: Map<string, string>
  failures: string[]
}

type CatalogContext = {
  payload: Payload
  media: MediaImporter
  htmlToLexical: (html: string) => LexicalState | null
  /** Import only the first N products (for dry runs). */
  limit?: number
}

async function fetchAllProducts(): Promise<ShopifyProduct[]> {
  const products: ShopifyProduct[] = []

  for (let page = 1; ; page++) {
    const data = await fetchJson<{ products: ShopifyProduct[] }>(
      `${BASE_URL}/products.json?limit=${PAGE_SIZE}&page=${page}`,
    )
    products.push(...data.products)
    if (data.products.length < PAGE_SIZE) return products
    await sleep(400)
  }
}

/** Product handles of a collection, in the store's own order. */
async function fetchCollectionHandles(handle: string): Promise<string[]> {
  const handles: string[] = []

  for (let page = 1; ; page++) {
    const data = await fetchJson<{ products: { handle: string }[] }>(
      `${BASE_URL}/collections/${handle}/products.json?limit=${PAGE_SIZE}&page=${page}`,
    )
    handles.push(...data.products.map((product) => product.handle))
    if (data.products.length < PAGE_SIZE) return handles
    await sleep(400)
  }
}

const toTags = (tags: ShopifyProduct['tags']) =>
  (Array.isArray(tags) ? tags : tags.split(',')).map((tag) => tag.trim()).filter(Boolean)

/** Shopify's implicit single-variant option ("Title: Default Title") carries no information. */
const isDefaultOption = (option: { name: string; values: string[] }) =>
  option.name === 'Title' && option.values.length === 1 && option.values[0] === 'Default Title'

/** `handle -> id` for every existing document of the collection. */
export async function loadHandleMap(
  payload: Payload,
  collection: 'products' | 'categories',
): Promise<Map<string, string>> {
  const { docs } = await payload.find({
    collection,
    pagination: false,
    depth: 0,
    draft: true,
    select: { handle: true },
  })

  return new Map(docs.map((doc) => [doc.handle, doc.id]))
}

export async function importCatalog({
  payload,
  media,
  htmlToLexical,
  limit,
}: CatalogContext): Promise<CatalogResult> {
  console.log('\n== Catalog')

  const allProducts = await fetchAllProducts()
  // Oldest first so creation order matches "Date, new to old" sorting even if createdAt is ignored.
  const products = [...allProducts]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(0, limit)
  console.log(`  ${products.length}/${allProducts.length} products to import`)

  const { collections } = await fetchJson<{ collections: ShopifyCollection[] }>(
    `${BASE_URL}/collections.json?limit=250`,
  )
  const usable = collections.filter((collection) => collection.products_count > 0)

  const handlesByCollection = new Map<string, string[]>()
  for (const collection of usable) {
    handlesByCollection.set(collection.handle, await fetchCollectionHandles(collection.handle))
    await sleep(300)
  }
  console.log(`  ${usable.length} non-empty collections: ${usable.map((c) => c.handle).join(', ')}`)

  // --- Images (products + collections) ---------------------------------------------------
  const collectionImageRequests = usable.flatMap((collection) =>
    collection.image
      ? [{ url: collection.image.src, alt: collection.title, width: COLLECTION_IMAGE_WIDTH }]
      : [],
  )
  const productImageRequests: MediaRequest[] = products.flatMap((product) =>
    product.images.map((image, index) => ({
      url: image.src,
      alt: index === 0 ? product.title : `${product.title} - view ${index + 1}`,
      width: PRODUCT_IMAGE_WIDTH,
    })),
  )
  console.log(
    `  importing ${productImageRequests.length + collectionImageRequests.length} images...`,
  )

  let done = 0
  const track = async (request: MediaRequest) => {
    const id = await media.ensure(request)
    if (++done % 50 === 0) console.log(`    ${done} images processed`)
    return id
  }
  const collectionImageIds = await mapLimit(collectionImageRequests, 4, track)
  const productImageIds = await mapLimit(productImageRequests, 6, track)

  // --- Collections -----------------------------------------------------------------------
  const existingCategories = await loadHandleMap(payload, 'categories')
  const categoryIdByHandle = new Map<string, string>()
  let imageCursor = 0

  for (const collection of usable) {
    const imageId = collection.image ? collectionImageIds[imageCursor++] : null
    const data = {
      title: collection.title,
      handle: collection.handle,
      description: collection.body_html ? htmlToPlainText(collection.body_html) : undefined,
      image: imageId ?? undefined,
    }

    const existingId = existingCategories.get(collection.handle)
    const doc = existingId
      ? await payload.update({ collection: 'categories', id: existingId, data })
      : await payload.create({ collection: 'categories', data })
    categoryIdByHandle.set(collection.handle, doc.id)
  }
  console.log(`  ${categoryIdByHandle.size} collections saved`)

  // --- Products --------------------------------------------------------------------------
  const categoriesByProduct = new Map<string, string[]>()
  for (const [collectionHandle, handles] of handlesByCollection) {
    const categoryId = categoryIdByHandle.get(collectionHandle)
    if (!categoryId) continue
    for (const shopifyHandle of handles) {
      const handle = slugify(shopifyHandle)
      categoriesByProduct.set(handle, [...(categoriesByProduct.get(handle) ?? []), categoryId])
    }
  }

  const existingProducts = await loadHandleMap(payload, 'products')
  const productIdByHandle = new Map<string, string>()
  let imageIndex = 0
  let saved = 0
  const failures: string[] = []

  for (const product of products) {
    const handle = slugify(product.handle)
    const imageIds = product.images
      .map(() => productImageIds[imageIndex++])
      .filter((id): id is string => Boolean(id))

    const options = product.options
      .filter((option) => !isDefaultOption(option))
      .map((option) => ({ name: option.name, values: option.values }))

    const data = {
      title: product.title,
      handle,
      shopifyId: String(product.id),
      vendor: product.vendor ?? undefined,
      tags: toTags(product.tags),
      description: product.body_html
        ? (htmlToLexical(product.body_html) as Product['description'])
        : undefined,
      images: imageIds,
      categories: categoriesByProduct.get(handle) ?? [],
      options,
      variants: product.variants.map((variant) => ({
        title: variant.title,
        option1: variant.option1 ?? undefined,
        option2: variant.option2 ?? undefined,
        option3: variant.option3 ?? undefined,
        sku: variant.sku || undefined,
        price: Number.parseFloat(variant.price),
        compareAtPrice: variant.compare_at_price
          ? Number.parseFloat(variant.compare_at_price)
          : undefined,
        available: variant.available ?? true,
      })),
      createdAt: product.created_at,
      _status: 'published' as const,
    }

    try {
      const existingId = existingProducts.get(handle)
      const doc = existingId
        ? await payload.update({ collection: 'products', id: existingId, data, draft: false })
        : await payload.create({ collection: 'products', data, draft: false })

      productIdByHandle.set(handle, doc.id)
    } catch (error) {
      const detail = (error as { data?: { errors?: unknown } }).data?.errors
      const message = `${handle}: ${error instanceof Error ? error.message : error} ${
        detail ? JSON.stringify(detail) : ''
      }`
      failures.push(message)
      console.warn(`  ! product failed ${message}`)
    }

    if (++saved % 25 === 0) console.log(`    ${saved}/${products.length} products processed`)
  }
  console.log(`  ${productIdByHandle.size} products saved, ${failures.length} failed`)

  return { categoryIdByHandle, productIdByHandle, failures }
}
