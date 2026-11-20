import { Fragment } from 'react'

import type { Page } from '@/payload-types'

import { CollectionTiles } from './CollectionTiles/CollectionTiles'
import { FeatureStrip } from './FeatureStrip/FeatureStrip'
import { HeroSlider } from './HeroSlider/HeroSlider'
import { InstagramGrid } from './InstagramGrid/InstagramGrid'
import { ProductCarousel } from './ProductCarousel/ProductCarousel'
import { ProductShowcase } from './ProductShowcase/ProductShowcase'
import { PromoCountdown } from './PromoCountdown/PromoCountdown'
import { Testimonials } from './Testimonials/Testimonials'

/** One entry of a page's `layout` field; a union of every block type, discriminated by `blockType`. */
export type PageBlock = NonNullable<Page['layout']>[number]

// Adding a block type to the schema makes this call fail to compile until it is handled below.
function ignoreUnknownBlock(_block: never): null {
  return null
}

function renderBlock(block: PageBlock) {
  switch (block.blockType) {
    case 'heroSlider':
      return <HeroSlider block={block} />
    case 'collectionTiles':
      return <CollectionTiles block={block} />
    case 'productShowcase':
      return <ProductShowcase block={block} />
    case 'promoCountdown':
      return <PromoCountdown block={block} />
    case 'productCarousel':
      return <ProductCarousel block={block} />
    case 'instagramGrid':
      return <InstagramGrid block={block} />
    case 'featureStrip':
      return <FeatureStrip block={block} />
    case 'testimonials':
      return <Testimonials block={block} />
    default:
      // Content saved before a block was removed from the schema renders nothing instead of crashing.
      return ignoreUnknownBlock(block)
  }
}

/** Renders a page's layout blocks top to bottom. */
export function RenderBlocks({ blocks }: { blocks: Page['layout'] }) {
  if (!blocks || blocks.length === 0) return null

  return (
    <>
      {blocks.map((block, index) => (
        <Fragment key={block.id ?? `${block.blockType}-${index}`}>{renderBlock(block)}</Fragment>
      ))}
    </>
  )
}
