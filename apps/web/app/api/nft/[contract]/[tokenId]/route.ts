import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { errorResponse } from '@/lib/api-response'
import { NotFoundError } from '@/lib/errors'
import { addressSchema } from '@ember/shared'
import { z } from 'zod'

const paramsSchema = z.object({
  contract: addressSchema,
  tokenId: z.string().regex(/^\d+$/, 'Token ID must be a decimal string'),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ contract: string; tokenId: string }> },
) {
  const { contract, tokenId } = await params

  const parsed = paramsSchema.safeParse({ contract, tokenId })
  if (!parsed.success) {
    return errorResponse(new NotFoundError('NFT'), _req)
  }

  const contribution = await prisma.contribution.findFirst({
    where: {
      nftContract: parsed.data.contract.toLowerCase(),
      nftTokenId: parsed.data.tokenId,
    },
    include: { project: { select: { id: true, slug: true, title: true, pictures: true } } },
  })

  if (!contribution) {
    return errorResponse(new NotFoundError('NFT'), _req)
  }

  const amount = parseFloat(contribution.amount.toString())
  const m0Share = parseFloat(contribution.m0Share.toString())
  const allocatedRemaining = amount - m0Share

  const metadata = {
    name: `Ember Position #${contribution.nftTokenId}`,
    description: `Position in ${contribution.project.title}. Contributed ${amount.toFixed(2)} USDT.`,
    image: contribution.project.pictures[0] ?? '',
    attributes: [
      { trait_type: 'Project', value: contribution.project.title },
      { trait_type: 'Project ID', value: contribution.project.id },
      { trait_type: 'Amount', value: amount.toFixed(6), display_type: 'number' },
      { trait_type: 'M0 Share', value: m0Share.toFixed(6), display_type: 'number' },
      { trait_type: 'Allocated Remaining', value: allocatedRemaining.toFixed(6), display_type: 'number' },
      { trait_type: 'Contributed At', value: contribution.contributedAt.toISOString() },
    ],
    projectId: contribution.project.id,
    projectSlug: contribution.project.slug,
    amount: contribution.amount.toString(),
    contributedAt: contribution.contributedAt.toISOString(),
    m0Share: contribution.m0Share.toString(),
    allocatedRemaining: allocatedRemaining.toFixed(6),
  }

  return NextResponse.json(metadata, {
    status: 200,
    headers: { 'Cache-Control': 'public, max-age=60' },
  })
}
