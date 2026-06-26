import { defineNuxtPlugin } from '#app'

export interface NctAuthResolver {
  getUser: () => unknown | null
  isAuthenticated: () => boolean
}

export default defineNuxtPlugin({
  name: 'nct-crud-auth',
  setup() {
    let activeStrategy: NctAuthResolver = {
      getUser: () => null,
      isAuthenticated: () => false,
    }

    return {
      provide: {
        nctAuth: {
          setStrategy: (strategy: NctAuthResolver) => {
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
      setStrategy: (strategy: NctAuthResolver) => void
      getUser: () => unknown | null
      isAuthenticated: () => boolean
    }
  }
}

export {}
