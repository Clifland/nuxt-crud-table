export default defineNuxtConfig({
  modules: ['../src/module', '@nuxthub/core', 'nuxt-auto-crud', '@nuxt/ui'],
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  compatibilityDate: 'latest',
  hub: {
    db: 'sqlite',
  },
  crudTable: {
    apiBase: '/api/_nac',
    auth: false,
    formHiddenFields: [],
  },
  autoCrud: {
    relationsPath: 'server/db/relations',
  },
})
