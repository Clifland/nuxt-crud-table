import '@nuxt/schema'

declare module '@nuxt/schema' {
  interface PublicRuntimeConfig {
    crudTable: {
      crudEndpointPrefix: string
      auth: boolean | Record<string, unknown>
      formHiddenFields: string[]
    }
  }
}

export {}