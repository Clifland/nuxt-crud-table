import { defineVitestConfig } from '@nuxt/test-utils/config'
import { fileURLToPath } from 'node:url'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    environmentOptions: {
      nuxt: {
        rootDir: fileURLToPath(new URL('./playground', import.meta.url)),
      },
    },
  },
})
