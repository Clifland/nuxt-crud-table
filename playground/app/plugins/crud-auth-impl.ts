// plugins/02.crud-auth-impl.ts
export default defineNuxtPlugin({
  name: 'crud-auth-implementation',
  dependsOn: ['crud-auth-core'], 
  setup() {
    // const { user, loggedIn } = useUserSession()
    
    // Resolving via composable provides the fully augmented types
    const nuxtApp = useNuxtApp()

    nuxtApp.$crudAuth.setStrategy({
      // getUser: () => user.value,
      // isAuthenticated: () => loggedIn.value
      getUser: () => null,
      isAuthenticated: () => false
    })
  }
})
