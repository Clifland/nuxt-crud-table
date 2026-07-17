import type { NctAuthStrategy } from '../shared/types/auth-strategy'
import { sanctumStrategy } from './strategies/sanctum'
import { fastapiStrategy } from './strategies/fastapi'
import { fortifyStrategy } from './strategies/fortify'
import { nuxtAuthUtilsStrategy } from './strategies/nuxt-auth-utils'

export const nctAuthStrategies: Record<string, NctAuthStrategy> = {
  'sanctum': sanctumStrategy,
  'fastapi': fastapiStrategy,
  'fortify': fortifyStrategy,
  'nuxt-auth-utils': nuxtAuthUtilsStrategy,
}

/**
 * Registers an additional (or overriding) auth strategy under `name`, so a
 * host app can support a backend nct doesn't ship a strategy for -- without
 * forking the module. Call from a Nuxt plugin, before any component calls
 * `useNctAuth()`.
 */
export function registerNctAuthStrategy(name: string, strategy: NctAuthStrategy): void {
  nctAuthStrategies[name] = strategy
}