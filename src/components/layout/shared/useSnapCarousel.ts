import { useCallback, useRef, useState } from 'react'

import { usePrefersReducedMotion } from './usePrefersReducedMotion'

/**
 * State for a carousel built from a horizontally scrolling, scroll-snapping track whose slides are
 * each exactly as wide as the track. Native scrolling gives touch swipe and keyboard scrolling for
 * free; this hook only tracks which slide is showing and scrolls to a requested one.
 *
 * Attach `trackRef` and `onScroll` to the scroll container.
 */
export function useSnapCarousel(count: number) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const reducedMotion = usePrefersReducedMotion()

  const onScroll = useCallback(() => {
    const track = trackRef.current
    if (!track || track.clientWidth === 0) return

    const current = Math.round(track.scrollLeft / track.clientWidth)
    setIndex(Math.min(count - 1, Math.max(0, current)))
  }, [count])

  const scrollToSlide = useCallback(
    (slide: number, instant: boolean) => {
      const track = trackRef.current
      if (!track) return

      track.scrollTo({
        left: slide * track.clientWidth,
        behavior: instant || reducedMotion ? 'auto' : 'smooth',
      })
    },
    [reducedMotion],
  )

  const goTo = useCallback(
    (slide: number) => {
      if (count > 0) scrollToSlide(Math.min(count - 1, Math.max(0, slide)), false)
    },
    [count, scrollToSlide],
  )

  /** Steps by `delta` slides, wrapping around at the ends (the wrap jumps instead of rewinding). */
  const step = useCallback(
    (delta: number) => {
      if (count === 0) return

      const target = index + delta
      const wrapped = target < 0 || target >= count

      scrollToSlide((target + count) % count, wrapped)
    },
    [count, index, scrollToSlide],
  )

  const next = useCallback(() => step(1), [step])
  const prev = useCallback(() => step(-1), [step])

  return { trackRef, index: Math.min(index, Math.max(0, count - 1)), onScroll, goTo, next, prev }
}
