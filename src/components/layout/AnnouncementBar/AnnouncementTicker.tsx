'use client'

import { useCallback, useState } from 'react'

import { ChevronLeftIcon, ChevronRightIcon } from '../shared/icons'
import { SmartLink } from '../shared/SmartLink'
import { useAutoplay, usePauseOnInteraction } from '../shared/useAutoplay'
import styles from './AnnouncementBar.module.scss'

export type AnnouncementMessage = {
  id: string
  text: string
  /** Raw CMS link value; invalid or empty means the message is plain text. */
  href: string | null
}

type AnnouncementTickerProps = {
  messages: AnnouncementMessage[]
  /** Seconds between messages; 0 turns rotation off. */
  autoplaySeconds: number
}

export function AnnouncementTicker({ messages, autoplaySeconds }: AnnouncementTickerProps) {
  const count = messages.length
  const hasMany = count > 1
  const rotates = hasMany && autoplaySeconds > 0

  const [index, setIndex] = useState(0)
  const { paused, handlers } = usePauseOnInteraction()

  const next = useCallback(() => setIndex((current) => (current + 1) % count), [count])
  const prev = useCallback(() => setIndex((current) => (current - 1 + count) % count), [count])

  useAutoplay({ enabled: rotates, intervalMs: autoplaySeconds * 1000, paused, onTick: next })

  const message = messages[index % count]

  return (
    <section className={styles.bar} aria-label="Announcements" {...handlers}>
      {hasMany ? (
        <button
          type="button"
          className={styles.arrow}
          onClick={prev}
          aria-label="Previous announcement"
        >
          <ChevronLeftIcon className={styles.icon} />
        </button>
      ) : null}

      {/* Announce changes politely only when the visitor triggered them; auto-rotation stays silent. */}
      <div className={styles.message} aria-live={rotates ? 'off' : 'polite'} aria-atomic="true">
        <p key={message.id} className={styles.text}>
          <SmartLink href={message.href} className={styles.link}>
            {message.text}
          </SmartLink>
        </p>
      </div>

      {hasMany ? (
        <button
          type="button"
          className={styles.arrow}
          onClick={next}
          aria-label="Next announcement"
        >
          <ChevronRightIcon className={styles.icon} />
        </button>
      ) : null}
    </section>
  )
}
