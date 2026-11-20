'use server'

import { ValidationError } from 'payload'

import { getPayloadClient } from '@/lib/payload'

import { normalizeEmail } from './email'
import type { NewsletterState } from './types'

const SUCCESS_MESSAGE = 'Thanks for subscribing!'

/**
 * A ValidationError on `email` can only mean the unique index tripped (format is pre-checked with
 * Payload's own pattern), i.e. the address is already on the list.
 */
function isDuplicateEmailError(error: unknown): boolean {
  return error instanceof ValidationError && error.data.errors.some((item) => item.path === 'email')
}

/**
 * Newsletter sign-up. Public by design: it validates the address, stores it through the Local API
 * with access rules enforced (anonymous visitors may only create), and reports an address that is
 * already subscribed as success so the form cannot be used to probe who is on the list.
 */
export async function subscribeToNewsletter(
  _previous: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  // Honeypot: real visitors never see or fill this field. Pretend it worked so bots move on.
  const honeypot = formData.get('company')
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    return { status: 'success', message: SUCCESS_MESSAGE }
  }

  const submitted = formData.get('email')
  const email = normalizeEmail(submitted)

  if (!email) {
    return {
      status: 'error',
      message: 'Please enter a valid email address.',
      email: typeof submitted === 'string' ? submitted : '',
    }
  }

  const payload = await getPayloadClient()

  try {
    await payload.create({ collection: 'subscribers', data: { email }, overrideAccess: false })
  } catch (error) {
    if (isDuplicateEmailError(error)) return { status: 'success', message: SUCCESS_MESSAGE }

    payload.logger.error({ err: error, msg: 'Newsletter sign-up failed' })

    return { status: 'error', message: 'Something went wrong. Please try again.', email }
  }

  return { status: 'success', message: SUCCESS_MESSAGE }
}
