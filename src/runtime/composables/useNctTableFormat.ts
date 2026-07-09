/**
 * Regular expression pattern to detect ISO 8601 extended format date-time strings.
 * @type {RegExp}
 */
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/

/**
 * A utility composable providing core logic for flattening complex nested object rows,
 * resolving deeply nested dot-notation object paths, auto-detecting array or foreign key relations,
 * and formatting cell values for rendering inside the main data table view.
 * @example
 * ```ts
 * const { flattenKeys, getColumnValue, formatCellValue } = useNctTableFormat()
 * const row = { id: 1, user: { profile: { firstName: 'John' } } }
 * const columns = flattenKeys(row) // ['id', 'user.profile.firstName']
 * const value = getColumnValue(row, 'user.profile.firstName') // 'John'
 * ```
 * @returns An object containing table formatting, row flattening, and relationship detection helpers.
 */
export function useNctTableFormat() {
  /**
   * Evaluates a dynamic field value and transforms it into a localized readable string if an ISO date signature is detected.
   * @param {unknown} value - The cell primitive or variable data to evaluate.
   * @returns {unknown} The formatted string if an ISO date format is matched; otherwise, the original value.
   */
  function formatCellValue(value: unknown): unknown {
    if (typeof value === 'string' && ISO_DATE_REGEX.test(value)) {
      return new Date(value).toLocaleString()
    }
    return value
  }

  /**
   * Safe data resolution utility to extract a nested property from an object map via a dot-notation path.
   * @example
   * ```ts
   * getColumnValue({ author: { meta: { name: 'Alice' } } }, 'author.meta.name') // Returns: 'Alice'
   * ```
   * @param {Record<string, unknown>} row - The database data record object.
   * @param {string} path - The dot-separated property access path (e.g., 'profile.address.city').
   * @returns {unknown} The resolved property value, or `undefined` if any reference segment fails to resolve.
   */
  function getColumnValue(row: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((acc, key) => {
      if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
      return undefined
    }, row)
  }

  /**
   * Recursively traverses a structural object row to generate flat, dot-notated path string keys for columns.
   * @note Skips structural arrays entirely, as they are designated for expansion into modular child tables.
   * @param {Record<string, unknown>} row - The target object record structure to inspect.
   * @param {string} [prefix] - Internal recursive accumulator tracking parent key nesting depths.
   * @returns {string[]} An array containing individual flattening string accessors (e.g., `['user.id', 'user.email']`).
   */
  function flattenKeys(row: Record<string, unknown>, prefix = ''): string[] {
    return Object.entries(row).flatMap(([key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key
      if (Array.isArray(value)) return [] // arrays handled separately as expandable child tables
      if (value && typeof value === 'object') return flattenKeys(value as Record<string, unknown>, path)
      return [path]
    })
  }

  /**
   * Scans a data row to pinpoint properties consisting of non-empty arrays containing relational objects.
   * @remarks
   * Used by the engine UI layer to selectively render layout expansion toggles for child resource tables.
   * @param {Record<string, unknown>} row - The database table row representation.
   * @returns {string[]} An array of object keys corresponding to qualifying structural array payloads.
   */
  function getArrayColumns(row: Record<string, unknown>): string[] {
    return Object.entries(row)
      .filter(([, value]) => Array.isArray(value) && value.length > 0 && typeof value[0] === 'object')
      .map(([key]) => key)
  }

  /**
   * Identifies foreign key columns by matching properties ending with `_id` against paired side-loaded relation objects.
   * @example
   * ```ts
   * // If row contains { customer_id: 5, customer: { name: 'Acme Corp' } }
   * getForeignKeyColumns(row) // Returns: ['customer_id']
   * ```
   * @param {Record<string, unknown>} row - The single domain row item.
   * @returns {string[]} A list of column names that are confirmed to act as structural foreign key values.
   */
  function getForeignKeyColumns(row: Record<string, unknown>): string[] {
    return Object.keys(row).filter((key) => {
      if (!key.endsWith('_id')) return false
      const relationKey = key.slice(0, -3) // 'customer_id' -> 'customer'
      return relationKey in row && typeof row[relationKey] === 'object' && row[relationKey] !== null
    })
  }

  /**
   * Searches a child object record to extract keys that act as backward reference indicators to its parent record instance.
   * @remarks
   * Helps filter out redundant operational foreign key bindings from rendering when browsing an embedded sub-table.
   * @param {Record<string, unknown>} childRow - The sub-table row entry metadata to evaluate.
   * @param {Record<string, unknown>} parentRow - The active parent table row instance serving as context root.
   * @returns {string[]} An array of field strings that mirror parent unique identity parameters.
   */
  function getParentBackReferenceColumns(
    childRow: Record<string, unknown>,
    parentRow: Record<string, unknown>,
  ): string[] {
    return Object.keys(childRow).filter(key =>
      key.endsWith('_id') && childRow[key] === parentRow.id,
    )
  }

  return { formatCellValue, getColumnValue, flattenKeys, getArrayColumns, getForeignKeyColumns, getParentBackReferenceColumns }
}
