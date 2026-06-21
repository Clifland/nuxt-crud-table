export interface NacCrudConfig {
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
