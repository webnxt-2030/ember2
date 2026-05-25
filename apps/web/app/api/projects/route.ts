import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { assertOwnsOrg } from '@/lib/auth/permissions'
import { okResponse, errorResponse } from '@/lib/api-response'
import { ValidationError, ConflictError } from '@/lib/errors'
import { prisma } from '@/lib/db'
import { milestoneBpsSchema, slugSchema, paginationSchema } from '@ember/shared'
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
        bps: data.milestoneBps[i] as number,
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

// ─── GET /api/projects ────────────────────────────────────────────────────────

const listQuerySchema = z.object({
  q: z.string().max(200).optional(),
  status: z.enum(['DRAFT', 'LIVE', 'COMPLETED', 'PAUSED', 'CANCELLED']).optional(),
  orgId: z.string().cuid().optional(),
  category: z.string().max(100).optional(),
  minRaise: z.coerce.number().positive().optional(),
  maxRaise: z.coerce.number().positive().optional(),
  ...paginationSchema.shape,
})

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  const raw = {
    q: searchParams.get('q') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    orgId: searchParams.get('orgId') ?? undefined,
    category: searchParams.get('category') ?? undefined,
    minRaise: searchParams.get('minRaise') ?? undefined,
    maxRaise: searchParams.get('maxRaise') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    pageSize: searchParams.get('pageSize') ?? undefined,
  }

  const parsed = listQuerySchema.safeParse(raw)
  if (!parsed.success) {
    return errorResponse(new ValidationError('Invalid query params', parsed.error.issues), req)
  }

  const { q, status, orgId, category, minRaise, maxRaise, page, pageSize } = parsed.data

  // Build where clause
  interface ProjectFilter {
    status?: 'DRAFT' | 'LIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED'
    organizationId?: string
    OR?: Array<{ title?: { contains: string; mode?: 'insensitive' }; summary?: { contains: string; mode?: 'insensitive' } }>
    organization?: { title?: { contains: string; mode?: 'insensitive' } }
    targetAmount?: { gte?: number; lte?: number }
  }
  const where: ProjectFilter = {}

  // Default to LIVE unless a status is explicitly specified
  if (status) {
    where.status = status
  } else {
    where.status = 'LIVE'
  }

  if (orgId) {
    where.organizationId = orgId
  }

  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { summary: { contains: q, mode: 'insensitive' } },
    ]
  }

  if (category) {
    where.organization = {
      title: { contains: category, mode: 'insensitive' },
    }
  }

  if (minRaise !== undefined || maxRaise !== undefined) {
    where.targetAmount = {}
    if (minRaise !== undefined) {
      where.targetAmount.gte = minRaise
    }
    if (maxRaise !== undefined) {
      where.targetAmount.lte = maxRaise
    }
  }

  const skip = (page - 1) * pageSize

  const [projects, totalCount] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { publishedAt: 'desc' },
      include: {
        organization: {
          select: {
            id: true,
            slug: true,
            title: true,
            logoUrl: true,
            verifiedStatus: true,
          },
        },
        milestones: { select: { id: true } },
        contributions: { select: { id: true } },
      },
    }),
    prisma.project.count({ where }),
  ])

  const totalPages = Math.ceil(totalCount / pageSize)

  return okResponse({
    projects: projects.map((p: typeof projects[number]) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      summary: p.summary,
      pictures: p.pictures,
      targetAmount: p.targetAmount.toString(),
      totalRaised: p.totalRaised.toString(),
      status: p.status,
      fundingDeadline: p.fundingDeadline?.toISOString() ?? null,
      rewardCurveType: p.rewardCurveType,
      organization: p.organization,
      milestoneCount: p.milestones.length,
      backersCount: p.contributions.length,
    })),
    pagination: {
      page,
      pageSize,
      totalPages,
      totalCount,
    },
  })
}
