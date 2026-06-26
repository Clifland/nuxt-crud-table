import '@nuxt/schema'
import type { ModuleOptions } from '../module'

declare module '@nuxt/schema' {
  interface PublicRuntimeConfig {
    crudTable: ModuleOptions
  }
}

declare module '#imports' {
  export function NctCrudHeaders(): Record<string, string>
}

export {}
