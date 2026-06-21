import { defineNuxtPlugin } from '#app'

export interface NacAuthResolver {
  getUser: () => any
  isAuthenticated: () => boolean
}

export default defineNuxtPlugin({
  name: 'nac-auth-core',
  setup() {
    let activeStrategy: NacAuthResolver = {
      getUser: () => null,
      isAuthenticated: () => false
    }

    return {
      provide: {
        nacAuth: {
          setStrategy: (strategy: NacAuthResolver) => {
            activeStrategy = strategy
          },
          getUser: () => activeStrategy.getUser(),
          isAuthenticated: () => activeStrategy.isAuthenticated()
        }
      }
    }
  }
})

declare module '#app' {
  interface NuxtApp {
    $nacAuth: {
      setStrategy: (strategy: NacAuthResolver) => void
      getUser: () => any
      isAuthenticated: () => boolean
    }
  }
}

export {}