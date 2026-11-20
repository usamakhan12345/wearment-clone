/** Id of a relationship value, which is a bare id or a populated document depending on `depth`. */
export function relationId(value: string | { id: string }): string {
  return typeof value === 'string' ? value : value.id
}

/** Ids of a (possibly missing) `hasMany` relationship, in the order the editor arranged them. */
export function relationIds(values: (string | { id: string })[] | null | undefined): string[] {
  return (values ?? []).map(relationId)
}
