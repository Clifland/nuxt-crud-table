import '@nuxt/schema'

declare module '@nuxt/schema' {
  interface PublicRuntimeConfig {
    crudTable: {
      crudEndpointPrefix: string
    }
  }
}

export {}