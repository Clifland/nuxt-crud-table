import { defineNuxtModule, addComponentsDir, createResolver, addImportsDir, addVitePlugin } from '@nuxt/kit'

/**
 * TypeScript definitions mapping configurable initialization options for the Nuxt Crud Table module.
 */
export interface ModuleOptions {
  /**
   * The base URL endpoint leading to your schema-driven backend controller instance.
   * @default '/api/_nac'
   */
  apiBase: string

  /**
   * Selects a registered `NctAuthStrategy` (see `runtime/auth/strategy-registry.ts`).
   * @default false
   */
  auth: false | {
    authentication: 'nuxt-auth-utils' | 'sanctum' | 'fastapi' | 'fortify' | (string & {})
    authorization?: false | 'nuxt-crud-permissions'
  }
}

declare module '@nuxt/schema' {
  interface PublicRuntimeConfig {
    crudTable: ModuleOptions
  }
}

/**
 * The Nuxt Crud Table core module engine.
 * Automatically resolves structural backend entities, builds dynamic admin grids,
 * controls layout permissions, injects global components, and manages client dependency pre-bundling.
 */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-crud-table',
    configKey: 'crudTable',
  },

  // Default configuration options of the Nuxt module
  defaults: {
    apiBase: '/api/_nac',
    auth: false,
  },

  setup(_options, _nuxt) {
    const resolver = createResolver(import.meta.url)

    // Assign the full configuration safely to the server-only block
    _nuxt.options.runtimeConfig.public.crudTable = {
      apiBase: _options.apiBase,
      auth: _options.auth,
    }

    // Register module directories containing runtime components, helpers, and plugins
    addComponentsDir({ path: resolver.resolve('runtime/app/components') })
    addImportsDir(resolver.resolve('runtime/composables'))
    addImportsDir(resolver.resolve('runtime/app/utils'))

    // Global print-isolation stylesheet for NctCrudChildTable's "Print" button
    _nuxt.options.css.push(resolver.resolve('runtime/app/assets/print.css'))

    // Hook to append module declarations directly into the project's compilation references (.nuxt/tsconfig.json)
    _nuxt.hook('prepare:types', ({ references, sharedReferences }) => {
      const typeFiles = ['auth', 'auth-strategy', 'config', 'schema', 'validation-rules', 'print']

      for (const file of typeFiles) {
        const resolvedPath = resolver.resolve(`runtime/shared/types/${file}.ts`)
        references.push({ path: resolvedPath })
        sharedReferences.push({ path: resolvedPath })
      }
      references.push({ path: resolver.resolve('runtime/types.d.ts') })
    })

    // Inline Vite adapter injecting critical heavyweight dependencies directly into pre-bundling routines
    addVitePlugin(() => ({
      name: 'my-optimize-deps',
      configEnvironment(name, config) {
        if (name === 'client') {
          config.optimizeDeps ||= {}
          config.optimizeDeps.include ||= []
          config.optimizeDeps.include.push(
            '@vueuse/integrations/useChangeCase',
            'jspdf',
            'jspdf-autotable',
            'pluralize',
            'xlsx',
            'zod',
          )
        }
      },
      applyToEnvironment(environment) {
        return environment.name === 'client'
      },
    }))
  },
})

export type { NctPrintTemplateProps } from './runtime/shared/types/print'
export { registerNctAuthStrategy } from './runtime/auth/strategy-registry'
export type { NctAuthStrategy, NctAuthContext } from './runtime/shared/types/auth-strategy'
