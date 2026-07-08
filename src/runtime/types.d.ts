import '@nuxt/schema'
import type { ModuleOptions } from '../module'
import type { NctUser } from './shared/types/auth'

declare module '@nuxt/schema' {
  interface PublicRuntimeConfig {
    /**
     * Runtime configuration options for the Nuxt Crud Table environment.
     * Maps schema defaults, visibility guidelines, and authorization gates across the application.
     * * @remarks
     * These options originate from your inline keys or `crudTable` configuration blocks 
     * defined directly inside `nuxt.config.ts`.
     * * @example
     * ```ts
     * export default defineNuxtConfig({
     * runtimeConfig: {
     * public: {
     * crudTable: {
     * auth: true
     * }
     * }
     * }
     * })
     * ```
     */
    crudTable: ModuleOptions
  }
}

declare module '#app' {
  interface NuxtApp {
    $nctAuthHeaders?: () => Record<string, string>
    $nctUser?: Ref<NctUser | null>
  }
}

export {}