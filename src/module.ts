import { defineNuxtModule, addComponentsDir, createResolver, addImportsDir, addPlugin, addVitePlugin, addTemplate, addImports } from '@nuxt/kit'

import { NCT_FORM_HIDDEN_FIELDS } from './runtime/app/utils/constants'

// Module options TypeScript interface definition
export interface ModuleOptions {
  apiBase: string
  auth: false | { authentication: 'nuxt-auth-utils' | 'sanctum' }
  formHiddenFields: string[]
  headers: () => Record<string, string>
}

declare module '@nuxt/schema' {
  interface PublicRuntimeConfig {
    crudTable: Omit<ModuleOptions, 'headers'>
  }
}

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

  moduleDependencies: {
    '@nuxt/ui': {
      version: '^4.0.0',
    },
  },

  setup(_options, _nuxt) {
    const resolver = createResolver(import.meta.url)

    _nuxt.options.runtimeConfig.public.crudTable = {
      apiBase: _options.apiBase,
      auth: _options.auth,
      formHiddenFields: _options.formHiddenFields,
    }
    
    _nuxt.options.runtimeConfig.crudTable = {
      headers: _options.headers,
    }

    addComponentsDir({ path: resolver.resolve('runtime/app/components') })
    addImportsDir(resolver.resolve('runtime/composables'))
    addImportsDir(resolver.resolve('runtime/app/utils'))
    addPlugin(resolver.resolve('runtime/plugins/nct-auth'))

    _nuxt.hook('prepare:types', ({ references, sharedReferences }) => {
      const typeFiles = ['auth', 'config', 'schema', 'validation-rules']

      for (const file of typeFiles) {
        const resolvedPath = resolver.resolve(`runtime/shared/types/${file}.ts`)
        references.push({ path: resolvedPath })
        sharedReferences.push({ path: resolvedPath })
      }
      references.push({ path: resolver.resolve('runtime/types.d.ts') })
    })

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

    addTemplate({
      filename: 'nac/headers.mjs',
      getContents: () => `
        export const nctCrudHeaders = ${_options.headers.toString()}
      `,
    })
    addImports({
      name: 'nctCrudHeaders',
      from: resolver.resolve(_nuxt.options.buildDir, 'nac/headers.mjs'),
    })

  },
})
