export default defineNuxtConfig({
  modules: ['../src/module', '@nuxthub/core', 'nuxt-auto-crud', '@nuxt/ui'],
  devtools: { enabled: true },
  compatibilityDate: 'latest',
  crudTable: {},
  css: ['~/assets/css/main.css'],
  hub: {
    db: 'sqlite'
  }
})
