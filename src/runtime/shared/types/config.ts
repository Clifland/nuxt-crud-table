/**
 * The global layout configuration architecture driving data table, visibility, and export policies.
 */

/**
 * A field-visibility rule for `crud.tableHiddenFields`/`crud.formHiddenFields`.
 * @remarks
 * Either a bare array (applied to every resource, no overrides), or an object
 * with an optional `default` list (replacing nct's built-in default if given)
 * plus optional per-resource `resources` additions. Resolve with
 * {@link resolveHiddenFields}; match individual field names with {@link isFieldHidden}.
 * @example
 * ```ts
 * // Same list everywhere:
 * tableHiddenFields: ['updated_at', 'deleted_at']
 *
 * // Global default + a per-resource addition:
 * formHiddenFields: {
 *   default: ['id', 'created_at'],
 *   resources: { products: ['cost_price'] },
 * }
 * ```
 */
export type NctFieldVisibility = string[] | {
  /** Replaces nct's built-in default list entirely, if provided. */
  default?: string[]
  /** Per-resource additions, appended on top of whichever default list applies. */
  resources?: Record<string, string[]>
}

export interface NctAggregateDef {
  name: string
  label?: string
  fn: string
  args: string[]
  showInParent?: boolean // default true; only meaningful on `footer` entries
}

export interface NctResourceAggregateConfig {
  columns?: NctAggregateDef[]
  footer?: NctAggregateDef[]
  footerInParent?: boolean | string[] // default true (all). false = none. string[] = only these footer names.
}

export type NctAggregatesConfig = Record<string, NctResourceAggregateConfig>

export interface NctCrudTableConfig {
  /**
   * Fields hidden from the main data table/list view.
   * @default NCT_TABLE_HIDDEN_FIELDS
   */
  tableHiddenFields?: NctFieldVisibility
  /**
   * Fields hidden from create/edit forms.
   * @default NCT_FORM_HIDDEN_FIELDS
   */
  formHiddenFields?: NctFieldVisibility
  /** If set to true, columns ending with `_id` that map to structural relationships are automatically omitted from rendering. */
  hideForeignKeys?: boolean
  /** Configuration policies detailing structural access parameters for document export engines. */
  exports?: {
    /** Layout policies dictating parameters for Microsoft Excel file compilation formats. */
    excel?: {
      /** Key array identifiers universally stripped out of all Excel workbook pipelines. */
      globalExclude?: string[]
      /** Target resource exclusion overrides (e.g., `{ users: ['password_hash', 'salt'] }`). */
      resourceExclude?: Record<string, string[]>
    }
    /** Layout policies dictating parameters for PDF document generation engines. */
    pdf?: {
      /** Key array identifiers universally stripped out of all PDF rendering vectors. */
      globalExclude?: string[]
      /** Target resource exclusion overrides (e.g., `{ transactions: ['internal_notes'] }`). */
      resourceExclude?: Record<string, string[]>
    }
  }
  aggregates?: Record<string, NctResourceAggregateConfig>
}