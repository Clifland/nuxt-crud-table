/**
 * Configuration metadata representing an individual field property in the backend database schema.
 */
export interface NctField {
  /**
   * The exact property key name as defined in the database table schema (e.g., 'created_at').
   */
  name: string
  /**
   * The structural validation type constraint (e.g., 'string', 'password', 'enum', 'date').
   */
  type: string
  /**
   * Indicates whether the field can be submitted with null or empty content values.
   */
  required?: boolean
  /**
   * Valid item variants list if the input element type resolves as an enum selector.
   */
  selectOptions?: string[]
  /**
   * The parent relation mapping reference target signature if a foreign entity binding exists.
   */
  references?: string
  /**
   * Flag preventing the control input form elements from accepting modification triggers.
   */
  readonly?: boolean
}

/**
 * A root resource contract mapping defining data grids and validation requirements for a backend resource.
 */
export interface NctSchemaDefinition {
  /**
   * The pluralized name of the resource model matching the endpoint destination path (e.g., 'products').
   */
  resource: string
  /**
   * The primary display key used to represent the model in relational select menus (e.g., 'title' or 'name').
   */
  labelField: string
  /**
   * Collection mapping definitions tracking individual attributes of the resource entry context.
   */
  fields: NctField[]
}