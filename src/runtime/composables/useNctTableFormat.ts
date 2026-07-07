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
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return flattenKeys(value as Record<string, unknown>, path)
      }
      return [path]
    })
  }

  return { formatCellValue, getColumnValue, flattenKeys }
}