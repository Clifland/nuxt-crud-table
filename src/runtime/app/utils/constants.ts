/**
 * @internal
 * Categorization only — documents which fields a backend implementation (e.g. nac)
 * should never serialize over the API in the first place. NOT consumed by any of
 * nct's client-side filtering logic, and not exported: hiding a field client-side
 * after it has already arrived in an API response provides no actual protection —
 * that's the backend's responsibility (Laravel's `$hidden`/`$guarded`, or simply
 * never selecting the column in the first place).
 * @remarks
 * Deliberately snake_case, as a reminder that these correspond to raw DB columns,
 * not a casing convention nct itself enforces elsewhere.
 * @type {string[]}
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const API_HIDDEN_FIELDS: string[] = [
  'password', 'secret', 'token',
  'reset_token', 'reset_expires',
  'github_id', 'google_id',
]

/**
 * Default structural/system fields hidden from forms — fields that are
 * server-managed and never meant to be hand-edited through a generic CRUD form.
 * @remarks
 * Deliberately excludes anything from {@link API_HIDDEN_FIELDS} — if the API
 * contract is respected, those fields never reach the frontend at all, so
 * there's nothing here for `formHiddenFields` to hide.
 * @remarks
 * Case-convention-agnostic by design — comparisons against this list go through
 * {@link isFieldHidden}, which normalizes both sides to snake_case, so listing
 * `created_at` here also matches a `createdAt` field arriving from a
 * camelCase-convention API. No need to list both variants.
 * @remarks
 * This is the *default* used when `app.config.ts`'s `crud.formHiddenFields`
 * is unset. A host app's own `default` array (if provided) replaces this
 * entirely rather than merging with it — see {@link resolveHiddenFields}.
 * @type {string[]}
 */
export const NCT_FORM_HIDDEN_FIELDS: string[] = [
  'id', 'uuid',
  'created_at', 'updated_at', 'deleted_at',
  'created_by', 'updated_by', 'deleted_by',
]

/**
 * Default fields hidden from the main data table/list view.
 * @remarks
 * Same case-agnostic matching behavior as {@link NCT_FORM_HIDDEN_FIELDS} — see
 * {@link isFieldHidden}. This is the default used when `app.config.ts`'s
 * `crud.tableHiddenFields` is unset.
 * @type {string[]}
 */
export const NCT_TABLE_HIDDEN_FIELDS: string[] = [
  'updated_at', 'deleted_at', 'created_by', 'updated_by',
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