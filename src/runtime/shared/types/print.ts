import type { NctSchemaDefinition } from './schema'

/**
 * The fixed prop contract passed to a custom child-table print template,
 * consumed via `NctCrudTable`'s `#print-template` slot.
 *
 * @remarks
 * A host app maps this slot's `resource` (the child resource's plural API
 * name) to its own template component — typically via a `Record<string,
 * Component>` lookup at the page level, e.g.:
 *
 * ```vue
 * <NctCrudTable :resource="resource">
 *   <template #print-template="slotProps">
 *     <component :is="templateMap[slotProps.resource!]" v-bind="slotProps" />
 *   </template>
 * </NctCrudTable>
 * ```
 *
 * A child resource with no matching entry in the host's own map still gets
 * a working default print table from nct — this contract only matters for
 * resources the host chooses to customize.
 *
 * `columns` may contain dot-notated keys for side-loaded relation data (e.g.
 * `product.name`) — always resolve cell values with `useNctTableFormat()`'s
 * `getColumnValue`/`formatCellValue` rather than a plain `row[col.key]`
 * index, which silently returns `undefined` for anything beyond top-level
 * fields.
 */
export interface NctPrintTemplateProps {
  /**
   * The child resource's plural API name (e.g. `'orderitems'`). Used by the
   * host's `templateMap` to select which component renders this slot.
   */
  resource?: string
  /** The child resource's own schema, if it was resolved for this section. */
  schema?: NctSchemaDefinition
  /** Visible columns, already resolved — dot-paths and all. */
  columns: { key: string, label: string }[]
  /** The child rows to print, including any virtual/aggregate columns from `crud.aggregates`. */
  rows: Record<string, unknown>[]
  /**
   * Footer aggregate cells, keyed by column key. Each column can carry
   * multiple stacked values (e.g. more than one footer def targeting the
   * same column). `undefined` if no footer is configured for this resource.
   */
  footer?: Map<string, { label: string, value: number }[]>
  /** The parent resource's plural API name (e.g. `'orders'`), if this is a child-table print. */
  parentResource?: string
  /**
   * The full parent row record — not just its id — so a template can show
   * parent-level context (e.g. an invoice showing the order number and
   * customer alongside its line items).
   */
  parentRow?: Record<string, unknown>
}

export {}
