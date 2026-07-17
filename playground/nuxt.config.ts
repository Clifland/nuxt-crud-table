export default defineNuxtConfig({
  modules: ['../src/module', '@nuxthub/core', 'nuxt-auto-crud', '@nuxt/ui', 'nuxt-auth-utils'],
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
})
