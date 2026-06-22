export default defineNuxtConfig({
  modules: ['../src/module', '@nuxthub/core', 'nuxt-auto-crud', '@nuxt/ui'],
  devtools: { enabled: true },
  compatibilityDate: 'latest',
  css: ['~/assets/css/main.css'],
  hub: {
    db: 'sqlite'
  },
  crudTable: {
    crudEndpointPrefix: '/api/_nac',
    auth: false,
    formHiddenFields: []
  }
})
