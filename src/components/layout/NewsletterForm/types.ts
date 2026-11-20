/** Result of a newsletter sign-up attempt, returned by the server action to the form. */
export type NewsletterState =
  | { status: 'idle'; message: '' }
  | { status: 'success'; message: string }
  /** `email` is echoed back so the field keeps what the visitor typed. */
  | { status: 'error'; message: string; email: string }

export const initialNewsletterState: NewsletterState = { status: 'idle', message: '' }
