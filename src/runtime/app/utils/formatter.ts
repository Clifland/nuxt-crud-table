/**
 * Transforms a database column name or object key into a human-readable display label.
 * Strips relational ID suffixes, breaks casing boundaries, and capitalizes the result.
 *
 * @example
 * ```ts
 * nctDbFieldToLabel('user_profile_id') // Returns: "User Profile"
 * nctDbFieldToLabel('createdAt')       // Returns: "Created At"
 * ```
 *
 * @param str - The raw database field name or object key to format.
 * @returns The formatted, reader-friendly label string.
 *
 * @internal
 */
export const nctDbFieldToLabel = (str: string): string => {
  return String(str)
    .replace(/(_id|Id)$/, '') // Strip ID suffixes
    .replace(/[_-]/g, ' ') // Convert underscores/hyphens to spaces
    .replace(/([A-Z])/g, ' $1') // Split CamelCase
    .replace(/\s+/g, ' ') // Collapse double spaces
    .trim()
    .replace(/^./, s => s.toUpperCase()) // Capitalize first letter
}
