/**
 * Builds a click-to-chat link. The number is reduced to digits (international format without
 * `+`); returns `null` when it is missing or cannot be a phone number so callers render no link.
 */
export function buildWhatsappUrl(
  number: string | null | undefined,
  text?: string | null,
): string | null {
  const digits = (number ?? '').replace(/\D/g, '')
  if (digits.length < 7 || digits.length > 15) return null

  const base = `https://wa.me/${digits}`

  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}
