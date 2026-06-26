import { useAppConfig } from '#app'
import type { NctCrudTableConfig } from '../shared/types/config'
import { nctDbFieldToLabel } from '#imports'

export const useNctExport = () => {
  const appConfig = useAppConfig()
  const crudConfig = appConfig.crud as NctCrudTableConfig
  const isExportEnabled = !!crudConfig?.exports

  const getExportExclusions = (type: 'pdf' | 'excel', resource: string) => {
    const config = crudConfig?.exports?.[type]
    if (!config) return []
    const global = config.globalExclude || []
    const resourceSpecific = (config.resourceExclude as Record<string, string[]>)?.[resource] || []
    return [...new Set([...global, ...resourceSpecific])]
  }

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
