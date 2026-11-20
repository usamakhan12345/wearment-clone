import type { Access } from 'payload'

/** Only logged-in admin users. */
export const isAuthenticated: Access = ({ req: { user } }) => Boolean(user)

/**
 * Logged-in users can read everything (including drafts); anonymous visitors only see
 * published documents. Use on collections with `versions.drafts` enabled.
 */
export const isAuthenticatedOrPublished: Access = ({ req: { user } }) => {
  if (user) return true

  return { _status: { equals: 'published' } }
}
