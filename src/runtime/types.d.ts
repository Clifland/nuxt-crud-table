import '@nuxt/schema'
import type { NctUser } from './shared/types/auth'
import type { NctCrudTableConfig } from './shared/types/config'

declare module '@nuxt/schema' {
  interface AppConfig {
    /**
     * Field-visibility, export, and aggregate configuration for nct tables/forms.
     * * Set via `app.config.ts`'s `crud` key. Hot-reloadable at runtime, unlike
     * `crudTable` (module options), which requires a rebuild to change.
     */
    crud?: NctCrudTableConfig
  }
}

declare module '#app' {
  interface NuxtApp {
    /**
     * Runtime resolver returning authorization context headers mapped to backend endpoints.
     */
    $nctAuthHeaders?: () => Record<string, string>
    /**
     * A reactive reference containing the authenticated backend session user payload context.
     */
    $nctUser?: Ref<NctUser | null>
  }
}

export { }