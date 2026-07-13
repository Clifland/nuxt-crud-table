import type { NctFieldVisibility } from '../../shared/types/config'

/**
 * Normalizes a field name to snake_case for case-convention-agnostic comparison.
 * @param str - The field name to normalize.
 * @returns The snake_case form.
 * @internal
 */
function toSnakeCase(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()
}

/**
 * Checks whether a field name appears in a hidden-field list, comparing
 * case-convention-agnostically (both sides normalized to snake_case).
 * @example
 * ```ts
 * isFieldHidden('createdAt', ['created_at']) // true
 * isFieldHidden('created_at', ['createdAt']) // true
 * ```
 * @param fieldName - The field name to test.
 * @param hiddenList - The resolved list of hidden field names.
 * @returns True if the field should be considered hidden.
 */
export function isFieldHidden(fieldName: string, hiddenList: string[]): boolean {
  const target = toSnakeCase(fieldName)
  return hiddenList.some(hidden => toSnakeCase(hidden) === target)
}

/**
 * Resolves a {@link NctFieldVisibility} rule (either a bare array, or a
 * `{ default, resources }` object) into a concrete flat list of hidden field
 * names for a given resource.
 * @remarks
 * - A bare array is used as-is, with no per-resource variation.
 * - An object's own `default` (if provided) *replaces* `fallbackDefault`
 * entirely rather than merging with it — set `default` explicitly if you
 * want to keep nct's built-in defaults alongside your own additions.
 * - `resources[resource]` entries are always appended on top of whichever
 * default list applies.
 * @example
 * ```ts
 * resolveHiddenFields(
 * { default: ['id'], resources: { products: ['cost_price'] } },
 * 'products',
 * ) // ['id', 'cost_price']
 * ```
 * @param rule - The config value from `app.config.ts`'s `crud.tableHiddenFields`/`formHiddenFields`.
 * @param resource - The current resource name, used to look up `resources[resource]`.
 * @param fallbackDefault - The built-in default (e.g. `NCT_FORM_HIDDEN_FIELDS`) used when `rule` is unset or provides no `default` of its own.
 * @returns The resolved, flat list of field names to hide.
 */
export function resolveHiddenFields(
  rule: NctFieldVisibility | undefined,
  resource: string,
  fallbackDefault: string[] = [],
): string[] {
  if (!rule) return fallbackDefault
  if (Array.isArray(rule)) return rule

  const base = rule.default ?? fallbackDefault
  const resourceSpecific = rule.resources?.[resource] ?? []
  return [...base, ...resourceSpecific]
}
