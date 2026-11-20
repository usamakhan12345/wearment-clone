/** Longest valid email address (RFC 5321). */
export const MAX_EMAIL_LENGTH = 254

/**
 * The same pattern Payload applies to `email` fields. Keeping them identical means that once an
 * address passes here, the only way creating the subscriber can fail validation is the unique
 * constraint, which the newsletter action treats as "already subscribed".
 */
const EMAIL_PATTERN =
  /^(?!.*\.\.)[\w!#$%&'*+/=?^`{|}~-](?:[\w!#$%&'*+/=?^`{|}~.-]*[\w!#$%&'*+/=?^`{|}~-])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i

/**
 * Trims and lower-cases a submitted email so the same address in different cases is stored once.
 * Returns `null` for anything that is not a plausible email address (including non-strings).
 */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const email = value.trim().toLowerCase()

  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH) return null

  return EMAIL_PATTERN.test(email) ? email : null
}
