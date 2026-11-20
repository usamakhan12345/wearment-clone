import { CollectionTiles } from './CollectionTiles'
import { FeatureStrip } from './FeatureStrip'
import { HeroSlider } from './HeroSlider'
import { InstagramGrid } from './InstagramGrid'
import { ProductCarousel } from './ProductCarousel'
import { ProductShowcase } from './ProductShowcase'
import { PromoCountdown } from './PromoCountdown'
import { Testimonials } from './Testimonials'

/** Blocks editors can stack on a page. Add the matching renderer in components/blocks. */
export const pageBlocks = [
  HeroSlider,
  CollectionTiles,
  ProductShowcase,
  PromoCountdown,
  ProductCarousel,
  InstagramGrid,
  FeatureStrip,
  Testimonials,
]
