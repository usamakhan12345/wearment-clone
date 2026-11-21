import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

import { JsonLd } from '@/components/catalog/JsonLd/JsonLd'
import { Testimonials } from '@/components/content/Testimonials/Testimonials'
import {
  ProductGallery,
  type GalleryImage,
} from '@/components/product/ProductGallery/ProductGallery'
import { ProductInfo } from '@/components/product/ProductInfo/ProductInfo'
import { RelatedProducts } from '@/components/product/RelatedProducts/RelatedProducts'
import { Container } from '@/components/ui/Container/Container'
import { buildProductJsonLd } from '@/lib/catalog/json-ld'
import { resolveOrigin, toAbsoluteUrl } from '@/lib/catalog/origin'
import { lexicalToPlainText, truncateText } from '@/lib/catalog/rich-text'
import type { Product } from '@/payload-types'
import { getSiteSettings } from '@/services/globals'
import { getProductPageSettings } from '@/services/product-page'
import { getProductByHandle, getRelatedProducts, toImageData } from '@/services/products'

import styles from './page.module.scss'

type PageProps = {
  params: Promise<{ handle: string }>
}

const META_DESCRIPTION_LENGTH = 160

function getMetaDescription(product: Product): string {
  return truncateText(lexicalToPlainText(product.description), META_DESCRIPTION_LENGTH)
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params
  const product = await getProductByHandle(handle)

  if (!product) return { title: 'Product not found' }

  const description = getMetaDescription(product)
  const image = toImageData(product.images?.[0], 'original')

  return {
    title: product.title,
    ...(description ? { description } : {}),
    openGraph: {
      title: product.title,
      type: 'website',
      ...(description ? { description } : {}),
      ...(image
        ? {
            images: [
              {
                url: image.url,
                alt: image.alt || product.title,
                ...(image.width ? { width: image.width } : {}),
                ...(image.height ? { height: image.height } : {}),
              },
            ],
          }
        : {}),
    },
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { handle } = await params
  const product = await getProductByHandle(handle)

  if (!product) notFound()

  const [settings, siteSettings, related, requestHeaders] = await Promise.all([
    getProductPageSettings(),
    getSiteSettings(),
    getRelatedProducts(product),
    headers(),
  ])

  const galleryImages = (product.images ?? []).flatMap((media): GalleryImage[] => {
    const main = toImageData(media, 'original')
    const thumb = toImageData(media, 'card')

    return main && thumb ? [{ main, thumb }] : []
  })

  const origin = resolveOrigin(
    requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host'),
    requestHeaders.get('x-forwarded-proto'),
  )
  const firstVariant = product.variants?.[0]
  const firstCategory = product.categories?.[0]

  const jsonLd = buildProductJsonLd({
    name: product.title,
    description: getMetaDescription(product),
    images: galleryImages.map((image) => toAbsoluteUrl(origin, image.main.url)),
    url: toAbsoluteUrl(origin, `/products/${encodeURIComponent(product.handle)}`),
    sku: firstVariant?.sku,
    brand: product.vendor,
    price: product.price ?? firstVariant?.price,
    available: product.available ?? true,
  })

  const viewAllHref =
    firstCategory && typeof firstCategory !== 'string'
      ? `/collections/${firstCategory.handle}`
      : '/collections/all'

  return (
    <main className={styles.page}>
      <JsonLd data={jsonLd} />

      <Container className={styles.top}>
        <ProductGallery images={galleryImages} title={product.title} />
        <ProductInfo
          product={product}
          settings={settings}
          whatsappNumber={siteSettings.whatsapp?.number ?? null}
        />
      </Container>

      <Testimonials
        heading={settings.testimonials?.heading}
        items={settings.testimonials?.items ?? []}
      />

      <RelatedProducts
        heading={settings.relatedHeading}
        products={related}
        viewAllHref={viewAllHref}
      />
    </main>
  )
}
