// plugins/02.nac-auth-impl.ts
export default defineNuxtPlugin({
  name: 'nac-auth-implementation',
  dependsOn: ['nac-auth-core'], 
  setup() {
    // const { user, loggedIn } = useUserSession()
    
    // Resolving via composable provides the fully augmented types
    const nuxtApp = useNuxtApp()

    nuxtApp.$nacAuth.setStrategy({
      // getUser: () => user.value,
      // isAuthenticated: () => loggedIn.value
      getUser: () => null,
      isAuthenticated: () => false
    })
  }
})
