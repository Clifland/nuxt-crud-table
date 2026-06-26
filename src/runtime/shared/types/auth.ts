export interface NctUser {
  id: string | number
  name: string
  email: string
  avatar?: string
  role?: string
  permissions?: Record<string, string[]> // For model/action authorization matrices
}
