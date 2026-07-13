import { useAppConfig } from '#app'
import type { NctCrudTableConfig } from '../shared/types/config'
import { nctDbFieldToLabel } from '#imports'

/**
 * A reactive state and utility composable providing client-side data export capabilities
 * (Excel and PDF) for Nuxt Crud Table instances.
 *
 * @remarks
 * It dynamically evaluates layout constraints, matches configuration-driven column exclusion lists,
 * maps raw structural keys into human-readable labels, and processes code splitting via lazy dynamic
 * imports (`xlsx`, `jspdf`, `jspdf-autotable`) to preserve a optimized bundle footprint.
 *
 * @example
 * ```ts
 * const { isExportEnabled, exportToExcel, exportToPDF } = useNctExport()
 * if (isExportEnabled) {
 * await exportToExcel(usersData, 'users', ['id', 'name', 'email'])
 * }
 * ```
 *
 * @returns An object containing the export activation flags and lazy formatting action triggers.
 */
export const useNctExport = () => {
  const appConfig = useAppConfig()
  const crudConfig = appConfig.crud as NctCrudTableConfig
  const isExportEnabled = !!crudConfig?.exports

  /**
   * Internal helper to merge global and resource-specific field omission lists for the target document format.
   *
   * @param type - The format identifier being constructed.
   * @param resource - The model or domain resource name context.
   * @returns A deduplicated array of property keys to exclude from the payload.
   */
  const getExportExclusions = (type: 'pdf' | 'excel', resource: string) => {
    const config = crudConfig?.exports?.[type]
    if (!config) return []
    const global = config.globalExclude || []
    const resourceSpecific = (config.resourceExclude as Record<string, string[]>)?.[resource] || []
    return [...new Set([...global, ...resourceSpecific])]
  }

  /**
   * Sanitizes, filters, and transforms table records into display-ready structures using descriptive labels.
   *
   * @param data - Raw database records fetched for export processing.
   * @param visibleColumns - Currently active or visible table columns.
   * @param exclude - Specific field strings to drop from visibility rules.
   * @returns Formatted structural key-value objects map.
   */
  const prepareData = (data: unknown[], visibleColumns: string[], exclude: string[]) => {
    const items = (data ?? []) as Record<string, unknown>[]
    if (!items.length) return []

    const columnMap = visibleColumns
      .filter(col => !exclude.includes(String(col)))
      .map(col => ({
        key: String(col),
        label: nctDbFieldToLabel(String(col)),
      }))

    return items.map((row) => {
      const exportRow: Record<string, unknown> = {}
      for (const { key, label } of columnMap) {
        exportRow[label] = row[key]
      }
      return exportRow
    })
  }

  /**
   * Generates and triggers a prompt to save a processed dataset as an Microsoft Excel spreadsheet (.xlsx).
   *
   * @param rawData - The tabular target array matrix to process.
   * @param resource - The resource string to utilize for spreadsheet categorization and file name construction.
   * @param visibleColumns - Column keys matching current layout configurations.
   * @returns Resolves when compilation finishes and download initiation is triggered by the host pipeline.
   */
  const exportToExcel = async (rawData: unknown[], resource: string, visibleColumns: string[]) => {
    if (!isExportEnabled) return
    const XLSX = await import('xlsx')

    const exclusions = getExportExclusions('excel', resource)
    const exportData = prepareData(rawData, visibleColumns, exclusions)

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
    XLSX.writeFile(workbook, `${resource}.xlsx`)
  }

  /**
   * Builds and triggers a structured file system stream download for a formatted PDF ledger (.pdf).
   *
   * @param rawData - The raw rows matrix.
   * @param resource - Context model tracking name.
   * @param visibleColumns - Visual UI column layout tracker array.
   * @returns Resolves when coordinate maps and vectors execute file assembly.
   */
  const exportToPDF = async (rawData: unknown[], resource: string, visibleColumns: string[]) => {
    if (!isExportEnabled) return
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ])

    const exclusions = getExportExclusions('pdf', resource)
    const exportData = prepareData(rawData, visibleColumns, exclusions)
    const firstRow = exportData[0]
    if (!firstRow) return
    const headers = Object.keys(firstRow)

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const title = resource.replace(/_/g, ' ').toUpperCase()
    const date = new Date().toLocaleString()

    doc.setFontSize(22)
    doc.setTextColor(30, 41, 59)
    doc.text(title, 14, 20)

    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    doc.text(`Generated on ${date}`, 14, 28)

    const tableRows = exportData.map(item => headers.map((col) => {
      const val = item[col]
      return val === null || val === undefined ? '' : String(val)
    }))

    autoTable(doc, {
      startY: 35,
      head: [headers.map(col => col.toUpperCase())],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', lineWidth: 0.1, halign: 'left' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 9, lineWidth: 0.1, cellPadding: 3, overflow: 'linebreak', textColor: [51, 65, 85], lineColor: [226, 232, 240] },
      margin: { top: 35, right: 14, bottom: 20, left: 14 },
      didDrawPage: (data) => {
        const pageSize = doc.internal.pageSize
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight()
        const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth()
        doc.setFontSize(10)
        doc.setTextColor(148, 163, 184)
        doc.text('Page ' + data.pageNumber, pageWidth - 30, pageHeight - 10)
      },
    })

    doc.save(`${resource}_${new Date().getTime()}.pdf`)
  }

  return {
    isExportEnabled,
    exportToExcel,
    exportToPDF,
  }
}
