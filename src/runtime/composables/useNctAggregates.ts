import { computed, isRef, type Ref } from 'vue'
import type { NctAggregateDef, NctAggregatesConfig } from '../shared/types/config'

type Row = Record<string, unknown>

/**
 * Safely resolves a nested property from a row via a dot-notation path.
 *
 * @param row - The source row object.
 * @param path - Dot-separated property path (e.g. 'product.price').
 * @returns The resolved value, or `undefined` if any segment is missing.
 */
function resolvePath(row: Row, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Row)[key]
    return undefined
  }, row)
}

/**
 * Row-level operations: combine sibling field values on a single row.
 * Each function receives already-resolved numeric args (see {@link computeColumnDef}).
 */
const rowFns: Record<string, (...vals: number[]) => number> = {
  multiply: (...v) => v.reduce((a, b) => a * b, 1),
  add: (...v) => v.reduce((a, b) => a + b, 0),
  subtract: (...v) => v.reduce((a, b) => a - b),
  divide: (...v) => v.reduce((a, b) => a / b),
}

/**
 * Filters out nullish entries from a value set, narrowing to `number[]`.
 *
 * @remarks
 * Deliberately nullish-only (not falsy-only, unlike `_.compact`) — a real `0` is valid data and must survive this filter.
 *
 * @param values - Values that may include nulls for missing data.
 * @returns Only the present (non-null) numeric values.
 */
function nonNullable(values: (number | null)[]): number[] {
  return values.filter((v): v is number => v !== null)
}

/**
 * Sums a value set, treating missing (null) entries as 0 — matches spreadsheet SUM semantics.
 *
 * @param values - Values that may include nulls for missing data.
 * @returns The sum of all present values.
 */
function sumValues(values: (number | null)[]): number {
  return values.reduce((a: number, b) => a + (b ?? 0), 0)
}

/**
 * Counts how many entries in a value set are present (non-null) — matches spreadsheet COUNT semantics.
 *
 * @param values - Values that may include nulls for missing data.
 * @returns The count of present values.
 */
function countValues(values: (number | null)[]): number {
  return nonNullable(values).length
}

/**
 * Reduce-level operations: aggregate a pooled set of column values across multiple rows.
 *
 * @remarks
 * `min`/`max` must filter nulls before calling `Math.min`/`Math.max` — passing `null`
 * directly would coerce to `0` (JS numeric coercion), fabricating a phantom minimum/maximum.
 */
const reduceFns: Record<string, (values: (number | null)[]) => number> = {
  sum: sumValues,
  count: countValues,
  avg: (values) => {
    const n = countValues(values)
    return n ? Number((sumValues(values) / n).toFixed(2)) : 0
  },
  min: (values) => {
    const present = nonNullable(values)
    return present.length ? Math.min(...present) : 0
  },
  max: (values) => {
    const present = nonNullable(values)
    return present.length ? Math.max(...present) : 0
  },
}

/**
 * Resolves a single column's value (real field or virtual/aggregate column) for one row.
 *
 * @param row - The row to resolve the column against.
 * @param columnName - The column name, matched first against `columnDefs` (virtual), then as a real field path.
 * @param columnDefs - Virtual column defs belonging to this row's own resource.
 * @param config - The full aggregates config, needed to recurse into nested resources.
 * @returns The resolved numeric value, or `null` if the underlying data is missing.
 */
function resolveColumnValue(row: Row, columnName: string, columnDefs: NctAggregateDef[], config: NctAggregatesConfig): number | null {
  const def = columnDefs.find(d => d.name === columnName)
  if (!def) {
    const raw = resolvePath(row, columnName)
    return raw === null || raw === undefined ? null : Number(raw)
  }
  return computeColumnDef(row, def, config)
}

/**
 * Resolves a single row-op argument (a sibling field referenced by a `columns` def) to a number or null.
 *
 * @param row - The row to resolve against.
 * @param arg - The field path to resolve.
 * @returns The numeric value, or `null` if the field is missing.
 */
function resolveArgValue(row: Row, arg: string): number | null {
  const raw = resolvePath(row, arg)
  return raw === null || raw === undefined ? null : Number(raw)
}

/**
 * Warns once per malformed def in development, so a misconfigured aggregate fails loudly
 * (in the console) instead of silently resolving to 0/null with no trace of why.
 *
 * @param context - Short description of which computation triggered the warning.
 * @param def - The offending aggregate definition.
 */
function warnMissingArgs(context: string, def: NctAggregateDef): void {
  if (import.meta.dev) {
    console.warn(`[nct] aggregate def '${def.name}' (fn: '${def.fn}') is missing 'args' — ${context} will resolve to 0/null.`)
  }
}

/**
 * Computes a single `columns` entry for one row.
 *
 * @remarks
 * Two shapes, disambiguated by `fn`:
 * - **Row-op** (`multiply`, `add`, ...): each `arg` is a sibling field on this row.
 * - **Reduce-op rollup** (`sum`, `avg`, ...): each `arg` is a dotted `nestedResource.column` path — resolves into a nested array field on this row and reduces across it.
 *
 * @param row - The row to compute the column for.
 * @param def - The column definition (`name`, `fn`, `args`).
 * @param config - The full aggregates config, needed to resolve nested resource column defs.
 * @returns The computed value, or `null` if any required input is missing.
 */
function computeColumnDef(row: Row, def: NctAggregateDef, config: NctAggregatesConfig): number | null {
  const rowFn = rowFns[def.fn]
  if (rowFn) {
    if (!def.args?.length) {
      warnMissingArgs('this column', def)
      return null
    }
    const argValues = def.args.map(arg => resolveArgValue(row, arg))
    if (argValues.includes(null)) return null // any missing input -> whole result is missing
    return rowFn(...argValues as number[])
  }

  const reduceFn = reduceFns[def.fn]
  if (reduceFn) {
    if (!def.args?.length) {
      warnMissingArgs('this column', def)
      return null
    }
    const pooled = def.args.flatMap((arg) => {
      const [nestedResource, columnName] = arg.split('.')
      if (!nestedResource || !columnName) return []

      const nestedRows = (row[nestedResource] as Row[]) ?? []
      const nestedDefs = config[nestedResource]?.columns ?? []
      return nestedRows.map(item => resolveColumnValue(item, columnName, nestedDefs, config))
    })
    return reduceFn(pooled)
  }

  return null
}

/**
 * Computes a `footer` entry — reduces a named column across all sibling rows of a resource.
 *
 * @param rows - The full row set to reduce over (already augmented with virtual columns).
 * @param def - The footer definition (`name`, `fn`, `args` naming target column(s)).
 * @param columnDefs - Virtual column defs for this resource, so `args` can target virtual columns too.
 * @param config - The full aggregates config.
 * @returns The reduced footer value, or `0` if the def is malformed or its `fn` is unrecognized.
 */
function computeFooterDef(rows: Row[], def: NctAggregateDef, columnDefs: NctAggregateDef[], config: NctAggregatesConfig): number {
  const reducer = reduceFns[def.fn]
  if (!reducer) return 0
  if (!def.args?.length) {
    warnMissingArgs('this footer aggregate', def)
    return 0
  }
  const pooled = def.args.flatMap(columnName => rows.map(row => resolveColumnValue(row, columnName, columnDefs, config)))
  return reducer(pooled)
}

/**
 * Augments each row of `resourceKey` with its configured virtual (`columns`) values.
 *
 * @param rows - The raw rows for this resource.
 * @param resourceKey - The resource key used to look up `config[resourceKey].columns`.
 * @param config - The full aggregates config.
 * @returns Rows spread with additional virtual-column keys.
 */
function computeWithVirtualColumns(rows: Row[], resourceKey: string, config: NctAggregatesConfig): Row[] {
  const defs = config[resourceKey]?.columns ?? []
  return rows.map(row => ({
    ...row,
    ...Object.fromEntries(defs.map(def => [def.name, computeColumnDef(row, def, config)])),
  }))
}

/**
 * Computes all `footer` results for a resource's row set.
 *
 * @param rows - The raw rows for this resource.
 * @param resourceKey - The resource key used to look up `config[resourceKey].footer`.
 * @param config - The full aggregates config.
 * @returns One entry per configured footer def.
 */
function computeFooterValues(rows: Row[], resourceKey: string, config: NctAggregatesConfig) {
  const resourceConfig = config[resourceKey]
  const columnDefs = resourceConfig?.columns ?? []
  const footerDefs = resourceConfig?.footer ?? []
  const withCols = computeWithVirtualColumns(rows, resourceKey, config)
  return footerDefs.map(def => ({
    name: def.name,
    label: def.label ?? def.fn,
    args: def.args ?? [],
    value: computeFooterDef(withCols, def, columnDefs, config),
  }))
}

/**
 * For each row, finds configured child array fields (e.g. `orderitems` on an `orders` row)
 * and injects that child resource's footer aggregate(s) as flat scalar columns on the row —
 * so a child-table total (e.g. `total_amount`) can appear as an ordinary column on the master table.
 *
 * @remarks
 * Governed per child resource by `footerInParent`:
 * - `true` / omitted → every footer def rolls up.
 * - `false` → none roll up.
 * - `string[]` → only the named footer def(s) roll up.
 *
 * @param rows - The master resource's rows (each possibly containing nested child arrays).
 * @param config - The full aggregates config.
 * @returns Rows spread with injected rollup columns, per `footerInParent` rules.
 */
function computeParentFooterColumns(rows: Row[], config: NctAggregatesConfig): Row[] {
  return rows.map((row) => {
    const injected: Row = {}
    for (const [childKey, childConfig] of Object.entries(config)) {
      const childRows = row[childKey]
      if (!Array.isArray(childRows) || !childConfig.footer?.length) continue

      const setting = childConfig.footerInParent ?? true
      if (setting === false) continue
      const allowedNames = Array.isArray(setting) ? new Set(setting) : null

      for (const result of computeFooterValues(childRows as Row[], childKey, config)) {
        if (allowedNames && !allowedNames.has(result.name)) continue
        injected[result.name] = result.value
      }
    }
    return { ...row, ...injected }
  })
}

/**
 * Composable providing dynamic, config-driven aggregate computation for `nct` tables —
 * row-level virtual columns, per-resource footer reductions, and parent-table rollups
 * of a child resource's footer totals.
 *
 * @example
 * ```ts
 * const { withVirtualColumns, footerValues } = useNctAggregates(orderitems, aggregatesConfig)
 * const rowsWithLineTotal = withVirtualColumns('orderitems').value
 * const footer = footerValues('orderitems') // [{ name: 'nettotal', label: 'Net Total', value: 143.5, args: ['linetotal'] }]
 * ```
 *
 * @param targetArray - The row set to operate on; accepts a raw array or a `useFetch`-style ref that may still be `undefined` while loading.
 * @param config - The full `aggregates` config from `app.config.ts`.
 * @returns An object exposing `withVirtualColumns`, `footerValues`, and `withParentFooterColumns`.
 */
export function useNctAggregates(
  targetArray: Row[] | undefined | Ref<Row[] | undefined>,
  config: NctAggregatesConfig,
) {
  const dataRef = computed(() => (isRef(targetArray) ? targetArray.value : targetArray) ?? [])

  /**
   * Computed rows for `resourceKey`, augmented with its configured virtual columns.
   *
   * @param resourceKey - The resource key to look up `columns` defs for.
   */
  function withVirtualColumns(resourceKey: string) {
    return computed(() => computeWithVirtualColumns(dataRef.value, resourceKey, config))
  }

  /**
   * Computes all footer aggregate results for `resourceKey`'s current row set.
   *
   * @param resourceKey - The resource key to look up `footer` defs for.
   */
  function footerValues(resourceKey: string) {
    return computeFooterValues(dataRef.value, resourceKey, config)
  }

  /**
   * Computed rows, each augmented with rolled-up footer totals from any nested child arrays.
   */
  function withParentFooterColumns() {
    return computed(() => computeParentFooterColumns(dataRef.value, config))
  }

  return { withVirtualColumns, footerValues, withParentFooterColumns }
}