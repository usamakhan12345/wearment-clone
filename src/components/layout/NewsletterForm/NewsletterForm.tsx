'use client'

import { useActionState, useId } from 'react'

import { ArrowRightIcon } from '../shared/icons'
import { subscribeToNewsletter } from './actions'
import styles from './NewsletterForm.module.scss'
import { initialNewsletterState } from './types'

type NewsletterFormProps = {
  placeholder?: string | null
}

const DEFAULT_PLACEHOLDER = 'Your Email'

export function NewsletterForm({ placeholder }: NewsletterFormProps) {
  const [state, formAction, pending] = useActionState(subscribeToNewsletter, initialNewsletterState)
  const inputId = useId()
  const messageId = useId()

  const hasError = state.status === 'error'

  return (
    <form action={formAction} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor={inputId} className={styles.label}>
          Email address
        </label>
        <input
          id={inputId}
          className={styles.input}
          type="email"
          name="email"
          required
          maxLength={254}
          autoComplete="email"
          placeholder={placeholder || DEFAULT_PLACEHOLDER}
          // React resets the form after every action; keep what was typed when it was rejected.
          defaultValue={hasError ? state.email : ''}
          aria-invalid={hasError}
          aria-describedby={messageId}
        />
        <button type="submit" className={styles.submit} disabled={pending} aria-label="Subscribe">
          <ArrowRightIcon className={styles.submitIcon} />
        </button>
      </div>

      {/* Honeypot for bots: hidden from people and assistive tech, skipped by the tab order. */}
      <div className={styles.trap} aria-hidden="true">
        <label>
          Company
          <input type="text" name="company" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <p
        id={messageId}
        role="status"
        className={`${styles.message} ${hasError ? styles.error : styles.success}`}
      >
        {state.message}
      </p>
    </form>
  )
}
