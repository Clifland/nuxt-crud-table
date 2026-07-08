const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/

export function useNctTableFormat() {
  function formatCellValue(value: unknown): unknown {
    if (typeof value === 'string' && ISO_DATE_REGEX.test(value)) {
      return new Date(value).toLocaleString()
    }
    return value
  }

  function getColumnValue(row: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((acc, key) => {
      if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
      return undefined
    }, row)
  }

  function flattenKeys(row: Record<string, unknown>, prefix = ''): string[] {
    return Object.entries(row).flatMap(([key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key
      if (Array.isArray(value)) return [] // arrays handled separately as expandable child tables
      if (value && typeof value === 'object') return flattenKeys(value as Record<string, unknown>, path)
      return [path]
    })
  }

  function getArrayColumns(row: Record<string, unknown>): string[] {
    return Object.entries(row)
      .filter(([, value]) => Array.isArray(value) && value.length > 0 && typeof value[0] === 'object')
      .map(([key]) => key)
  }

  function getForeignKeyColumns(row: Record<string, unknown>): string[] {
    return Object.keys(row).filter((key) => {
      if (!key.endsWith('_id')) return false
      const relationKey = key.slice(0, -3) // 'customer_id' -> 'customer'
      return relationKey in row && typeof row[relationKey] === 'object' && row[relationKey] !== null
    })
  }

  return { formatCellValue, getColumnValue, flattenKeys, getArrayColumns, getForeignKeyColumns }
}