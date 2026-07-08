export interface NctCrudTableConfig {
  globalHide?: string[]
  hideForeignKeys?: boolean
  exports?: {
    excel?: {
      globalExclude?: string[]
      resourceExclude?: Record<string, string[]>
    }
    pdf?: {
      globalExclude?: string[]
      resourceExclude?: Record<string, string[]>
    }
  }
}
