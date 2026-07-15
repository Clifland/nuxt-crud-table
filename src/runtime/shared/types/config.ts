/**
 * A field-visibility rule for `crud.tableHiddenFields`/`crud.formHiddenFields`.
 *
 * @remarks
 * Either a bare array (applied to every resource, no overrides), or an object
 * with an optional `default` list (replacing nct's built-in default if given)
 * plus optional per-resource `resources` additions. Resolve with
 * {@link resolveHiddenFields}; match individual field names with {@link isFieldHidden}.
 *
 * @example
 * ```ts
 * // Same list everywhere:
 * tableHiddenFields: ['updated_at', 'deleted_at']
 *
 * // Global default + a per-resource addition:
 * formHiddenFields: {
 * default: ['id', 'created_at'],
 * resources: { products: ['cost_price'] },
 * }
 * ```
 */
export type NctFieldVisibility = string[] | {
  /** Replaces nct's built-in default list entirely, if provided. */
  default?: string[]
  /** Per-resource additions, appended on top of whichever default list applies. */
  resources?: Record<string, string[]>
}

/**
 * Defines a singular database or presentation aggregate summary calculation template.
 */
export interface NctAggregateDef {
  /** The unique key code or target attribute identifier for the aggregate function. */
  name: string
  /** An optional reader-friendly presentation header label text string. */
  label?: string
  /** The raw calculation function expression identifier (e.g., 'sum', 'avg', 'count'). */
  fn: string
  /** Arguments, column components, or operational properties passed into the aggregate execution pipeline. */
  args: string[]
  /**
   * Dictates whether this aggregate calculation should be explicitly rendered inside parent reference grids.
   * Only meaningful on `footer` entries.
   *
   * @defaultValue true
   */
  showInParent?: boolean
}

/**
 * Resource-specific aggregation architecture defining calculations for analytical summary matrix data blocks.
 */
export interface NctResourceAggregateConfig {
  /** Collections of calculations bound directly to presentation grid columns. */
  columns?: NctAggregateDef[]
  /** Calculations anchored to the layout footer matrix segments of the rendering engine. */
  footer?: NctAggregateDef[]
  /**
   * Visibility access policies regulating parent layout visibility parameters for aggregate footer contexts.
   *
   * - `true`: Renders all footer aggregates universally.
   * - `false`: Suppresses all data accumulation rows from parent frames.
   * - `string[]`: Narrows insertion exclusively to these specified aggregate tracking names.
   *
   * @defaultValue true
   */
  footerInParent?: boolean | string[]
}

/**
 * Global map collection matching active application resource handles to specialized aggregate evaluation structures.
 */
export type NctAggregatesConfig = Record<string, NctResourceAggregateConfig>

/**
 * The global layout configuration architecture driving data table, visibility, and export policies.
 */
export interface NctCrudTableConfig {
  /**
   * Fields universally hidden from the main datagrid data table presentation views.
   *
   * @defaultValue NCT_TABLE_HIDDEN_FIELDS
   */
  tableHiddenFields?: NctFieldVisibility
  /**
   * Fields universally suppressed from generating fields inside interactive create/edit forms.
   *
   * @defaultValue NCT_FORM_HIDDEN_FIELDS
   */
  formHiddenFields?: NctFieldVisibility

  /**
   * Fields universally read-only inside interactive edit forms.
   *
   * @defaultValue NCT_FORM_READONLY_FIELDS
   */
  formReadOnlyFields?: NctFieldVisibility
  
  /**
   * If set to true, columns ending with `_id` that map to structural relationships are automatically omitted from rendering.
   * @defaultValue false
   */
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
  /** Global database layout configuration policies defining analytical properties mapping active resources to summary definitions. */
  aggregates?: Record<string, NctResourceAggregateConfig>
  /**
   * Maps a child resource's plural API name to a custom print template component,
   * used by `NctCrudChildTable`'s "Print" button.
   *
   * @remarks
   * The value must be the exact Nuxt-global component name the template resolves
   * to (e.g. a file at `components/InvoiceTemplate.vue` registers as `InvoiceTemplate`
   * — watch for Nuxt's folder-based name prefixing if you nest it, e.g.
   * `components/print/Invoice.vue` would register as `PrintInvoice`, not `Invoice`).
   * The component receives the fixed {@link NctPrintTemplateProps} contract.
   *
   * A child resource with no entry here still gets a working "Print" button —
   * it just prints the raw column/row data with no header or footer branding,
   * rather than being disabled.
   *
   * @example
   * ```ts
   * printTemplates: {
   *   orderitems: 'InvoiceTemplate',
   * }
   * ```
   */
  printTemplates?: Record<string, string>
}
