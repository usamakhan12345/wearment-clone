'use client'

import { useEffect, useState } from 'react'

import { getCountdown, padCountdownUnit } from '@/lib/countdown'

import styles from './PromoCountdown.module.scss'

type CountdownTimerProps = {
  /** ISO date string from the CMS. */
  endsAt: string
  restartDaily: boolean
  /**
   * Server request time in milliseconds. Both the server HTML and the first client render use it,
   * so hydration matches; ticking against the visitor's clock starts only after mount.
   */
  initialNow: number
}

const SECOND_MS = 1000

export function CountdownTimer({ endsAt, restartDaily, initialNow }: CountdownTimerProps) {
  const [now, setNow] = useState(initialNow)

  useEffect(() => {
    let timeout: number

    // Re-arm for the next whole second of the wall clock so the display never skips or repeats.
    const tick = () => {
      const current = Date.now()
      setNow(current)
      timeout = window.setTimeout(tick, SECOND_MS - (current % SECOND_MS) + 20)
    }

    timeout = window.setTimeout(tick, 0)

    return () => window.clearTimeout(timeout)
  }, [])

  const { hours, minutes, seconds } = getCountdown({ now, endsAt, restartDaily })

  const units = [
    { label: 'Hours', value: hours },
    { label: 'Minutes', value: minutes },
    { label: 'Seconds', value: seconds },
  ]

  return (
    // role="timer" is silent to screen readers by default, so the per-second updates do not chatter.
    <div className={styles.timer} role="timer" aria-label="Time remaining">
      {units.map(({ label, value }) => (
        <div key={label} className={styles.box}>
          <span className={styles.value}>{padCountdownUnit(value)}</span>
          <span className={styles.unit}>{label}</span>
        </div>
      ))}
    </div>
  )
}
