import { defineNuxtModule, addComponentsDir, createResolver, addImportsDir, addVitePlugin } from '@nuxt/kit'

import { NCT_FORM_HIDDEN_FIELDS } from './runtime/app/utils/constants'

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
   * Defines security ecosystem integrations or switches authentication layer mechanisms entirely off.
   * @default false
   */
  auth: false | { authentication: 'nuxt-auth-utils' | 'sanctum' }

  /**
   * Global array mapping property key terms omitted from generating operational fields in form states.
   * @default NCT_FORM_HIDDEN_FIELDS
   */
  formHiddenFields: string[]

  /**
   * An optional functional evaluator supplying a structured dictionary map of network authorization headers.
   * @remarks Useful for extracting localized browser cookies or dynamic authorization bearers safely.
   * @default () => ({})
   */
  headers: () => Record<string, string>
}

declare module '@nuxt/schema' {
  interface PublicRuntimeConfig {
    /**
     * Public runtime options mapping parameters across client components and global composables.
     * @note Excludes the `headers` method interceptor to protect structural configuration environments.
     */
    crudTable: Omit<ModuleOptions, 'headers'>
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
    formHiddenFields: NCT_FORM_HIDDEN_FIELDS,
    headers: () => ({}),
  },

  setup(_options, _nuxt) {
    const resolver = createResolver(import.meta.url)

    // Populate localized application public configurations
    _nuxt.options.runtimeConfig.public.crudTable = {
      apiBase: _options.apiBase,
      auth: _options.auth,
      formHiddenFields: _options.formHiddenFields,
    }

    // Register module directories containing runtime components, helpers, and plugins
    addComponentsDir({ path: resolver.resolve('runtime/app/components') })
    addImportsDir(resolver.resolve('runtime/composables'))
    addImportsDir(resolver.resolve('runtime/app/utils'))

    // Hook to append module declarations directly into the project's compilation references (.nuxt/tsconfig.json)
    _nuxt.hook('prepare:types', ({ references, sharedReferences }) => {
      const typeFiles = ['auth', 'config', 'schema', 'validation-rules']

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
