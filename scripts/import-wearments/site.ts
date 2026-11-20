import type { Payload } from 'payload'

import { HOME_PAGE_SLUG } from '../../src/collections/Pages'
import { slugify } from '../../src/lib/slugify'
import type { Page } from '../../src/payload-types'
import { INSTAGRAM_ITEMS } from './data/instagram'
import { HOME_PRODUCT_HANDLES } from './data/home-products'
import type { LexicalState } from './lib/html'
import type { MediaImporter } from './lib/media'
import { TEXT_PAGES } from './pages'

const SHOPIFY_FILES = 'https://cdn.shopify.com/s/files/1/0686/2349/9402/files'
const SITE_URL = 'https://wearments.com'

type SiteContext = {
  payload: Payload
  media: MediaImporter
  htmlToLexical: (html: string) => LexicalState | null
  categoryIdByHandle: Map<string, string>
  productIdByHandle: Map<string, string>
}

type Layout = NonNullable<Page['layout']>

const pagePath = (title: string) =>
  `/pages/${TEXT_PAGES.find((page) => page.title === title)?.handle}`

/** Next time the wall clock hits hour:minute UTC (the original countdown resets daily). */
function nextOccurrenceUtc(hour: number, minute: number): string {
  const now = new Date()
  const target = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute),
  )
  if (target <= now) target.setUTCDate(target.getUTCDate() + 1)
  return target.toISOString()
}

export async function importSite({
  payload,
  media,
  htmlToLexical,
  categoryIdByHandle,
  productIdByHandle,
}: SiteContext) {
  console.log('\n== Site content (globals + home page)')

  const image = async (url: string, alt: string, width?: number) => {
    const id = await media.ensure({ url, alt, width })
    if (!id) throw new Error(`Required image could not be imported: ${url}`)
    return id
  }
  const productIds = (handles: readonly string[]) =>
    handles.flatMap((handle) => productIdByHandle.get(slugify(handle)) ?? [])

  // --- Settings ---------------------------------------------------------------------------
  const logoId = await image(`${SITE_URL}/cdn/shop/files/wearments.png`, 'Wearments Clothing')

  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      siteName: 'Wearments Clothing',
      logo: logoId,
      whatsapp: { number: '923042609541', message: 'Hello! I need help with my order.' },
      social: {
        instagram: 'https://www.instagram.com/wearments_clothing/',
        facebook: 'https://www.facebook.com/wearments',
        googleMaps: 'https://maps.app.goo.gl/XJ2nfNCAjSr4hPoz7',
      },
    },
  })

  // --- Header -----------------------------------------------------------------------------
  await payload.updateGlobal({
    slug: 'header',
    data: {
      announcement: {
        autoplaySeconds: 4,
        messages: [
          { text: '11.11 Sale is live! Rs 300 OFF on Night Wear', link: '/collections/solid' },
          { text: '🚚 FREE Shipping on 2+ Items | Single Item Ships for Rs.99' },
          { text: 'Welcome to our store' },
          { text: 'Online & Card Payment Available' },
          { text: 'Free GIFT with every order!!' },
          { text: '7 DAYS Return' },
        ],
      },
      primaryNav: [
        { label: 'Home', link: '/' },
        { label: 'Casual Wear', link: '/collections/casual-wear' },
        { label: 'Dupatta', link: '/collections/dupatta' },
        { label: 'Solid', link: '/collections/solid' },
        { label: 'Linen', link: '/collections/linen' },
        { label: 'Night wear', link: '/collections/night-wear' },
        { label: 'Western wear', link: '/collections/western-wear' },
        { label: 'Winter Collection', link: '/collections/khaddar' },
      ],
      secondaryNav: [
        { label: 'FAQs', link: pagePath('FAQs') },
        { label: 'Returns & Refunds Policy', link: pagePath('Returns & Refunds Policy') },
        { label: 'Privacy Policy', link: pagePath('Privacy Policy') },
        { label: 'Contact Us', link: pagePath('Contact Us') },
      ],
    },
  })

  // --- Footer -----------------------------------------------------------------------------
  const footerLogoId = await image(
    `${SHOPIFY_FILES}/gempages_557497775269348441-96193c1a-7586-4a26-b15f-52f6f27eec3e.png`,
    'Wearments',
  )
  const paymentId = await image(
    'https://ucarecdn.com/7a19ffde-0b90-49d8-b04d-978897ba830c/-/format/auto/-/preview/3000x3000/-/quality/lighter/payments.png',
    'Accepted payment methods',
  )

  await payload.updateGlobal({
    slug: 'footer',
    data: {
      newsletter: {
        heading: 'Newsletter',
        text: 'Enter your email address for new arrivals, discounts, promotions, and more!',
        placeholder: 'Your Email',
      },
      columns: [
        {
          title: 'Quick Links',
          links: [
            { label: 'FAQ', link: pagePath('FAQs') },
            { label: 'Terms & Condition', link: pagePath('Terms & Condition') },
          ],
        },
        {
          title: 'Usefull Links',
          links: [
            { label: 'About Us', link: pagePath('About Us') },
            { label: 'Privacy Policy', link: pagePath('Privacy Policy') },
            { label: 'Returns & Refunds', link: pagePath('Returns & Refunds Policy') },
            { label: 'Contact Us', link: pagePath('Contact Us') },
            { label: 'Shipping Policy', link: pagePath('Shipping Policy') },
          ],
        },
      ],
      logo: footerLogoId,
      paymentImage: paymentId,
      copyright: '© 2025 Wearments.',
    },
  })

  // --- Product page settings --------------------------------------------------------------
  const sizeChartId = await image(`${SHOPIFY_FILES}/hhhh.png`, 'Size Chart', 1600)
  const trustIcons = await Promise.all(
    [
      'e5125dd1-a438-4f9e-8a8c-69bc47f9cb73',
      '86e3c9c3-3d38-47ca-8a24-ccf9e66a76bf',
      'f2f77318-14fc-47f8-99ac-2a4612510277',
      '55e4a0fd-8097-43be-86e3-ee3bab9028b0',
    ].map((id, index) =>
      image(
        `https://cdn.shopify.com/s/files/1/2005/9307/files/432750572815254551-${id}.svg`,
        `Trust badge ${index + 1}`,
      ),
    ),
  )
  const trustBadges = [
    { title: 'Discounted Shipping', text: '70/- Across Pakistan' },
    { title: 'Easy Returns', text: '7 Day Policy' },
    { title: 'Satisfaction Guaranteed', text: 'No need to worry' },
    { title: 'Fast Customer Support', text: 'We are here for you!' },
  ].map((badge, index) => ({ ...badge, icon: trustIcons[index] }))

  await payload.updateGlobal({
    slug: 'product-page-settings',
    data: {
      shippingNotice: '🚚 Free shipping on 2 or more items! | Standard delivery Rs.99',
      sizeHelp: {
        heading: 'Confused about size?',
        text: 'WhatsApp us we’ll suggest your size instantly',
      },
      deals: {
        heading: '🎁 Exclusive Deals — Apply at Checkout:',
        items: [
          { code: 'WEARMENTS150', description: 'Buy any 2 items, get Rs.150 off' },
          { code: 'WEARMENTS200', description: 'Buy any 3 items, get Rs.200 off' },
        ],
      },
      infoPanels: [
        { title: 'Size Chart', image: sizeChartId },
        {
          title: 'Returns & Refunds',
          content: htmlToLexical(
            '<p>We offer a 7-day hassle-free return, refund, and exchange policy for unused products in their original condition. Get a quick refund via store credit or bank transfer after approval. Need help? Contact us now!</p>',
          ) as never,
        },
        {
          title: 'Shipping Info',
          content: htmlToLexical(
            '<p>We deliver across Pakistan in 3-5 business days with secure and reliable shipping. Enjoy fast processing and track your order easily. Have questions? Contact us now!</p>',
          ) as never,
        },
      ],
      trustBadges,
      testimonials: {
        heading: 'What Our Customers Are Saying',
        items: [
          {
            name: 'Muazma Batool',
            rating: 5,
            quote:
              "Today i have received my parcel and i am stunned with the stitching and fabric quality. Honestly I wasn't expecting this much quality in so reasonable pricefor 3 piece dress.",
          },
          {
            name: 'Zoya Ejaz',
            rating: 5,
            quote:
              "It's was such a best experience of mine by purchasing from you, you have sent a gift for me with that, I am surprised totally happy by my purchase Fabric and colour is same as shown .. and it's very breathable fabric ... loved the quality,",
          },
          {
            name: 'Madiha Ahmad',
            rating: 5,
            quote:
              "I got my parcel today and I'm very impressed, MashaAllah. The fabric quality is top-notch and exactly as described. I'll surely shop from you again. May Allah put barakah in your business and efforts. Ameen",
          },
          {
            name: 'Insa Usman',
            rating: 5,
            quote:
              '"I\'m very happy with my order! The clothes are beautiful, the quality is excellent, and they look exactly as shown. Thank you so much for the lovely pendant gift-it was such a thoughtful surprise and truly appreciated. Overall, a wonderful shopping experience. Highly recommended!"',
          },
        ],
      },
      relatedHeading: 'Check More Collection',
    },
  })

  // --- Home page layout -------------------------------------------------------------------
  const heroSlides = await Promise.all(
    [
      ['Lavender_Nightwear_11.11_Sale.png', '/collections/solid'],
      ['1fcf6a29-6b66-4c31-a556-3a7492e3a36c.png', '/collections/solid'],
      ['e566eeea-1ca8-4a2a-8248-69d20b32383b.png', '/collections/western-wear'],
      ['magnific_resize-this-banner-to-169_wPkDMgO7EI.jpg', '/collections/casual-wear'],
      ['magnific_resize-this-banner-to-169_rlEznQuxtc.jpg', '/collections/all'],
      ['western_wear_7__jpg.jpg', undefined],
    ].map(async ([file, link], index) => ({
      image: await image(`${SHOPIFY_FILES}/${file}`, `Wearments banner ${index + 1}`, 2200),
      link,
    })),
  )

  const tiles = await Promise.all(
    [
      ['NIGHT_WEAR_887_x_1774_px.jpg', '/collections/casual-wear', 'Lawn'],
      ['10_4ff0ea70-ece1-48f9-9ab7-894d775784db.jpg', '/collections/solid', 'Solids'],
      ['14_f744201a-1ee7-4199-9d9e-25b4729ab9b7.jpg', '/collections/linen', 'Linen'],
      ['11_7e8cf791-abc2-4151-aeac-e6e6dc69e003.jpg', '/collections/western-wear', 'Western'],
      ['13_2904e733-4307-4814-bea6-7b62fec82af3.jpg', '/collections/khaddar', 'Winter Collection'],
      ['1_b74c6363-80c0-44df-905e-e99e3294d237.jpg', '/collections/night-wear', 'Night Wear'],
    ].map(async ([file, link, label]) => ({
      image: await image(`${SHOPIFY_FILES}/${file}`, `${label} collection`, 1400),
      link: link as string,
    })),
  )

  const promoSlides = await Promise.all(
    [
      ['cbe3c30f-4863-43e2-b0cc-17f9ef7c51ae', '/collections/linen'],
      ['b93c9f5a-8d93-4288-9d9a-4314ffe2fd31', '/collections/casual-wear'],
      ['1e269efb-0c85-44d3-9e4b-7d7043dc280b', '/collections/western-wear'],
    ].map(async ([id, link], index) => ({
      image: await image(
        `${SHOPIFY_FILES}/gempages_557497775269348441-${id}.jpg`,
        `New arrivals banner ${index + 1}`,
        1400,
      ),
      link,
    })),
  )

  const instagramIds = await media.ensureMany(
    INSTAGRAM_ITEMS.map((item, index) => ({
      url: item.url,
      alt: item.caption || `Instagram post ${index + 1}`,
    })),
    6,
  )
  const instagramItems = INSTAGRAM_ITEMS.flatMap((item, index) => {
    const id = instagramIds[index]
    return id ? [{ image: id, caption: item.caption }] : []
  })
  if (instagramItems.length < INSTAGRAM_ITEMS.length) {
    console.warn(
      `  ! ${INSTAGRAM_ITEMS.length - instagramItems.length} Instagram images unavailable (signed URLs expire)`,
    )
  }

  const featureIcons = await Promise.all([
    image(
      'https://ucarecdn.com/97c49500-86b5-4ef5-8661-e23b50d86d93/i1.svg',
      'Discounted shipping',
    ),
    image('https://ucarecdn.com/a712f53a-ec86-43a5-8866-c69b056d7210/i3.svg', '7-day returns'),
    image(
      `${SHOPIFY_FILES}/gempages_557497775269348441-8d0a72d7-caa3-44b9-8342-a99cc43a33b5.svg`,
      'Customer support',
    ),
    image('https://ucarecdn.com/8422894b-d08c-450d-aa7a-25fb8447ea1d/i2.svg', 'Secure payment'),
  ])

  const showcase = (
    heading: string,
    collectionHandle: string,
    handles: readonly string[],
  ): Layout[number] => ({
    blockType: 'productShowcase',
    heading,
    products: productIds(handles),
    category: categoryIdByHandle.get(collectionHandle),
    limit: 12,
    initialCount: 4,
    buttonLabel: 'Show More Products',
  })

  const layout: Layout = [
    { blockType: 'heroSlider', slides: heroSlides, autoplaySeconds: 5 },
    { blockType: 'collectionTiles', tiles },
    showcase('Linen Collection', 'linen', HOME_PRODUCT_HANDLES.linen),
    showcase('Lawn Collection', 'casual-wear', HOME_PRODUCT_HANDLES.lawn),
    showcase('Solids Collection', 'solid', HOME_PRODUCT_HANDLES.solids),
    {
      blockType: 'promoCountdown',
      heading: 'Discounts Available for Limited Time!!',
      endsAt: nextOccurrenceUtc(5, 30),
      restartDaily: true,
      eyebrow: 'NEW ARRIVALS',
      text: 'Discover Our Fall Collection 2025',
      buttonLabel: 'See All Products',
      buttonLink: '/collections/all',
      slides: promoSlides,
    },
    {
      blockType: 'productCarousel',
      heading: 'Exclusive Offers',
      subheading: 'Avail Huge Disscounts along this Season',
      products: productIds(HOME_PRODUCT_HANDLES.exclusive),
    },
    {
      blockType: 'instagramGrid',
      heading: 'Checkout us on Insta!',
      profileUrl: 'https://www.instagram.com/wearments_clothing/',
      items: instagramItems,
    },
    {
      blockType: 'featureStrip',
      items: [
        {
          icon: featureIcons[0],
          title: 'Discounted Shipping',
          text: 'Free shipping/- on 2 or more items across Pakistan',
        },
        {
          icon: featureIcons[1],
          title: '7-Days Returns',
          text: 'Covered by our Return and Exchange Policy',
        },
        {
          icon: featureIcons[2],
          title: 'Customer Support',
          text: 'Want to contact us? we are here for you!',
        },
        {
          icon: featureIcons[3],
          title: 'Secure Payment',
          text: '100% Secure Online & Offline Payment',
        },
      ],
    },
  ]

  const existing = await payload.find({
    collection: 'pages',
    where: { slug: { equals: HOME_PAGE_SLUG } },
    limit: 1,
    depth: 0,
    draft: true,
  })
  const data = { title: 'Home', slug: HOME_PAGE_SLUG, layout, _status: 'published' as const }
  const existingId = existing.docs[0]?.id

  if (existingId) {
    await payload.update({ collection: 'pages', id: existingId, data, draft: false })
  } else {
    await payload.create({ collection: 'pages', data, draft: false })
  }

  console.log(`  home page saved with ${layout.length} sections`)
}
