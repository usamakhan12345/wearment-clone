import Image from 'next/image'

import { RichText } from '@/components/content/RichText/RichText'
import { DealsBox } from '@/components/product/DealsBox/DealsBox'
import { InfoDialogs, type InfoPanel } from '@/components/product/InfoDialogs/InfoDialogs'
import {
  ProductPurchase,
  type SizeHelp,
} from '@/components/product/ProductPurchase/ProductPurchase'
import { TrustBadges } from '@/components/product/TrustBadges/TrustBadges'
import type { Product, ProductPageSetting } from '@/payload-types'
import { INFO_SLOTS, matchInfoPanels, type InfoSlotKey } from '@/lib/catalog/info-panels'
import { hasLexicalContent } from '@/lib/catalog/rich-text'
import { toOptionData, toVariantData } from '@/lib/catalog/variants'
import { buildWhatsappUrl } from '@/lib/catalog/whatsapp'
import { toImageData, type ImageData } from '@/services/products'

import styles from './ProductInfo.module.scss'

type ProductInfoProps = {
  product: Product
  settings: ProductPageSetting
  /** WhatsApp number from the site settings, used for the size-help link. */
  whatsappNumber: string | null
}

type InfoPanelSetting = NonNullable<ProductPageSetting['infoPanels']>[number]

type PanelSource = {
  title: string
  content: InfoPanelSetting['content']
  image: ImageData | null
  hasContent: boolean
}

const SLOT_ICONS: Record<InfoSlotKey, InfoPanel['icon']> = {
  'size-chart': 'size',
  returns: 'returns',
  shipping: 'shipping',
}

function PanelBody({ panel }: { panel: PanelSource }) {
  return (
    <>
      {panel.image ? (
        <Image
          src={panel.image.url}
          alt={panel.title}
          width={panel.image.width ?? 1200}
          height={panel.image.height ?? 1200}
          sizes="(min-width: 768px) 672px, 100vw"
        />
      ) : null}
      {panel.hasContent ? <RichText data={panel.content} /> : null}
    </>
  )
}

/** Builds the dialog buttons: Details (product description) plus the matching CMS info panels. */
function buildInfoPanels(product: Product, settings: ProductPageSetting): InfoPanel[] {
  const panels: InfoPanel[] = []

  if (hasLexicalContent(product.description)) {
    panels.push({
      key: 'details',
      label: 'Details',
      icon: 'details',
      content: <RichText data={product.description} />,
    })
  }

  // A panel counts as content when it has visible text or an image.
  const sources: PanelSource[] = (settings.infoPanels ?? []).flatMap((panel) => {
    const image = toImageData(panel.image, 'original')
    const hasContent = hasLexicalContent(panel.content)

    return image || hasContent
      ? [{ title: panel.title, content: panel.content, image, hasContent }]
      : []
  })

  const { slots, extra } = matchInfoPanels(sources)

  for (const slot of INFO_SLOTS) {
    const source = slots[slot.key]
    if (!source) continue

    panels.push({
      key: slot.key,
      label: slot.label,
      icon: SLOT_ICONS[slot.key],
      content: <PanelBody panel={source} />,
    })
  }

  extra.forEach((source, index) => {
    panels.push({
      key: `extra-${index}`,
      label: source.title,
      icon: 'generic',
      content: <PanelBody panel={source} />,
    })
  })

  return panels
}

function buildSizeHelp(
  settings: ProductPageSetting,
  product: Product,
  whatsappNumber: string | null,
): SizeHelp | null {
  const heading = settings.sizeHelp?.heading?.trim() || null
  const text = settings.sizeHelp?.text?.trim() || null

  if (!heading && !text) return null

  return {
    heading,
    text,
    href: buildWhatsappUrl(whatsappNumber, `Hi! I need help choosing a size for ${product.title}.`),
  }
}

/** Right-hand column of the product page: notice, title, purchase box, deals, info, badges. */
export function ProductInfo({ product, settings, whatsappNumber }: ProductInfoProps) {
  const options = toOptionData(product.options)
  const variants = toVariantData(product.variants, options.length)

  const deals = (settings.deals?.items ?? []).map((item) => ({
    code: item.code,
    description: item.description,
  }))

  const badges = (settings.trustBadges ?? []).map((badge) => ({
    title: badge.title,
    text: badge.text,
    icon: toImageData(badge.icon, 'card'),
  }))

  const panels = buildInfoPanels(product, settings)

  return (
    <div className={styles.info}>
      {settings.shippingNotice ? <p className={styles.notice}>{settings.shippingNotice}</p> : null}

      <div className={styles.panel}>
        <h1 className={styles.title}>{product.title}</h1>

        <ProductPurchase
          options={options}
          variants={variants}
          sizeHelp={buildSizeHelp(settings, product, whatsappNumber)}
        />

        <DealsBox heading={settings.deals?.heading} deals={deals} />

        <InfoDialogs panels={panels} />

        <TrustBadges badges={badges} />
      </div>
    </div>
  )
}
