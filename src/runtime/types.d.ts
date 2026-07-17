import '@nuxt/schema'
import type { NctUser } from './shared/types/auth'
import type { NctCrudTableConfig } from './shared/types/config'

declare module '@nuxt/schema' {
  interface AppConfig {
    /**
     * Field-visibility, export, and aggregate configuration for nct tables/forms.
     * Set via `app.config.ts`'s `crud` key. Hot-reloadable at runtime, unlike
     * `crudTable` (module options), which requires a rebuild to change.
     */
    crud?: NctCrudTableConfig
  }
}

declare module '#app' {
  interface NuxtApp {
    /**
     * Runtime resolver returning authorization context headers mapped to backend endpoints.
     * Only consulted by nct's own data fetches (Table.vue, NameList.vue, useNctCrudFetch, etc.)
     * — never read by permission checks (see $nctUser below).
     */
    $nctAuthHeaders?: () => Record<string, string>
    /**
     * A reactive reference containing the authenticated session user payload context.
     *
     * @remarks
     * This is nct's **sole** source of truth for permissions — `nctHasPermission`,
     * `nctHasRowPermission`, `nctIsAdmin`, and `nctIsOwner` (see `abilities.ts`) all take
     * a plain `NctUser | null | undefined` argument and never call `useNctAuth()` or any
     * auth strategy internally. `Table.vue`/`ChildTable.vue` read this value exclusively
     * via `useNuxtApp().$nctUser`.
     *
     * nct is not an auth provider. Populate this however you already authenticate —
     * Sanctum, Firebase, Clerk, a hand-rolled session, or nct's own optional
     * `useNctAuth()` convenience layer (see below) — by providing it from a plugin:
     *
     * ```ts
     * // app/plugins/nct-auth.ts
     * export default defineNuxtPlugin(() => {
     *   const user = ref<NctUser | null>(null) // sourced from wherever you already auth
     *   return { provide: { nctUser: user, nctAuthHeaders: () => ({}) } }
     * })
     * ```
     *
     * `useNctAuth()`/`crudTable.auth` strategies are a separate, optional convenience for
     * getting a working login screen quickly — swap them out for your own auth entirely
     * whenever you're ready; nothing else in nct depends on them.
     */
    $nctUser?: Ref<NctUser | null>
  }
}

export { }
