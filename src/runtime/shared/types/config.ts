/**
 * The global layout configuration architecture driving data table, visibility, and export policies.
 */
export interface NctCrudTableConfig {
  /** A collection of field database names that will be globally hidden across all tables. */
  globalHide?: string[]
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
}