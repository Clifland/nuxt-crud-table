export interface NctCrudTableConfig {
  globalHide?: string[]
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
