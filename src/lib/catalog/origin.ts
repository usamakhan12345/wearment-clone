const HOST_PATTERN = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:\d{1,5})?$/i
const LOCAL_HOST_PATTERN = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i

/**
 * Builds `scheme://host` from request headers, for absolute URLs in structured data. The host is
 * validated so a crafted header cannot inject anything into the output. Returns `null` when the
 * host is missing or malformed. Without a forwarded protocol, local hosts use http and everything
 * else https.
 */
export function resolveOrigin(
  host: string | null | undefined,
  protocol: string | null | undefined,
): string | null {
  const cleanHost = host?.split(',')[0]?.trim()
  if (!cleanHost || !HOST_PATTERN.test(cleanHost)) return null

  const forwarded = protocol?.split(',')[0]?.trim().toLowerCase()
  const scheme =
    forwarded === 'http' || forwarded === 'https'
      ? forwarded
      : LOCAL_HOST_PATTERN.test(cleanHost)
        ? 'http'
        : 'https'

  return `${scheme}://${cleanHost}`
}

/** Resolves `path` (or an already-absolute URL) against `origin`; returns `path` when no origin. */
export function toAbsoluteUrl(origin: string | null, path: string): string {
  if (/^https?:\/\//i.test(path) || !origin) return path

  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`
}
