import type { ReactNode } from 'react'

export type InfoIconName = 'details' | 'size' | 'returns' | 'shipping' | 'generic'

const SHAPES: Record<InfoIconName, ReactNode> = {
  details: (
    <>
      <rect x="4" y="2.5" width="12" height="15" rx="1.5" />
      <path d="M7 7h6M7 10h6M7 13h4" />
    </>
  ),
  size: (
    <>
      <rect x="1.5" y="6.5" width="17" height="7" rx="1" />
      <path d="M5 6.5v3M8 6.5v2M11 6.5v3M14 6.5v2" />
    </>
  ),
  returns: (
    <>
      <path d="M4 10a6 6 0 1 0 2-4.5" />
      <path d="M4 3.5v3h3" />
    </>
  ),
  shipping: (
    <>
      <path d="M1.5 5h10v8h-10zM11.5 8h4l3 3v2h-7" />
      <circle cx="5" cy="14.5" r="1.7" />
      <circle cx="14.5" cy="14.5" r="1.7" />
    </>
  ),
  generic: (
    <>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 9v5M10 6.5v.01" />
    </>
  ),
}

/** Small decorative line icons for the info buttons (the button label carries the meaning). */
export function InfoIcon({ name }: { name: InfoIconName }) {
  return (
    <svg
      viewBox="0 0 20 20"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {SHAPES[name]}
    </svg>
  )
}
