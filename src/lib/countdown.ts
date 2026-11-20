const SECOND_MS = 1000
const DAY_MS = 24 * 60 * 60 * SECOND_MS

type TimeInput = Date | number | string

export type CountdownInput = {
  /** The current time. Passed in (not read here) so the function stays pure and testable. */
  now: TimeInput
  endsAt: TimeInput
  /** After `endsAt` passes, keep counting down in 24-hour cycles anchored on `endsAt`. */
  restartDaily: boolean
}

export type Countdown = {
  /** Whole seconds left in the current cycle. */
  totalSeconds: number
  /** Total hours left; can exceed 23 when `endsAt` is more than a day away. */
  hours: number
  minutes: number
  seconds: number
  /** `true` only for a non-restarting countdown that has run out. */
  expired: boolean
}

const ZERO: Countdown = { totalSeconds: 0, hours: 0, minutes: 0, seconds: 0, expired: true }

function toMilliseconds(value: TimeInput): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime()
}

/**
 * Time left until `endsAt`, split into hours, minutes and seconds.
 *
 * - Before `endsAt`: the real remaining time.
 * - After `endsAt` with `restartDaily`: the time left in the current 24-hour cycle. Cycles start at
 *   `endsAt` (so a new cycle begins at `endsAt + n days`, showing a full 24:00:00).
 * - After `endsAt` without `restartDaily`, or when a date is invalid: all zeros and `expired`.
 */
export function getCountdown({ now, endsAt, restartDaily }: CountdownInput): Countdown {
  const nowMs = toMilliseconds(now)
  const endMs = toMilliseconds(endsAt)

  if (Number.isNaN(nowMs) || Number.isNaN(endMs)) return ZERO

  const untilEndMs = endMs - nowMs
  let remainingMs: number

  if (untilEndMs > 0) {
    remainingMs = untilEndMs
  } else if (restartDaily) {
    remainingMs = DAY_MS - ((nowMs - endMs) % DAY_MS)
  } else {
    return ZERO
  }

  // Round up so the display only reads 00:00:00 once the time has genuinely run out.
  const totalSeconds = Math.ceil(remainingMs / SECOND_MS)

  return {
    totalSeconds,
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: false,
  }
}

/** Zero-pads a countdown unit to at least two digits, e.g. `8` -> `"08"`. */
export function padCountdownUnit(value: number): string {
  return String(value).padStart(2, '0')
}
