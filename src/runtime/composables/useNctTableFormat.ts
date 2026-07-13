/**
 * Regular expression pattern to detect ISO 8601 extended format date-time strings.
 * @type RegExp
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
   * @remarks
   * The regex only checks digit-shape, not calendar validity — a string can match the pattern
   * (e.g. `'9999-99-99T99:99:99Z'`) without being a real date. Guards against `new Date(...)`
   * producing an `Invalid Date` by falling back to the original raw value in that case, rather
   * than silently rendering the literal text `"Invalid Date"` in a table cell.
   * @param value - The cell primitive or variable data to evaluate.
   * @returns The formatted string if an ISO date format is matched and calendar-valid; otherwise, the original value.
   */
  function formatCellValue(value: unknown): unknown {
    if (typeof value === 'string' && ISO_DATE_REGEX.test(value)) {
      const date = new Date(value)
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleString()
      }
    }
    return value
  }

  /**
   * Safe data resolution utility to extract a nested property from an object map via a dot-notation path.
   * @example
   * ```ts
   * getColumnValue({ author: { meta: { name: 'Alice' } } }, 'author.meta.name') // Returns: 'Alice'
   * ```
   * @param row - The database data record object.
   * @param path - The dot-separated property access path (e.g., 'profile.address.city').
   * @returns The resolved property value, or `undefined` if any reference segment fails to resolve.
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
   * @param row - The target object record structure to inspect.
   * @param prefix - Internal recursive accumulator tracking parent key nesting depths.
   * @returns An array containing individual flattening string accessors (e.g., `['user.id', 'user.email']`).
   */
  function flattenKeys(row: Record<string, unknown>, prefix = ''): string[] {
    return Object.entries(row).flatMap(([key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key
      if (prefix && key === 'id') return [] // skip nested relation ids (e.g. product.id) - redundant with the FK column itself
      if (Array.isArray(value)) return [] // arrays handled separately as expandable child tables
      if (value && typeof value === 'object') return flattenKeys(value as Record<string, unknown>, path)
      return [path]
    })
  }

  /**
   * Scans a data row to pinpoint properties consisting of non-empty arrays containing relational objects.
   * @remarks
   * Used by the engine UI layer to selectively render layout expansion toggles for child resource tables.
   * @param row - The database table row representation.
   * @returns An array of object keys corresponding to qualifying structural array payloads.
   */
  function getArrayColumns(row: Record<string, unknown>): string[] {
    return Object.entries(row)
      .filter(([, value]) => Array.isArray(value) && value.length > 0 && typeof value[0] === 'object')
      .map(([key]) => key)
  }

  /**
   * Identifies foreign key columns by matching properties ending with `_id` (snake_case) or `Id`
   * (camelCase) against paired side-loaded relation objects — mirrors the dual-suffix convention
   * used elsewhere in the module (e.g. `Form.vue`'s relation-field detection).
   * @example
   * ```ts
   * // If row contains { customer_id: 5, customer: { name: 'Acme Corp' } }
   * getForeignKeyColumns(row) // Returns: ['customer_id']
   * // Also detects the camelCase convention:
   * // { customerId: 5, customer: { name: 'Acme Corp' } } -> ['customerId']
   * ```
   * @param row - The single domain row item.
   * @returns A list of column names that are confirmed to act as structural foreign key values.
   */
  function getForeignKeyColumns(row: Record<string, unknown>): string[] {
    return Object.keys(row).filter((key) => {
      let relationKey: string | null = null
      if (key.endsWith('_id')) relationKey = key.slice(0, -3) // 'customer_id' -> 'customer'
      else if (key.endsWith('Id')) relationKey = key.slice(0, -2) // 'customerId' -> 'customer'

      if (!relationKey) return false
      return relationKey in row && typeof row[relationKey] === 'object' && row[relationKey] !== null
    })
  }

  /**
   * Searches a child object record to extract keys that act as backward reference indicators to its parent record instance.
   * @remarks
   * Helps filter out redundant operational foreign key bindings from rendering when browsing an embedded sub-table.
   * Values are compared via `Number()` coercion (matching {@link nctIsOwner}'s convention elsewhere in the module),
   * so a string-typed child FK (`"1"`) still matches a numeric parent id (`1`) — relevant for backends
   * (e.g. some Laravel/JSON serialization paths) that emit IDs as strings.
   * @param childRow - The sub-table row entry metadata to evaluate.
   * @param parentRow - The active parent table row instance serving as context root.
   * @returns An array of field strings that mirror parent unique identity parameters.
   */
  function getParentBackReferenceColumns(
    childRow: Record<string, unknown>,
    parentRow: Record<string, unknown>,
  ): string[] {
    return Object.keys(childRow).filter(key =>
      key.endsWith('_id') && Number(childRow[key]) === Number(parentRow.id),
    )
  }

  return { formatCellValue, getColumnValue, flattenKeys, getArrayColumns, getForeignKeyColumns, getParentBackReferenceColumns }
}
