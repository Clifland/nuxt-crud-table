import { computed, isRef, type Ref } from 'vue'

type Row = Record<string, unknown>

// resolves "product.price" against a row, using the same
// dot-path logic your table already uses for flattened keys
function resolvePath(row: Row, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Row)[key]
    return undefined
  }, row)
}

const rowFns: Record<string, (...vals: number[]) => number> = {
  multiply: (...v) => v.reduce((a, b) => a * b, 1),
  add: (...v) => v.reduce((a, b) => a + b, 0),
  subtract: (...v) => v.reduce((a, b) => a - b),
  divide: (...v) => v.reduce((a, b) => a / b),
}

const reduceFns: Record<string, (values: number[]) => number> = {
  sum: values => values.reduce((a, b) => a + b, 0),
  avg: values => (values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)) : 0),
  min: values => (values.length ? Math.min(...values) : 0),
  max: values => (values.length ? Math.max(...values) : 0),
  count: values => values.length,
}

export function useNctAggregates(targetArray: Row[] | Ref<Row[]>) {
  const dataRef = computed(() => (isRef(targetArray) ? targetArray.value : targetArray))

  // 1) compute virtual columns and return rows augmented with them
  function withVirtualColumns(virtualColumns: { name: string, fn: string, args: string[] }[]) {
    return computed(() =>
      dataRef.value.map((row) => {
        const computedFields: Row = {}
        for (const vc of virtualColumns) {
          const fn = rowFns[vc.fn]
          if (!fn) continue
          const values = vc.args.map(path => Number(resolvePath(row, path) ?? 0))
          computedFields[vc.name] = fn(...values)
        }
        return { ...row, ...computedFields }
      }),
    )
  }

  // 2) reduce a column (real or virtual) across all rows
  function aggregateColumn(rows: Row[], column: string, fn: string) {
    const reducer = reduceFns[fn]
    if (!reducer) return null
    const values = rows.map(r => Number(resolvePath(r, column) ?? 0))
    return reducer(values)
  }

  return { withVirtualColumns, aggregateColumn }
}