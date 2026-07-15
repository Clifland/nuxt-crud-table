/**
 * Resolves a human-readable label for a relation row, without any network
 * fetch — used wherever the full related row is already in memory (e.g.
 * ChildTable.vue's `parentRow`) and a label is needed purely for display.
 *
 * @remarks
 * Mirrors NameList.vue's own option-label resolution (previously inlined
 * there as `resolveOptionLabel`), now centralized so both call sites stay
 * in sync. Prefers `labelField` (a related resource's own configured
 * label column) when supplied and non-empty; falls back to the
 * `name`/`title`/`num`/`#id` convention otherwise.
 *
 * @example
 * ```ts
 * resolveRelationLabel({ id: 5, num: 'ORD-5' }) // 'ORD-5'
 * resolveRelationLabel({ id: 5 }, 'sku')         // '#5' (sku absent, falls through)
 * ```
 *
 * @param row - The related resource's row data.
 * @param labelField - The related resource's configured `labelField`, if known.
 * @returns A non-empty display label.
 */
export function resolveRelationLabel(row: Record<string, unknown>, labelField?: string): string {
  if (labelField) {
    const value = row[labelField]
    if (value !== undefined && value !== null && value !== '') return String(value)
  }
  const r = row as { id: string | number, name?: string, title?: string, num?: string }
  return String(r.name || r.title || r.num || `#${r.id}`)
}