/** Joins truthy class names; tiny stand-in for the `classnames` package. */
export function cx(...classNames: (string | false | null | undefined)[]): string {
  return classNames.filter(Boolean).join(' ')
}
