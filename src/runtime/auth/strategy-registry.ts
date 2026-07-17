import type { NctAuthStrategy } from '../shared/types/auth-strategy'
import { noneStrategy } from './strategies/none'
import { sanctumStrategy } from './strategies/sanctum'
import { fastapiStrategy } from './strategies/fastapi'
import { fortifyStrategy } from './strategies/fortify'
import { nuxtAuthUtilsStrategy } from './strategies/nuxt-auth-utils'

export const nctAuthStrategies: Record<string, NctAuthStrategy> = {
  'none': noneStrategy,
  'sanctum': sanctumStrategy,
  'fastapi': fastapiStrategy,
  'fortify': fortifyStrategy,
  'nuxt-auth-utils': nuxtAuthUtilsStrategy,
}

export function registerNctAuthStrategy(name: string, strategy: NctAuthStrategy): void {
  nctAuthStrategies[name] = strategy
}