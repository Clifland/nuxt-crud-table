export interface NctField {
  name: string
  type: string
  required?: boolean
  selectOptions?: string[]
  references?: string
  readonly?: boolean
}
export interface NctSchemaDefinition {
  resource: string
  labelField: string
  fields: NctField[]
}
