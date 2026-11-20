export type ResolvedHref = {
  href: string
  /** `true` for absolute URLs (other sites, `mailto:`, `tel:`); `false` for in-app paths. */
  external: boolean
}

const EXTERNAL_PATTERN = /^(https?:\/\/|mailto:|tel:)/i

/**
 * Validates a CMS-authored link. CMS links are free text (site paths or full URLs), so anything
 * that is not an in-app path or an http(s)/mailto/tel URL (e.g. `javascript:`) is rejected with
 * `null`, which callers render as plain, non-clickable content.
 */
export function resolveHref(value: string | null | undefined): ResolvedHref | null {
  const href = value?.trim()

  if (!href) return null
  // `//host/path` is protocol-relative, i.e. another site, so only a single leading slash is internal.
  if (href.startsWith('/') && !href.startsWith('//')) return { href, external: false }
  if (EXTERNAL_PATTERN.test(href)) return { href, external: true }

  return null
}

/** Digits-only phone number for `wa.me` links, or `null` when nothing usable is left. */
export function normalizeWhatsAppNumber(value: string | null | undefined): string | null {
  const digits = value?.replace(/\D/g, '') ?? ''

  return digits.length > 0 ? digits : null
}

/** `https://wa.me/<number>?text=<message>`; the message is optional. */
export function buildWhatsAppUrl(number: string, message?: string | null): string {
  const text = message?.trim()

  return text
    ? `https://wa.me/${number}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${number}`
}
