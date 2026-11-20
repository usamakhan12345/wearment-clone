import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { EmptyState } from '@/components/catalog/EmptyState/EmptyState'
import { Pagination } from '@/components/catalog/Pagination/Pagination'
import { ProductGrid } from '@/components/catalog/ProductGrid/ProductGrid'
import { Container } from '@/components/ui/Container/Container'
import {
  buildCatalogHref,
  parseCatalogSearchParams,
  parseSearchTerm,
  type RawSearchParams,
} from '@/lib/catalog/query'
import { searchProducts, type ProductPage } from '@/services/products'

import styles from './page.module.scss'

type PageProps = {
  searchParams: Promise<RawSearchParams>
}

const PRIORITY_COUNT = 4
const NO_RESULTS: ProductPage = { products: [], totalDocs: 0, totalPages: 0, page: 1 }

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const term = parseSearchTerm((await searchParams).q)

  return {
    title: term ? `Search: ${term}` : 'Search',
    // Search result pages are thin, near-infinite content; keep them out of the index.
    robots: { index: false, follow: true },
  }
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams
  const term = parseSearchTerm(params.q)
  const { page } = parseCatalogSearchParams(params)

  const result = term ? await searchProducts(term, page) : NO_RESULTS

  if (page > Math.max(result.totalPages, 1)) notFound()

  return (
    <Container as="main" className={styles.main}>
      <h1 className={styles.title}>Search results</h1>

      <form className={styles.form} action="/search" method="get" role="search">
        <label className={styles.label} htmlFor="search-term">
          Search products
        </label>
        <input
          id="search-term"
          className={styles.input}
          type="search"
          name="q"
          defaultValue={term ?? ''}
          maxLength={100}
          placeholder="Search products"
          autoComplete="off"
        />
        <button type="submit" className={styles.submit}>
          Search
        </button>
      </form>

      {term ? (
        <p className={styles.summary} aria-live="polite">
          {result.totalDocs} {result.totalDocs === 1 ? 'result' : 'results'} for &ldquo;{term}
          &rdquo;
        </p>
      ) : null}

      {result.products.length > 0 ? (
        <ProductGrid products={result.products} priorityCount={PRIORITY_COUNT} />
      ) : term ? (
        <EmptyState
          title="No results found"
          action={{ href: '/collections/all', label: 'Browse all products' }}
        >
          Check the spelling or try a different, shorter search term.
        </EmptyState>
      ) : (
        <EmptyState title="Search our products">
          Type a product name above to see matching results.
        </EmptyState>
      )}

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        buildHref={(target) => buildCatalogHref('/search', { page: target }, { q: term })}
      />
    </Container>
  )
}
