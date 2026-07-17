import type { NctSchemaDefinition } from './schema'

export interface NctPrintTemplateProps {
  resource?: string
  schema?: NctSchemaDefinition
  columns: { key: string, label: string }[]
  rows: Record<string, unknown>[]
  footer?: Map<string, { label: string, value: number }[]>
  parentResource?: string
  parentRow?: Record<string, unknown>
}

export {}
