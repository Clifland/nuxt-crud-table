import { useRuntimeConfig } from '#app'
import type { NctUser } from '../../shared/types/auth'

export function nctIsAuthEnabled(): boolean {
  const auth = useRuntimeConfig().public.crudTable.auth
  return !!auth
}

export function nctIsAdmin(user: NctUser | null | undefined) {
  if (!user) return false
  return user?.role === 'admin'
}

export function nctIsOwner(user: NctUser | null | undefined, record?: Record<string, unknown>, ownerKey: string = 'createdBy'): boolean {
  if (!user?.id || !record) return false
  return Number(user.id) === Number(record[ownerKey])
}

export function nctHasPermission(user: NctUser | null | undefined, model: string, action: string) {
  if (!nctIsAuthEnabled()) return true

  if (nctIsAdmin(user)) return true
  if (!user) return false
  return !!user?.permissions?.[model]?.includes(action)
}

export function nctHasRowPermission(user: NctUser | null | undefined, model: string, action: string, record?: Record<string, unknown>) {
  if (!nctIsAuthEnabled()) return true

  if (nctHasPermission(user, model, action)) return true

  if (nctHasPermission(user, model, `${action}_own`)) {
    return nctIsOwner(user, record)
  }

  return false
}

export function nctIsAllowedToSeeResourceMenu(user: NctUser | null | undefined, model: string) {
  return nctHasPermission(user, model, 'list') || nctHasPermission(user, model, 'list_all') || nctHasPermission(user, model, 'list_own')
}
