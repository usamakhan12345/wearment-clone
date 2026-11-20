import { useEffect, useRef, useState, type FocusEvent, type PointerEvent } from 'react'

import { usePrefersReducedMotion } from './usePrefersReducedMotion'

type AutoplayOptions = {
  /** Whether there is anything to advance to (e.g. more than one slide, interval above zero). */
  enabled: boolean
  intervalMs: number
  /** Temporarily stops the timer, e.g. while the visitor hovers or focuses the carousel. */
  paused: boolean
  onTick: () => void
}

/**
 * Calls `onTick` every `intervalMs` while enabled and not paused. Autoplay is skipped entirely for
 * visitors who prefer reduced motion; they can still step through manually.
 */
export function useAutoplay({ enabled, intervalMs, paused, onTick }: AutoplayOptions) {
  const reducedMotion = usePrefersReducedMotion()
  const onTickRef = useRef(onTick)

  useEffect(() => {
    onTickRef.current = onTick
  })

  const active = enabled && !paused && !reducedMotion && intervalMs > 0

  useEffect(() => {
    if (!active) return

    const id = window.setInterval(() => onTickRef.current(), intervalMs)

    return () => window.clearInterval(id)
  }, [active, intervalMs])
}

/**
 * Tracks whether a carousel should pause: a mouse is over it, or keyboard focus is inside it.
 * Spread `handlers` onto the carousel's root element. Touch taps and mouse-click focus do not pause,
 * otherwise autoplay would stay stuck after the first tap on a phone.
 */
export function usePauseOnInteraction() {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)

  const handlers = {
    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === 'mouse') setHovered(true)
    },
    onPointerLeave: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === 'mouse') setHovered(false)
    },
    onFocus: (event: FocusEvent<HTMLElement>) => {
      if (event.target.matches(':focus-visible')) setFocused(true)
    },
    onBlur: (event: FocusEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
    },
  }

  return { paused: hovered || focused, handlers }
}
