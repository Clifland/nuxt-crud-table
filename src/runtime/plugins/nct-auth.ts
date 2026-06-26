import { defineNuxtPlugin } from '#app'

export interface NctAuthResolver {
  getNctUser: () => unknown | null
  isAuthenticated: () => boolean
}

export default defineNuxtPlugin({
  name: 'nct-crud-auth',
  setup() {
    let activeStrategy: NctAuthResolver = {
      getNctUser: () => null,
      isAuthenticated: () => false,
    }

    return {
      provide: {
        nctAuth: {
          setStrategy: (strategy: NctAuthResolver) => {
            activeStrategy = strategy
          },
          getNctUser: () => activeStrategy.getNctUser(),
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
      getNctUser: () => unknown | null
      isAuthenticated: () => boolean
    }
  }
}

export {}
