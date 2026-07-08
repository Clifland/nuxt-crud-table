import { defineNuxtPlugin } from '#app'

/**
 * Interface contract defining the necessary methods required to plug custom auth solutions
 * (e.g., Auth-Utils, Lucia, Kinde, Passport) directly into the dynamic CRUD engine.
 */
export interface NctAuthResolver {
  /** Retrieves the active authenticated user profile model data context. */
  getNctUser: () => unknown | null
  /** Evaluates if the current browser session or server context context holds an active authentication token. */
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
    /**
     * The global authorization bridge for the Nuxt Crud Table environment.
     * Allows custom identity providers to bridge user identity states into the module UI and guard layouts.
     */
    $nctAuth: {
      /**
       * Registers a concrete authorization driver to handle session and validation resolution rules.
       * * @example
       * ```ts
       * const { user, loggedIn } = useUserSession()
       * useNuxtApp().$nctAuth.setStrategy({
       * getNctUser: () => user.value,
       * isAuthenticated: () => loggedIn.value
       * })
       * ```
       * * @param {NctAuthResolver} strategy - The custom driver strategy matching validation interface properties.
       */
      setStrategy: (strategy: NctAuthResolver) => void
      
      /**
       * Resolves the session profile context from the bound authentication provider layer.
       * * @returns {unknown | null} The application's active user object model, or null if unauthenticated.
       */
      getNctUser: () => unknown | null
      
      /**
       * Returns a reactive verification checkpoint assessing current session presence.
       * * @returns {boolean} True if a verified active signature exists; otherwise false.
       */
      isAuthenticated: () => boolean
    }
  }
}

export {}