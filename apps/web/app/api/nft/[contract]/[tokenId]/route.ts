import { NextRequest, NextResponse } from 'next/server'
import { getContributionByNft } from '@/lib/db/contributions'
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

  const contribution = await getContributionByNft(
    parsed.data.contract.toLowerCase(),
    parsed.data.tokenId,
  )

  if (!contribution) {
    return errorResponse(new NotFoundError('NFT'), _req)
  }

  const amount = parseFloat(contribution.amount.toString())
  const m0Share = parseFloat(contribution.m0Share.toString())
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ember.app'

  const metadata = {
    name: `Ember Position #${contribution.nftTokenId}`,
    description: `Contribution to ${contribution.project.title} on Ember.`,
    image: `${appUrl}/og/nft/${contract}/${tokenId}`,
    attributes: [
      { trait_type: 'Project', value: contribution.project.slug },
      { trait_type: 'Amount (USDT)', value: amount.toFixed(6) },
      { trait_type: 'M0 Share (USDT)', value: m0Share.toFixed(6) },
      { trait_type: 'Contributed At', value: contribution.contributedAt.toISOString() },
    ],
  }

  return NextResponse.json(metadata, {
    status: 200,
    headers: { 'Cache-Control': 'public, max-age=60' },
  })
}
