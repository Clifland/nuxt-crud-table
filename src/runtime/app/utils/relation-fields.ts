/**
 * Canonical suffix convention nct uses to recognize a foreign-key / relation field.
 * Snake-case APIs use `_id` (e.g. `customer_id`), camelCase APIs use `Id` (e.g. `customerId`).
 *
 * @remarks
 * This is the single source of truth for "does this field name represent a relation
 * pointer" and "what's the relation's name". Previously this logic (and its
 * corresponding regex/endsWith checks) was reimplemented independently in
 * `formatter.ts`, `Form.vue` (three separate spots), and `NameList.vue`. Any future
 * third naming convention now only needs to be added here.
 *
 * @internal
 */
const RELATION_SUFFIXES = ['_id', 'Id'] as const

/**
 * Checks whether a field name follows nct's relation-suffix convention (`_id` or `Id`).
 * @example
 * ```ts
 * isRelationFieldName('customer_id') // true
 * isRelationFieldName('customerId')  // true
 * isRelationFieldName('id')          // false
 * ```
 * @param name - The field name to test.
 * @returns True if the field name ends in a recognized relation suffix.
 */
export function isRelationFieldName(name: string): boolean {
  return RELATION_SUFFIXES.some(suffix => name.endsWith(suffix))
}

/**
 * Strips a trailing relation suffix (`_id` or `Id`) from a field name, returning the
 * bare relation name. Names that don't match either suffix are returned unchanged.
 * @example
 * ```ts
 * stripRelationSuffix('customer_id') // 'customer'
 * stripRelationSuffix('customerId')  // 'customer'
 * stripRelationSuffix('name')        // 'name'
 * ```
 * @param name - The field name to strip.
 * @returns The relation name with its suffix removed.
 */
export function stripRelationSuffix(name: string): string {
  const suffix = RELATION_SUFFIXES.find(s => name.endsWith(s))
  return suffix ? name.slice(0, -suffix.length) : name
}
