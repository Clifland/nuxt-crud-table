export default defineNuxtPlugin(async () => {
  const { user, authHeaders, fetch } = useNctAuth()
  await fetch() // rehydrates the session.
  return {
    provide: {
      nctAuthHeaders: () => authHeaders.value,
      nctUser: user,
    },
  }
})
