import { ForbiddenError, AuthError } from '@/lib/errors'

// The session type Better Auth returns
type Session = {
  user: {
    id: string
    role: string
  }
} | null

type Role = 'BACKER' | 'ORG_OWNER' | 'SUPER_ADMIN'

// Role hierarchy: SUPER_ADMIN > ORG_OWNER > BACKER
const ROLE_RANK: Record<Role, number> = {
  BACKER: 0,
  ORG_OWNER: 1,
  SUPER_ADMIN: 2,
}

/**
 * Asserts the session exists and the user has at least the required role.
 * Throws AuthError if not authenticated, ForbiddenError if insufficient role.
 */
export function assertRole(session: Session, required: Role): asserts session is NonNullable<Session> {
  if (!session?.user) {
    throw new AuthError()
  }
  const userRank = (ROLE_RANK as Record<string, number>)[session.user.role] ?? -1
  const requiredRank = ROLE_RANK[required]
  if (userRank < requiredRank) {
    throw new ForbiddenError(`Requires role ${required}`)
  }
}

/**
 * Asserts the session exists and the user is either a SUPER_ADMIN
 * or an owner of the specified organization.
 */
export async function assertOwnsOrg(
  session: Session,
  orgId: string,
  prisma: { organizationMember: { findFirst(args: unknown): Promise<unknown> } },
): Promise<void> {
  if (!session?.user) {
    throw new AuthError()
  }
  // SUPER_ADMIN can access any org
  if (session.user.role === 'SUPER_ADMIN') return

  const membership = await prisma.organizationMember.findFirst({
    where: { organizationId: orgId, userId: session.user.id },
  })
  if (!membership) {
    throw new ForbiddenError('Not a member of this organization')
  }
}
