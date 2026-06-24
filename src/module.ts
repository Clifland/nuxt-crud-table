import { defineNuxtModule, addComponentsDir, createResolver, addImportsDir, addPlugin, addVitePlugin } from '@nuxt/kit'

// Module options TypeScript interface definition
export interface ModuleOptions {
  apiBase: string
  auth: boolean | Record<string, unknown>
  formHiddenFields: string[]
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
    formHiddenFields: ['id']
  },

  moduleDependencies: {
    '@nuxt/ui': {
      version: '^4.0.0' 
    }
  },

  setup(_options, _nuxt) {
    const resolver = createResolver(import.meta.url)

    _nuxt.options.runtimeConfig.public.crudTable = {
      apiBase: _options.apiBase,
      auth: _options.auth,
      formHiddenFields: _options.formHiddenFields
    }

    addComponentsDir({
      path: resolver.resolve('runtime/app/components'),
    })    
    addImportsDir(resolver.resolve('runtime/composables'))    
    addImportsDir(resolver.resolve('runtime/shared/utils'))
    addImportsDir(resolver.resolve('runtime/app/utils'))
    addPlugin(resolver.resolve('runtime/plugins/crud-auth'))
    
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

  },
})
