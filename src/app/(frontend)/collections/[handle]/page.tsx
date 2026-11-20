import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { CatalogControls } from '@/components/catalog/CatalogControls/CatalogControls'
import { EmptyState } from '@/components/catalog/EmptyState/EmptyState'
import { Pagination } from '@/components/catalog/Pagination/Pagination'
import { ProductGrid } from '@/components/catalog/ProductGrid/ProductGrid'
import { Container } from '@/components/ui/Container/Container'
import {
  buildCatalogHref,
  hasActiveFilters,
  parseCatalogSearchParams,
  type RawSearchParams,
} from '@/lib/catalog/query'
import { getCollectionByHandle } from '@/services/categories'
import { getCollectionProducts } from '@/services/products'

import styles from './page.module.scss'

type PageProps = {
  params: Promise<{ handle: string }>
  searchParams: Promise<RawSearchParams>
}

/** Number of leading cards whose images are preloaded: the first desktop row. */
const PRIORITY_COUNT = 4

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params
  const collection = await getCollectionByHandle(handle)

  if (!collection) return { title: 'Collection not found' }

  return {
    title: collection.title,
    description: collection.description ?? `Shop ${collection.title}.`,
  }
}

export default async function CollectionPage({ params, searchParams }: PageProps) {
  const { handle } = await params
  const collection = await getCollectionByHandle(handle)

  if (!collection) notFound()

  const query = parseCatalogSearchParams(await searchParams)
  const result = await getCollectionProducts({ collectionId: collection.id, ...query })

  // A page number past the end (stale link, hand-edited URL) is a 404, not an empty listing.
  if (query.page > Math.max(result.totalPages, 1)) notFound()

  const basePath = `/collections/${collection.handle}`
  const filtersActive = hasActiveFilters(query)

  return (
    <Container as="main" className={styles.main}>
      <h1 className={styles.title}>{collection.title}</h1>
      {collection.description ? (
        <p className={styles.description}>{collection.description}</p>
      ) : null}

      <CatalogControls basePath={basePath} query={query} total={result.totalDocs} />

      {result.products.length > 0 ? (
        <ProductGrid products={result.products} priorityCount={PRIORITY_COUNT} />
      ) : filtersActive ? (
        <EmptyState
          title="No products found"
          action={{
            href: buildCatalogHref(basePath, { sort: query.sort }),
            label: 'Clear filters',
          }}
        >
          Try removing a filter or widening the price range.
        </EmptyState>
      ) : (
        <EmptyState
          title="No products yet"
          action={
            collection.id ? { href: '/collections/all', label: 'Shop all products' } : undefined
          }
        >
          There are no products in this collection right now. Please check back soon.
        </EmptyState>
      )}

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        buildHref={(page) => buildCatalogHref(basePath, { ...query, page })}
      />
    </Container>
  )
}
