import '@nuxt/schema'
import type { ModuleOptions } from '../module'

declare module '@nuxt/schema' {
  interface PublicRuntimeConfig {
    crudTable: ModuleOptions
  }
}

declare module '#imports' {
  export function nctCrudHeaders(): Record<string, string>
}

export {}
