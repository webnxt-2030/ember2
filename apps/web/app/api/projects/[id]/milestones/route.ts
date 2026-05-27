import type { NextRequest } from 'next/server'
import { okResponse, errorResponse } from '@/lib/api-response'
import { NotFoundError } from '@/lib/errors'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true },
  })

  if (!project) {
    return errorResponse(new NotFoundError('Project'), req)
  }

  const milestones = await prisma.milestone.findMany({
    where: { projectId: id },
    orderBy: { index: 'asc' },
    select: {
      id: true,
      index: true,
      title: true,
      description: true,
      deliverableDate: true,
      bps: true,
      status: true,
      updateUri: true,
      voteStartAt: true,
      voteEndAt: true,
      weightYes: true,
      weightNo: true,
      passed: true,
      claimedAt: true,
    },
  })

  return okResponse(
    milestones.map((m) => ({
      id: m.id,
      index: m.index,
      title: m.title,
      description: m.description,
      deliverableDate: m.deliverableDate?.toISOString() ?? null,
      bps: m.bps,
      status: m.status,
      updateUri: m.updateUri ?? null,
      voteStartAt: m.voteStartAt?.toISOString() ?? null,
      voteEndAt: m.voteEndAt?.toISOString() ?? null,
      weightYes: m.weightYes.toString(),
      weightNo: m.weightNo.toString(),
      passed: m.passed ?? null,
      claimedAt: m.claimedAt?.toISOString() ?? null,
    })),
  )
}
