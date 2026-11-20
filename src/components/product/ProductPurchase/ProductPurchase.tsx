'use client'

import { useId, useState } from 'react'

import { OptionSelector } from '@/components/product/OptionSelector/OptionSelector'
import { QuantityStepper } from '@/components/product/QuantityStepper/QuantityStepper'
import {
  findVariant,
  getDefaultSelection,
  getOptionValueStates,
  isDefaultOption,
  pickDefaultVariant,
  selectOption,
  type OptionData,
  type VariantData,
} from '@/lib/catalog/variants'
import { formatPrice } from '@/lib/format'

import styles from './ProductPurchase.module.scss'

export type SizeHelp = {
  heading: string | null
  text: string | null
  /** Click-to-chat link; `null` renders the help text without a link. */
  href: string | null
}

type ProductPurchaseProps = {
  options: OptionData[]
  variants: VariantData[]
  sizeHelp: SizeHelp | null
}

const COMING_SOON = 'Coming soon'

/**
 * Price, option selection, quantity and the (not yet functional) purchase buttons. Selecting
 * options resolves the matching variant and updates price and availability.
 */
export function ProductPurchase({ options, variants, sizeHelp }: ProductPurchaseProps) {
  const groupId = useId()
  const noteId = useId()

  const [selection, setSelection] = useState(() => getDefaultSelection(options, variants))
  const [quantity, setQuantity] = useState(1)

  const variant = findVariant(options, variants, selection) ?? pickDefaultVariant(variants)
  const hasSizeHelp = Boolean(sizeHelp && (sizeHelp.heading || sizeHelp.text))

  return (
    <div className={styles.purchase}>
      {variant ? (
        <div className={styles.priceBlock} aria-live="polite">
          <p className={styles.price}>
            <span className={styles.current}>{formatPrice(variant.price)}</span>
            {variant.compareAtPrice ? (
              <s className={styles.compare}>
                <span className={styles.srOnly}>Regular price </span>
                {formatPrice(variant.compareAtPrice)}
              </s>
            ) : null}
          </p>
          {!variant.available ? <p className={styles.soldOut}>Sold out</p> : null}
        </div>
      ) : null}

      <div className={styles.choices}>
        <div className={styles.options}>
          {options.map((option, index) =>
            isDefaultOption(option) ? null : (
              <OptionSelector
                key={`${option.name}-${index}`}
                name={option.name}
                groupName={`${groupId}-${index}`}
                selectedValue={selection[index] ?? ''}
                states={getOptionValueStates(options, variants, selection, index)}
                onSelect={(value) => setSelection(selectOption(selection, index, value))}
              />
            ),
          )}
        </div>

        {sizeHelp && hasSizeHelp ? <SizeHelpBlock help={sizeHelp} /> : null}
      </div>

      <QuantityStepper value={quantity} onChange={setQuantity} />

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.action} ${styles.buy}`}
          aria-disabled="true"
          aria-describedby={noteId}
          title={COMING_SOON}
        >
          BUY NOW
        </button>
        <button
          type="button"
          className={`${styles.action} ${styles.cart}`}
          aria-disabled="true"
          aria-describedby={noteId}
          title={COMING_SOON}
        >
          Add To Cart
        </button>
      </div>
      <p id={noteId} className={styles.srOnly}>
        Online ordering is coming soon.
      </p>
    </div>
  )
}

function SizeHelpBlock({ help }: { help: SizeHelp }) {
  const content = (
    <>
      {help.heading ? <strong className={styles.helpHeading}>{help.heading}</strong> : null}
      {help.text ? <span className={styles.helpText}>{help.text}</span> : null}
    </>
  )

  return help.href ? (
    <a className={styles.help} href={help.href} target="_blank" rel="noopener noreferrer">
      {content}
      <span className={styles.srOnly}> (opens WhatsApp in a new tab)</span>
    </a>
  ) : (
    <p className={styles.help}>{content}</p>
  )
}
