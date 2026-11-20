import { RichText as PayloadRichText } from '@payloadcms/richtext-lexical/react'
import type { ComponentProps } from 'react'

import { cx } from '@/lib/cx'

import styles from './RichText.module.scss'

type RichTextProps = {
  data: ComponentProps<typeof PayloadRichText>['data'] | null | undefined
  className?: string
}

/** Renders Lexical rich-text content from Payload with the site's typography styles. */
export function RichText({ data, className }: RichTextProps) {
  if (!data) return null

  return <PayloadRichText data={data} className={cx(styles.richText, className)} />
}
