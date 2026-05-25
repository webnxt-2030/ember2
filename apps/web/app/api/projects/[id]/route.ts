import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { assertOwnsOrg } from '@/lib/auth/permissions'
import { okResponse, errorResponse } from '@/lib/api-response'
import { ValidationError, NotFoundError, ConflictError } from '@/lib/errors'
import { prisma } from '@/lib/db'
import { milestoneBpsSchema, slugSchema } from '@ember/shared'
import { z } from 'zod'

export const runtime = 'nodejs'

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

// Fields editable on DRAFT (full edit)
const draftEditSchema = z.object({
  slug: slugSchema.optional(),
  title: z.string().min(2).max(200).optional(),
  summary: z.string().min(10).max(500).optional(),
  description: z.string().max(50000).optional(),
  pictures: z.array(z.string().url()).max(10).optional(),
  socialLinks: z
    .object({
      twitter: z.string().url().optional().nullable(),
      github: z.string().url().optional().nullable(),
      website: z.string().url().optional().nullable(),
    })
    .optional(),
  backingLinks: z.array(z.string().url()).max(5).optional(),
  targetAmount: z.string().regex(/^\d+(\.\d{1,6})?$/).optional(),
  fundingDeadline: z.string().datetime().optional().nullable(),
  votingPeriodDays: z.number().int().min(3).max(30).optional(),
  rewardCurveType: z.enum(['LINEAR', 'EXPONENTIAL', 'BINARY', 'CUSTOM']).optional(),
  milestoneBps: milestoneBpsSchema.optional(),
  // Milestone metadata edits (array index = milestone index)
  milestones: z
    .array(
      z.object({
        index: z.number().int().nonnegative(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(5000).optional(),
        deliverableDate: z.string().datetime().optional().nullable(),
      }),
    )
    .optional(),
})

// Fields editable on LIVE (limited)
const liveEditSchema = z.object({
  description: z.string().max(50000).optional(),
  pictures: z.array(z.string().url()).max(10).optional(),
  socialLinks: z
    .object({
      twitter: z.string().url().optional().nullable(),
      github: z.string().url().optional().nullable(),
      website: z.string().url().optional().nullable(),
    })
    .optional(),
  backingLinks: z.array(z.string().url()).max(5).optional(),
  // Milestone edits on LIVE: only description + deliverableDate
  milestones: z
    .array(
      z.object({
        index: z.number().int().nonnegative(),
        description: z.string().max(5000).optional(),
        deliverableDate: z.string().datetime().optional().nullable(),
      }),
    )
    .optional(),
})

type OrgMemberWithUser = { user: { email: string; name: string | null } }

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return errorResponse(new ValidationError('Invalid JSON'), req)
  }

  // Fetch project with milestones and org members (for email queuing)
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      milestones: true,
      organization: {
        include: {
          members: {
            include: {
              user: { select: { email: true, name: true } },
            },
          },
        },
      },
    },
  })

  if (!project) {
    return errorResponse(new NotFoundError('Project'), req)
  }

  // Auth: must own the org
  try {
    await assertOwnsOrg(session, project.organizationId, prisma)
  } catch (err) {
    return errorResponse(err as Error, req)
  }

  // Guard: cannot edit COMPLETED/CANCELLED/PAUSED projects
  if (
    project.status === 'COMPLETED' ||
    project.status === 'CANCELLED' ||
    project.status === 'PAUSED'
  ) {
    return errorResponse(
      new ValidationError(`Cannot edit project in ${project.status} state`),
      req,
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ember.app'
  const projectUrl = `${appUrl}/projects/${project.slug}`

  if (project.status === 'DRAFT') {
    // Full edit
    const parsed = draftEditSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(
        new ValidationError('Validation failed', parsed.error.issues),
        req,
      )
    }
    const data = parsed.data

    // Check slug uniqueness before transaction
    if (data.slug !== undefined && data.slug !== project.slug) {
      const existingSlug = await prisma.project.findUnique({ where: { slug: data.slug } })
      if (existingSlug) {
        return errorResponse(new ConflictError(`Slug "${data.slug}" is already taken`), req)
      }
    }

    await prisma.$transaction(async (tx: TxClient) => {
      // Build project update object from provided fields only
      const projectUpdate: Record<string, unknown> = {}
      if (data.slug !== undefined) projectUpdate.slug = data.slug
      if (data.title !== undefined) projectUpdate.title = data.title
      if (data.summary !== undefined) projectUpdate.summary = data.summary
      if (data.description !== undefined) projectUpdate.description = data.description
      if (data.pictures !== undefined) projectUpdate.pictures = data.pictures
      if (data.socialLinks !== undefined) projectUpdate.socialLinks = data.socialLinks
      if (data.backingLinks !== undefined) projectUpdate.backingLinks = data.backingLinks
      if (data.targetAmount !== undefined) projectUpdate.targetAmount = data.targetAmount
      if (data.fundingDeadline !== undefined)
        projectUpdate.fundingDeadline = data.fundingDeadline
          ? new Date(data.fundingDeadline)
          : null
      if (data.votingPeriodDays !== undefined) projectUpdate.votingPeriodDays = data.votingPeriodDays
      if (data.rewardCurveType !== undefined) projectUpdate.rewardCurveType = data.rewardCurveType
      if (data.milestoneBps !== undefined) projectUpdate.milestoneBps = data.milestoneBps

      if (Object.keys(projectUpdate).length > 0) {
        await tx.project.update({ where: { id }, data: projectUpdate })
      }

      // Update milestones if provided
      if (data.milestones) {
        for (const mEdit of data.milestones) {
          const milestoneUpdate: Record<string, unknown> = {}
          if (mEdit.title !== undefined) milestoneUpdate.title = mEdit.title
          if (mEdit.description !== undefined) milestoneUpdate.description = mEdit.description
          if (mEdit.deliverableDate !== undefined)
            milestoneUpdate.deliverableDate = mEdit.deliverableDate
              ? new Date(mEdit.deliverableDate)
              : null
          if (Object.keys(milestoneUpdate).length > 0) {
            await tx.milestone.update({
              where: { projectId_index: { projectId: id, index: mEdit.index } },
              data: milestoneUpdate,
            })
          }
        }
      }

      await tx.activityLog.create({
        data: {
          actorUserId: session!.user.id,
          type: 'PROJECT_UPDATED',
          targetType: 'Project',
          targetId: id,
          metadata: {
            projectTitle: project.title,
            fieldsUpdated: Object.keys(data),
          },
        },
      })
    })
  } else {
    // LIVE: limited edit
    const parsed = liveEditSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(
        new ValidationError('Validation failed', parsed.error.issues),
        req,
      )
    }
    const data = parsed.data

    // Determine which milestones have changed (description or deliverableDate)
    const changedMilestones: Array<{ index: number; title: string }> = []

    await prisma.$transaction(async (tx: TxClient) => {
      const projectUpdate: Record<string, unknown> = {}
      if (data.description !== undefined) projectUpdate.description = data.description
      if (data.pictures !== undefined) projectUpdate.pictures = data.pictures
      if (data.socialLinks !== undefined) projectUpdate.socialLinks = data.socialLinks
      if (data.backingLinks !== undefined) projectUpdate.backingLinks = data.backingLinks

      if (Object.keys(projectUpdate).length > 0) {
        await tx.project.update({ where: { id }, data: projectUpdate })
      }

      // Update milestones on LIVE (only description + deliverableDate)
      if (data.milestones) {
        for (const mEdit of data.milestones) {
          const milestoneUpdate: Record<string, unknown> = {}
          if (mEdit.description !== undefined) milestoneUpdate.description = mEdit.description
          if (mEdit.deliverableDate !== undefined)
            milestoneUpdate.deliverableDate = mEdit.deliverableDate
              ? new Date(mEdit.deliverableDate)
              : null

          if (Object.keys(milestoneUpdate).length > 0) {
            await tx.milestone.update({
              where: { projectId_index: { projectId: id, index: mEdit.index } },
              data: milestoneUpdate,
            })

            // Find the milestone title for the email payload
            const existing = project.milestones.find((m: { index: number; title: string }) => m.index === mEdit.index)
            changedMilestones.push({
              index: mEdit.index,
              title: existing?.title ?? `Milestone ${mEdit.index + 1}`,
            })
          }
        }
      }

      await tx.activityLog.create({
        data: {
          actorUserId: session!.user.id,
          type: 'PROJECT_UPDATED',
          targetType: 'Project',
          targetId: id,
          metadata: {
            projectTitle: project.title,
            fieldsUpdated: Object.keys(data),
          },
        },
      })
    })

    // Queue MILESTONE_UPDATED emails for each changed milestone
    if (changedMilestones.length > 0) {
      const orgMembers = project.organization.members as OrgMemberWithUser[]
      const emailRows = orgMembers.flatMap((member) =>
        changedMilestones.map((m: { index: number; title: string }) => ({
          to: member.user.email,
          template: 'MILESTONE_UPDATED' as const,
          payload: {
            name: member.user.name ?? member.user.email,
            projectName: project.title,
            milestoneTitle: m.title,
            projectUrl,
          },
          status: 'QUEUED' as const,
        })),
      )

      if (emailRows.length > 0) {
        await prisma.emailNotification.createMany({ data: emailRows })
      }
    }
  }

  const updated = await prisma.project.findUnique({
    where: { id },
    select: { id: true, status: true, updatedAt: true },
  })

  return okResponse({ id: updated!.id, status: updated!.status, updatedAt: updated!.updatedAt })
}
