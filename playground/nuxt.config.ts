export default defineNuxtConfig({
  modules: ['../src/module', '@nuxthub/core', 'nuxt-auto-crud', '@nuxt/ui'],
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  alias: {
    'nuxt-crud-table': '../src/module',
  },
  compatibilityDate: 'latest',
  hub: {
    db: 'sqlite',
  },
  autoCrud: {
    relationsPath: 'server/db/relations',
  },
  crudTable: {
    apiBase: '/api/_nac',
  },
})
