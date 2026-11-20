import type { ReactNode } from 'react'

import { cx } from '@/lib/cx'

import styles from './Container.module.scss'

type ContainerProps = {
  as?: 'div' | 'main' | 'section' | 'header' | 'footer'
  className?: string
  children: ReactNode
}

/** Centres content and applies the shared max-width and gutters. */
export function Container({ as: Tag = 'div', className, children }: ContainerProps) {
  return <Tag className={cx(styles.container, className)}>{children}</Tag>
}
