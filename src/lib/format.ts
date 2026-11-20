/** Formats an amount the way the storefront shows it, e.g. `Rs.3,190.00`. */
export function formatPrice(amount: number): string {
  return `Rs.${amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
