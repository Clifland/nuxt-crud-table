/**
 * Safely resolves a nested property from an object via a dot-notation path.
 *
 * @remarks
 * Shared by `useNctAggregates` (row-level aggregate arg resolution) and
 * `useNctTableFormat` (table cell value resolution) — previously implemented
 * verbatim, independently, in both composables.
 *
 * @example
 * ```ts
 * resolveDotPath({ author: { meta: { name: 'Alice' } } }, 'author.meta.name') // 'Alice'
 * ```
 *
 * @param obj - The source object.
 * @param path - Dot-separated property path (e.g. 'product.price').
 * @returns The resolved value, or `undefined` if any segment is missing.
 *
 * @internal
 */
export function resolveDotPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
    return undefined
  }, obj)
}