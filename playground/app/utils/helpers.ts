import { useNctAuth } from '#imports'

export function crudHeaders() {
  const { authHeaders } = useNctAuth()
  return {
    Accept: 'application/json',
    ...authHeaders.value,
  }
}
