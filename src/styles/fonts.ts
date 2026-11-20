import { Jost, Poppins } from 'next/font/google'

/**
 * Self-hosted by next/font at build time. Each font publishes its family through a CSS variable
 * that the design tokens in `base/_root.scss` consume (`--font-sans`, `--font-heading`).
 */

/** Body copy. */
export const bodyFont = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-sans-loaded',
})

/** Headings and display text; a free stand-in for the Futura-style face of the original store. */
export const headingFont = Jost({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
  variable: '--font-heading-loaded',
})

/** Class names for `<html>` that define both font variables. */
export const fontVariables = `${bodyFont.variable} ${headingFont.variable}`
