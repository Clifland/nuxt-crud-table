import { useRuntimeConfig } from '#app'
import type { User } from '../types/auth'


function isAuthEnabled() {
  const config = (useRuntimeConfig().public as { autoCrud: { auth: { authentication: boolean, authorization: boolean } } }).autoCrud.auth
  return config?.authentication === true && config?.authorization === true
}

export function isAdmin(user: User | null | undefined) {
  if (!user) return false
  return user?.role === 'admin'
}

export function isOwner(user: User | null | undefined, record?: Record<string, unknown>, ownerKey: string = 'createdBy'): boolean {
  if (!user?.id || !record) return false
  return Number(user.id) === Number(record[ownerKey])
}

export function hasPermission(user: User | null | undefined, model: string, action: string) {
  if (!isAuthEnabled()) return true
  
  if (isAdmin(user)) return true
  if (!user) return false
  return !!user?.permissions?.[model]?.includes(action)
}

export function hasRowPermission(user: User | null | undefined, model: string, action: string, record?: Record<string, unknown>) {
  if (!isAuthEnabled()) return true

  if (hasPermission(user, model, action)) return true

  if (hasPermission(user, model, `${action}_own`)) {
    return isOwner(user, record)
  }

  return false
}

export function isAllowedToSeeResourceMenu(user: User | null | undefined, model: string) {
  return hasPermission(user, model, 'list') || hasPermission(user, model, 'list_all') || hasPermission(user, model, 'list_own')
}
