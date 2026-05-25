import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { assertOwnsOrg } from '@/lib/auth/permissions'
import { okResponse, errorResponse } from '@/lib/api-response'
import { ValidationError, ConflictError } from '@/lib/errors'
import { prisma } from '@/lib/db'
import { milestoneBpsSchema, slugSchema } from '@ember/shared'
import { z } from 'zod'

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

const milestoneInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000),
  deliverableDate: z.string().datetime().optional(),
})

const createProjectSchema = z.object({
  organizationId: z.string().cuid(),
  slug: slugSchema,
  title: z.string().min(2).max(200),
  summary: z.string().min(10).max(500),
  description: z.string().max(50000),
  pictures: z.array(z.string().url()).max(10).default([]),
  socialLinks: z
    .object({
      twitter: z.string().url().optional(),
      github: z.string().url().optional(),
      website: z.string().url().optional(),
    })
    .default({}),
  backingLinks: z.array(z.string().url()).max(5).default([]),
  targetAmount: z.string().regex(/^\d+(\.\d{1,6})?$/, 'Invalid USDT amount'),
  fundingDeadline: z.string().datetime().optional(),
  votingPeriodDays: z.number().int().min(3).max(30).default(7),
  rewardCurveType: z
    .enum(['LINEAR', 'EXPONENTIAL', 'BINARY', 'CUSTOM'])
    .default('LINEAR'),
  milestoneBps: milestoneBpsSchema,
  milestones: z.array(milestoneInputSchema).min(2).max(20),
})

export async function POST(req: NextRequest) {
  const session = await getSession()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return errorResponse(new ValidationError('Invalid JSON'), req)
  }

  const parsed = createProjectSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(
      new ValidationError('Validation failed', parsed.error.issues),
      req,
    )
  }

  const data = parsed.data

  if (data.milestones.length !== data.milestoneBps.length) {
    return errorResponse(
      new ValidationError(
        'milestones and milestoneBps must have the same length',
      ),
      req,
    )
  }

  try {
    await assertOwnsOrg(session, data.organizationId, prisma)
  } catch (err) {
    return errorResponse(err as Error, req)
  }

  const existing = await prisma.project.findUnique({
    where: { slug: data.slug },
  })
  if (existing) {
    return errorResponse(
      new ConflictError(`Slug "${data.slug}" is taken`),
      req,
    )
  }

  const project = await prisma.$transaction(async (tx: TxClient) => {
    const proj = await tx.project.create({
      data: {
        organizationId: data.organizationId,
        slug: data.slug,
        title: data.title,
        summary: data.summary,
        description: data.description,
        pictures: data.pictures,
        socialLinks: data.socialLinks,
        backingLinks: data.backingLinks,
        targetAmount: data.targetAmount,
        fundingDeadline: data.fundingDeadline
          ? new Date(data.fundingDeadline)
          : null,
        votingPeriodDays: data.votingPeriodDays,
        rewardCurveType: data.rewardCurveType,
        milestoneBps: data.milestoneBps,
        status: 'DRAFT',
      },
    })

    await tx.milestone.createMany({
      data: data.milestones.map((m, i) => ({
        projectId: proj.id,
        index: i,
        title: m.title,
        description: m.description,
        deliverableDate: m.deliverableDate
          ? new Date(m.deliverableDate)
          : null,
        bps: data.milestoneBps[i],
      })),
    })

    await tx.activityLog.create({
      data: {
        actorUserId: session!.user.id,
        type: 'PROJECT_CREATED',
        targetType: 'Project',
        targetId: proj.id,
        metadata: {
          projectTitle: proj.title,
          orgId: data.organizationId,
        },
      },
    })

    return proj
  })

  return okResponse(
    { project: { id: project.id, slug: project.slug, status: project.status } },
    201,
  )
}
