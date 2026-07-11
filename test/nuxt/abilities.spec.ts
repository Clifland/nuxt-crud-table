import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NctUser } from '../../src/runtime/shared/types/auth'

// Mutable, hoisted so the '#app' mock factory (which Vitest hoists above
// imports) can read/write it, letting each test control whether auth is
// "enabled" without re-mocking per test.
const { authState } = vi.hoisted(() => ({
  authState: { value: false as false | { authentication: string } },
}))

vi.mock('#app', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#app')>()
  return {
    ...actual,
    useRuntimeConfig: () => ({ public: { crudTable: { auth: authState.value } } }),
  }
})

const {
  nctIsAuthEnabled,
  nctIsAdmin,
  nctIsOwner,
  nctHasPermission,
  nctHasRowPermission,
  nctIsAllowedToSeeResourceMenu,
} = await import('../../src/runtime/app/utils/abilities')

function makeUser(overrides: Partial<NctUser> = {}): NctUser {
  return { id: 1, name: 'Cliford', email: 'cliford@clifland.com', ...overrides }
}

describe('abilities', () => {
  beforeEach(() => {
    authState.value = false
  })

  describe('nctIsAuthEnabled', () => {
    it('is false when auth is disabled (false)', () => {
      authState.value = false
      expect(nctIsAuthEnabled()).toBe(false)
    })

    it('is true when auth is a truthy config object', () => {
      authState.value = { authentication: 'sanctum' }
      expect(nctIsAuthEnabled()).toBe(true)
    })
  })

  describe('nctIsAdmin', () => {
    it('is false for a null/undefined user', () => {
      expect(nctIsAdmin(null)).toBe(false)
      expect(nctIsAdmin(undefined)).toBe(false)
    })

    it('is false for a user with a non-admin role', () => {
      expect(nctIsAdmin(makeUser({ role: 'editor' }))).toBe(false)
    })

    it('is false for a user with no role at all', () => {
      expect(nctIsAdmin(makeUser())).toBe(false)
    })

    it('is true only when role is exactly "admin"', () => {
      expect(nctIsAdmin(makeUser({ role: 'admin' }))).toBe(true)
    })
  })

  describe('nctIsOwner', () => {
    it('is false when user is null/undefined', () => {
      expect(nctIsOwner(null, { createdBy: 1 })).toBe(false)
    })

    it('is false when record is undefined', () => {
      expect(nctIsOwner(makeUser({ id: 1 }), undefined)).toBe(false)
    })

    it('is true when user.id matches record[createdBy] (default ownerKey)', () => {
      expect(nctIsOwner(makeUser({ id: 1 }), { createdBy: 1 })).toBe(true)
    })

    it('is false when user.id does not match record[createdBy]', () => {
      expect(nctIsOwner(makeUser({ id: 1 }), { createdBy: 2 })).toBe(false)
    })

    it('respects a custom ownerKey', () => {
      expect(nctIsOwner(makeUser({ id: 5 }), { authorId: 5 }, 'authorId')).toBe(true)
      expect(nctIsOwner(makeUser({ id: 5 }), { createdBy: 5 }, 'authorId')).toBe(false)
    })

    it('coerces both sides through Number(), so a string id matches a numeric column and vice versa', () => {
      expect(nctIsOwner(makeUser({ id: '7' }), { createdBy: 7 })).toBe(true)
      expect(nctIsOwner(makeUser({ id: 7 }), { createdBy: '7' })).toBe(true)
    })

    it('documents that a user with id 0 can never be treated as an owner', () => {
      // `!user?.id` treats 0 as "no id", so this returns false even though
      // record.createdBy === 0 === user.id numerically. Only matters for
      // backends using 0 as a valid primary key (uncommon, but worth knowing).
      expect(nctIsOwner(makeUser({ id: 0 }), { createdBy: 0 })).toBe(false)
    })
  })

  describe('nctHasPermission', () => {
    it('is always true when auth is disabled, regardless of user/model/action', () => {
      authState.value = false
      expect(nctHasPermission(null, 'users', 'delete')).toBe(true)
    })

    describe('with auth enabled', () => {
      beforeEach(() => {
        authState.value = { authentication: 'sanctum' }
      })

      it('is true for an admin regardless of their permissions map', () => {
        const admin = makeUser({ role: 'admin' })
        expect(nctHasPermission(admin, 'users', 'delete')).toBe(true)
      })

      it('is false when there is no user', () => {
        expect(nctHasPermission(null, 'users', 'list')).toBe(false)
        expect(nctHasPermission(undefined, 'users', 'list')).toBe(false)
      })

      it('is true when the user has the exact action listed for that model', () => {
        const user = makeUser({ permissions: { users: ['list', 'create'] } })
        expect(nctHasPermission(user, 'users', 'create')).toBe(true)
      })

      it('is false when the user lacks that specific action for the model', () => {
        const user = makeUser({ permissions: { users: ['list'] } })
        expect(nctHasPermission(user, 'users', 'delete')).toBe(false)
      })

      it('is false when the user has permissions for a different model entirely', () => {
        const user = makeUser({ permissions: { posts: ['list', 'create'] } })
        expect(nctHasPermission(user, 'users', 'list')).toBe(false)
      })

      it('is false when the user has no permissions map at all', () => {
        expect(nctHasPermission(makeUser(), 'users', 'list')).toBe(false)
      })
    })
  })

  describe('nctHasRowPermission', () => {
    it('is always true when auth is disabled', () => {
      authState.value = false
      expect(nctHasRowPermission(null, 'orders', 'update', { createdBy: 99 })).toBe(true)
    })

    describe('with auth enabled', () => {
      beforeEach(() => {
        authState.value = { authentication: 'sanctum' }
      })

      it('is true when the user has the global (non-"_own") permission, regardless of ownership', () => {
        const user = makeUser({ id: 1, permissions: { orders: ['update'] } })
        expect(nctHasRowPermission(user, 'orders', 'update', { createdBy: 999 })).toBe(true)
      })

      it('is true when the user only has the "_own" permission AND owns the record', () => {
        const user = makeUser({ id: 1, permissions: { orders: ['update_own'] } })
        expect(nctHasRowPermission(user, 'orders', 'update', { createdBy: 1 })).toBe(true)
      })

      it('is false when the user has "_own" permission but does not own the record', () => {
        const user = makeUser({ id: 1, permissions: { orders: ['update_own'] } })
        expect(nctHasRowPermission(user, 'orders', 'update', { createdBy: 2 })).toBe(false)
      })

      it('is false when the user has neither the global nor the "_own" permission', () => {
        const user = makeUser({ id: 1, permissions: { orders: ['list'] } })
        expect(nctHasRowPermission(user, 'orders', 'update', { createdBy: 1 })).toBe(false)
      })

      it('respects the "_own" naming convention literally — a differently-named ownership permission does not unlock it', () => {
        // documents the implicit contract: ownership fallback only fires for
        // a permission string literally equal to `${action}_own`.
        const user = makeUser({ id: 1, permissions: { orders: ['update-own', 'own_update'] } })
        expect(nctHasRowPermission(user, 'orders', 'update', { createdBy: 1 })).toBe(false)
      })
    })
  })

  describe('nctIsAllowedToSeeResourceMenu', () => {
    it('is always true when auth is disabled', () => {
      authState.value = false
      expect(nctIsAllowedToSeeResourceMenu(null, 'orders')).toBe(true)
    })

    describe('with auth enabled', () => {
      beforeEach(() => {
        authState.value = { authentication: 'sanctum' }
      })

      it('is true if the user has "list"', () => {
        const user = makeUser({ permissions: { orders: ['list'] } })
        expect(nctIsAllowedToSeeResourceMenu(user, 'orders')).toBe(true)
      })

      it('is true if the user has "list_all" instead of "list"', () => {
        const user = makeUser({ permissions: { orders: ['list_all'] } })
        expect(nctIsAllowedToSeeResourceMenu(user, 'orders')).toBe(true)
      })

      it('is true if the user has "list_own" instead of "list"', () => {
        const user = makeUser({ permissions: { orders: ['list_own'] } })
        expect(nctIsAllowedToSeeResourceMenu(user, 'orders')).toBe(true)
      })

      it('is false if the user has none of the three list variants', () => {
        const user = makeUser({ permissions: { orders: ['create', 'delete'] } })
        expect(nctIsAllowedToSeeResourceMenu(user, 'orders')).toBe(false)
      })

      it('is true for an admin even with no explicit permissions map', () => {
        const admin = makeUser({ role: 'admin' })
        expect(nctIsAllowedToSeeResourceMenu(admin, 'orders')).toBe(true)
      })
    })
  })
})