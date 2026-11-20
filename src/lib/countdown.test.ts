import { describe, expect, it } from 'vitest'

import { getCountdown, padCountdownUnit } from './countdown'

const endsAt = '2026-01-10T12:00:00.000Z'
const at = (iso: string) => new Date(iso)

describe('getCountdown', () => {
  it('splits the time left before endsAt into hours, minutes and seconds', () => {
    const result = getCountdown({
      now: at('2026-01-10T03:19:01.000Z'),
      endsAt,
      restartDaily: false,
    })

    expect(result).toEqual({
      totalSeconds: 8 * 3600 + 40 * 60 + 59,
      hours: 8,
      minutes: 40,
      seconds: 59,
      expired: false,
    })
  })

  it('reports hours beyond 23 when endsAt is more than a day away', () => {
    const result = getCountdown({
      now: at('2026-01-07T12:00:00.000Z'),
      endsAt,
      restartDaily: true,
    })

    expect(result).toMatchObject({ hours: 72, minutes: 0, seconds: 0, expired: false })
  })

  it('accepts timestamps and Date objects as well as ISO strings', () => {
    const now = at('2026-01-10T11:59:30.000Z')
    const expected = { hours: 0, minutes: 0, seconds: 30 }

    expect(
      getCountdown({ now: now.getTime(), endsAt: new Date(endsAt), restartDaily: false }),
    ).toMatchObject(expected)
    expect(getCountdown({ now, endsAt: Date.parse(endsAt), restartDaily: false })).toMatchObject(
      expected,
    )
  })

  it('rounds partial seconds up so zero only shows once time has run out', () => {
    const result = getCountdown({
      now: at('2026-01-10T11:59:59.400Z'),
      endsAt,
      restartDaily: false,
    })

    expect(result).toMatchObject({ totalSeconds: 1, seconds: 1, expired: false })
  })

  describe('after endsAt without restartDaily', () => {
    it('returns zeros and marks the countdown expired', () => {
      const result = getCountdown({
        now: at('2026-01-10T12:00:01.000Z'),
        endsAt,
        restartDaily: false,
      })

      expect(result).toEqual({ totalSeconds: 0, hours: 0, minutes: 0, seconds: 0, expired: true })
    })

    it('is expired at the exact moment endsAt is reached', () => {
      const result = getCountdown({ now: at(endsAt), endsAt, restartDaily: false })

      expect(result.expired).toBe(true)
      expect(result.totalSeconds).toBe(0)
    })
  })

  describe('after endsAt with restartDaily', () => {
    it('continues in a 24-hour cycle started at endsAt', () => {
      const result = getCountdown({
        now: at('2026-01-10T14:30:15.000Z'),
        endsAt,
        restartDaily: true,
      })

      // 2h30m15s into the first cycle -> 21h29m45s left.
      expect(result).toEqual({
        totalSeconds: 21 * 3600 + 29 * 60 + 45,
        hours: 21,
        minutes: 29,
        seconds: 45,
        expired: false,
      })
    })

    it('stays anchored on endsAt across many days, not on midnight', () => {
      const result = getCountdown({
        now: at('2026-01-14T18:00:00.000Z'),
        endsAt,
        restartDaily: true,
      })

      // 4 days and 6 hours after endsAt -> 18 hours left in the current cycle.
      expect(result).toMatchObject({ hours: 18, minutes: 0, seconds: 0, expired: false })
    })

    it('shows a full 24:00:00 at the instant a new cycle begins', () => {
      const atEnd = getCountdown({ now: at(endsAt), endsAt, restartDaily: true })
      const nextCycle = getCountdown({
        now: at('2026-01-11T12:00:00.000Z'),
        endsAt,
        restartDaily: true,
      })

      expect(atEnd).toMatchObject({ totalSeconds: 86400, hours: 24, minutes: 0, seconds: 0 })
      expect(nextCycle).toMatchObject({ totalSeconds: 86400, hours: 24, minutes: 0, seconds: 0 })
    })

    it('shows one second left just before the cycle rolls over', () => {
      const result = getCountdown({
        now: at('2026-01-11T11:59:59.000Z'),
        endsAt,
        restartDaily: true,
      })

      expect(result).toMatchObject({ totalSeconds: 1, hours: 0, minutes: 0, seconds: 1 })
    })
  })

  it('returns zeros for an invalid date instead of NaN', () => {
    expect(
      getCountdown({ now: at('2026-01-10T00:00:00.000Z'), endsAt: 'nope', restartDaily: true }),
    ).toEqual({
      totalSeconds: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      expired: true,
    })
  })
})

describe('padCountdownUnit', () => {
  it('pads single digits to two characters', () => {
    expect(padCountdownUnit(0)).toBe('00')
    expect(padCountdownUnit(8)).toBe('08')
  })

  it('leaves two-digit and larger values untouched', () => {
    expect(padCountdownUnit(59)).toBe('59')
    expect(padCountdownUnit(120)).toBe('120')
  })
})
