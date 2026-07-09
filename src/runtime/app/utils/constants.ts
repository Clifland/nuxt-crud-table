/**
 * A collection of field names that represent strictly internal or sensitive data.
 * @remarks
 * These fields are designated for backend consumption and should never be exposed
 * or leaked beyond the server context.
 * @type {string[]}
 */
export const NCT_API_HIDDEN_FIELDS: string[] = [
  'password', 'secret', 'token',
  'resetToken', 'resetExpires',
  'githubId', 'googleId',
]

/**
 * An array of field keys that must be omitted automatically when rendering
 * entry or modification forms.
 * @remarks
 * Inherits all fields from {@link NCT_API_HIDDEN_FIELDS} and appends standard metadata
 * properties (like IDs and timestamps) that should not be manually modified by users.
 * @type {string[]}
 */
export const NCT_FORM_HIDDEN_FIELDS: string[] = [
  ...NCT_API_HIDDEN_FIELDS,
  'id', 'uuid',
  'createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy', 'deletedBy', 'resetToken',
  'created_at', 'updated_at', 'deleted_at', 'created_by', 'updated_by', 'deleted_by', 'reset_token',
]

/**
 * Fields that are hidden by default from being rendered as columns in the main data grid view.
 * @remarks
 * Typically includes operational timestamps or tracking metrics that crowd the UI,
 * but remain accessible under the hood.
 * @type {string[]}
 */
export const NCT_DATA_TABLE_HIDDEN_FIELDS: string[] = [
  'updatedAt', 'deletedAt', 'createdBy', 'updatedBy',
]

/**
 * An array of field names that should appear visible within forms for context,
 * but must be locked down as immutable/non-editable by the user.
 * @note Primary keys like `id` are omitted here because they are structural and managed
 * automatically by the core code layer.
 * @type {string[]}
 */
export const NCT_FORM_READ_ONLY_FIELDS: string[] = []

/**
 * System-critical database table names that should be ignored or blacklisted
 * by the CRUD engine schema parser.
 * @remarks
 * This array guards internal operational framework tables (such as migration logs or SQLite schemas)
 * from accidentally exposing themselves as dynamic frontend resources.
 * @type {string[]}
 */
export const NCT_SYSTEM_TABLES: string[] = ['_hub_migrations', 'd1_migrations', 'sqlite_sequence']
