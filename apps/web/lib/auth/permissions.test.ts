import { describe, it, expect, vi } from 'vitest'
import { assertRole, assertOwnsOrg } from './permissions'
import { AuthError, ForbiddenError } from '@/lib/errors'

const makeSession = (role: string) => ({ user: { id: 'user-1', role } })

describe('assertRole', () => {
  it('throws AuthError when session is null', () => {
    expect(() => assertRole(null, 'BACKER')).toThrow(AuthError)
  })

  it('throws AuthError when session.user is missing', () => {
    expect(() => assertRole({ user: null } as any, 'BACKER')).toThrow(AuthError)
  })

  it('passes for BACKER requiring BACKER', () => {
    expect(() => assertRole(makeSession('BACKER'), 'BACKER')).not.toThrow()
  })

  it('throws ForbiddenError for BACKER requiring ORG_OWNER', () => {
    expect(() => assertRole(makeSession('BACKER'), 'ORG_OWNER')).toThrow(ForbiddenError)
  })

  it('throws ForbiddenError for BACKER requiring SUPER_ADMIN', () => {
    expect(() => assertRole(makeSession('BACKER'), 'SUPER_ADMIN')).toThrow(ForbiddenError)
  })

  it('passes for ORG_OWNER requiring BACKER', () => {
    expect(() => assertRole(makeSession('ORG_OWNER'), 'BACKER')).not.toThrow()
  })

  it('passes for ORG_OWNER requiring ORG_OWNER', () => {
    expect(() => assertRole(makeSession('ORG_OWNER'), 'ORG_OWNER')).not.toThrow()
  })

  it('throws ForbiddenError for ORG_OWNER requiring SUPER_ADMIN', () => {
    expect(() => assertRole(makeSession('ORG_OWNER'), 'SUPER_ADMIN')).toThrow(ForbiddenError)
  })

  it('passes for SUPER_ADMIN requiring any role', () => {
    expect(() => assertRole(makeSession('SUPER_ADMIN'), 'BACKER')).not.toThrow()
    expect(() => assertRole(makeSession('SUPER_ADMIN'), 'ORG_OWNER')).not.toThrow()
    expect(() => assertRole(makeSession('SUPER_ADMIN'), 'SUPER_ADMIN')).not.toThrow()
  })

  it('throws ForbiddenError for unknown role', () => {
    expect(() => assertRole(makeSession('UNKNOWN_ROLE'), 'BACKER')).toThrow(ForbiddenError)
  })
})

describe('assertOwnsOrg', () => {
  const makePrisma = (found: boolean) => ({
    organizationMember: {
      findFirst: vi.fn().mockResolvedValue(found ? { id: 'mem-1' } : null),
    },
  })

  it('throws AuthError when session is null', async () => {
    await expect(assertOwnsOrg(null, 'org-1', makePrisma(true))).rejects.toThrow(AuthError)
  })

  it('passes for SUPER_ADMIN without DB check', async () => {
    const prisma = makePrisma(false)
    await expect(assertOwnsOrg(makeSession('SUPER_ADMIN'), 'org-1', prisma)).resolves.toBeUndefined()
    expect(prisma.organizationMember.findFirst).not.toHaveBeenCalled()
  })

  it('passes for ORG_OWNER who is a member', async () => {
    await expect(assertOwnsOrg(makeSession('ORG_OWNER'), 'org-1', makePrisma(true))).resolves.toBeUndefined()
  })

  it('throws ForbiddenError for ORG_OWNER not in org', async () => {
    await expect(assertOwnsOrg(makeSession('ORG_OWNER'), 'org-1', makePrisma(false))).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError for BACKER not in org', async () => {
    await expect(assertOwnsOrg(makeSession('BACKER'), 'org-1', makePrisma(false))).rejects.toThrow(ForbiddenError)
  })
})
