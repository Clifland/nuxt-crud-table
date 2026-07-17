export default defineNuxtPlugin(() => {
  const { user, authHeaders } = useNctAuth()
  return {
    provide: {
      nctAuthHeaders: () => authHeaders.value,
      nctUser: user,
    },
  }
})
