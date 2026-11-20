import Link from 'next/link'
import type { ComponentPropsWithoutRef } from 'react'

import { resolveHref } from './links'

type SmartLinkProps = Omit<ComponentPropsWithoutRef<'a'>, 'href' | 'target' | 'rel'> & {
  /** Raw CMS link value (site path or full URL). */
  href: string | null | undefined
  /** Open in a new tab with `rel="noopener noreferrer"`. Only honoured for external URLs. */
  newTab?: boolean
}

/**
 * Renders CMS-authored links safely: in-app paths use `next/link`, absolute URLs a plain anchor,
 * and anything invalid or empty falls back to a non-clickable `<span>` so nothing is a dead link.
 */
export function SmartLink({
  href,
  newTab = false,
  children,
  className,
  style,
  ...rest
}: SmartLinkProps) {
  const resolved = resolveHref(href)

  if (!resolved) {
    return (
      <span className={className} style={style}>
        {children}
      </span>
    )
  }

  if (!resolved.external) {
    return (
      <Link href={resolved.href} className={className} style={style} {...rest}>
        {children}
      </Link>
    )
  }

  return (
    <a
      href={resolved.href}
      className={className}
      style={style}
      {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...rest}
    >
      {children}
    </a>
  )
}
