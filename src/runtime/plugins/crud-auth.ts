import { defineNuxtPlugin } from '#app'

export interface crudAuthResolver {
  getUser: () => unknown | null
  isAuthenticated: () => boolean
}

export default defineNuxtPlugin({
  name: 'crud-auth-core',
  setup() {
    let activeStrategy: crudAuthResolver = {
      getUser: () => null,
      isAuthenticated: () => false,
    }

    return {
      provide: {
        crudAuth: {
          setStrategy: (strategy: crudAuthResolver) => {
            activeStrategy = strategy
          },
          getUser: () => activeStrategy.getUser(),
          isAuthenticated: () => activeStrategy.isAuthenticated(),
        },
      },
    }
  },
})

declare module '#app' {
  interface NuxtApp {
    $crudAuth: {
      setStrategy: (strategy: crudAuthResolver) => void
      getUser: () => unknown | null
      isAuthenticated: () => boolean
    }
  }
}

export {}
