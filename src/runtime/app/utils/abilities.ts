import { useRuntimeConfig } from '#app'
import type { NctUser } from '../../shared/types/auth'

/**
 * Checks whether authentication is globally enabled for the CRUD table module
 * via the runtime public configuration.
 *
 * @returns `true` if authentication configuration is present and enabled; otherwise, `false`.
 */
export function nctIsAuthEnabled(): boolean {
  const auth = useRuntimeConfig().public.crudTable.auth
  return !!auth
}

/**
 * Determines if the given user has an administrative role.
 *
 * @param user - The user object to check.
 * @returns `true` if the user exists and has the 'admin' role; otherwise, `false`.
 */
export function nctIsAdmin(user: NctUser | null | undefined): boolean {
  if (!user) return false
  return user?.role === 'admin'
}

/**
 * Verifies if the authenticated user is the owner of a specific data record.
 * It matches the user's ID against a specified ownership key within the record.
 *
 * @param user - The user object to evaluate.
 * @param record - The data record being checked.
 * @param ownerKey - The property key in the record that holds the creator/owner ID. Defaults to `'createdBy'`.
 * @returns `true` if the user ID matches the record's owner field; otherwise, `false`.
 */
export function nctIsOwner(user: NctUser | null | undefined, record?: Record<string, unknown>, ownerKey: string = 'createdBy'): boolean {
  if (!user?.id || !record) return false
  return Number(user.id) === Number(record[ownerKey])
}

/**
 * Checks if a user has permission to perform a specific action on a given model/resource.
 * Automatically grants access if authentication is disabled or if the user is an admin.
 *
 * @param user - The user whose permissions are being checked.
 * @param model - The resource/model name (e.g., 'users', 'posts').
 * @param action - The action being performed (e.g., 'create', 'edit', 'delete').
 * @returns `true` if the action is permitted; otherwise, `false`.
 */
export function nctHasPermission(user: NctUser | null | undefined, model: string, action: string): boolean {
  if (!nctIsAuthEnabled()) return true

  if (nctIsAdmin(user)) return true
  if (!user) return false
  return !!user?.permissions?.[model]?.includes(action)
}

/**
 * Checks row-level permissions for a specific record.
 * Allows the action if the user has global permission, or if they have an ownership-restricted
 * permission (e.g., `action_own`) and actually own the record.
 *
 * @param user - The user executing the action.
 * @param model - The resource/model name.
 * @param action - The base action being attempted (e.g., 'edit').
 * @param record - The specific record instance being accessed.
 * @returns `true` if the user is authorized to perform the action on this specific row; otherwise, `false`.
 */
export function nctHasRowPermission(user: NctUser | null | undefined, model: string, action: string, record?: Record<string, unknown>): boolean {
  if (!nctIsAuthEnabled()) return true

  if (nctHasPermission(user, model, action)) return true

  if (nctHasPermission(user, model, `${action}_own`)) {
    return nctIsOwner(user, record)
  }

  return false
}

/**
 * Determines whether a user should see the navigation menu item for a specific resource
 * based on whether they have list visibility permissions (`list`, `list_all`, or `list_own`).
 *
 * @param user - The current user.
 * @param model - The resource/model name to evaluate.
 * @returns `true` if the user has any listing capability for the resource; otherwise, `false`.
 */
export function nctIsAllowedToSeeResourceMenu(user: NctUser | null | undefined, model: string): boolean {
  return nctHasPermission(user, model, 'list') || nctHasPermission(user, model, 'list_all') || nctHasPermission(user, model, 'list_own')
}
