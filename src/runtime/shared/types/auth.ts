/**
 * Represents the identity model configuration for an authenticated user within the CRUD framework.
 */
export interface NctUser {
  /** The unique identifier assigned to the user entity. */
  id: string | number
  /** The full display name of the user. */
  name: string
  /** The primary contact email address associated with the account. */
  email: string
  /** Optional web URL path pointing to the user's hosted avatar image asset. */
  avatar?: string
  /** Optional system role level grouping defining macro access privileges (e.g., 'admin', 'editor'). */
  role?: string
  /** * Optional resource authorization matrices mapping specific models to permission rules.
   * * @example
   * ```ts
   * permissions: {
   * "users": ["list", "create", "delete_own"],
   * "posts": ["*"]
   * }
   * ```
   */
  permissions?: Record<string, string[]>
}