import { defineNuxtPlugin } from '#app'

export interface nctAuthResolver {
  getUser: () => unknown | null
  isAuthenticated: () => boolean
}

export default defineNuxtPlugin({
  name: 'nct-crud-auth',
  setup() {
    let activeStrategy: nctAuthResolver = {
      getUser: () => null,
      isAuthenticated: () => false,
    }

    return {
      provide: {
        nctAuth: {
          setStrategy: (strategy: nctAuthResolver) => {
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
    $nctAuth: {
      setStrategy: (strategy: nctAuthResolver) => void
      getUser: () => unknown | null
      isAuthenticated: () => boolean
    }
  }
}

export {}
