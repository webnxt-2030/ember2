import type { NextRequest } from 'next/server'
import { createPublicClient, http, decodeEventLog } from 'viem'
import { ProjectFactoryAbi } from '@ember/shared'
import { getSession } from '@/lib/auth/session'
import { assertOwnsOrg } from '@/lib/auth/permissions'
import { okResponse, errorResponse } from '@/lib/api-response'
import { NotFoundError, ValidationError, AuthError } from '@/lib/errors'
import { prisma } from '@/lib/db'
import { z } from 'zod'

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

export const runtime = 'nodejs'
export const maxDuration = 120 // 2-minute function timeout for waiting confirmations

const confirmSchema = z.object({
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/, 'Invalid tx hash'),
})

const chainId = Number(process.env.NEXT_PUBLIC_MORPH_CHAIN_ID) || 2818

// Morph L2 chain (not in viem built-ins)
const morphChain = {
<<<<<<< HEAD
  id: chainId,
  name: 'Morph L2',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_MORPH_RPC_URL ?? 'https://rpc-hoodi.morph.network'] as readonly [string, ...string[]] },
  },
} as const

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return errorResponse(new ValidationError('Invalid JSON'), req)
  }

  const parsed = confirmSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(new ValidationError('Validation failed', parsed.error.issues), req)
  }
  const { txHash } = parsed.data

  const project = await prisma.project.findUnique({
    where: { id },
    include: { organization: true },
  })
  if (!project) return errorResponse(new NotFoundError('Project not found'), req)

  // Auth
  try {
    await assertOwnsOrg(session, project.organizationId, prisma)
  } catch (err) {
    return errorResponse(err, req)
  }
  if (!session) {
    return errorResponse(new AuthError(), req)
  }

  // Idempotency: if already LIVE and escrow already set, return success
  if (project.status === 'LIVE' && project.escrowAddress) {
    return okResponse({
      projectId: project.id,
      status: 'LIVE',
      escrowAddress: project.escrowAddress,
      nftAddress: project.nftAddress,
    })
  }

  if (project.status !== 'DRAFT') {
    return errorResponse(new ValidationError(`Project is ${project.status}, cannot confirm publish`), req)
  }

  // Wait for 12 confirmations
  const client = createPublicClient({
    chain: morphChain,
<<<<<<< HEAD
    transport: http(process.env.NEXT_PUBLIC_MORPH_RPC_URL ?? 'https://rpc-hoodi.morph.network'),
  })

  let receipt: Awaited<ReturnType<typeof client.waitForTransactionReceipt>>
  try {
    receipt = await client.waitForTransactionReceipt({
      hash: txHash as `0x${string}`,
      confirmations: 12,
      timeout: 110_000, // just under maxDuration
    })
  } catch (err) {
    return errorResponse(new ValidationError(`Transaction not confirmed: ${String(err)}`), req)
  }

  if (receipt.status !== 'success') {
    return errorResponse(new ValidationError('Transaction reverted'), req)
  }

  // Parse ProjectCreated event from receipt logs
  let escrowAddress: string | null = null
  let nftAddress: string | null = null
  let onChainId: string | null = null

  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: ProjectFactoryAbi,
        eventName: 'ProjectCreated',
        topics: log.topics,
        data: log.data,
      })
      const args = decoded.args as { projectId: bigint; escrow: string; nft: string }
      onChainId = args.projectId.toString()
      escrowAddress = args.escrow
      nftAddress = args.nft
      break
    } catch {
      // Not a ProjectCreated log, skip
    }
  }

  if (!escrowAddress || !nftAddress || !onChainId) {
    return errorResponse(new ValidationError('ProjectCreated event not found in transaction logs'), req)
  }

  // Persist + flip status — idempotent by txHash (if already done, this is a no-op due to WHERE clause)
  await prisma.$transaction(async (tx: TxClient) => {
    await tx.project.update({
      where: { id, status: 'DRAFT' }, // WHERE status='DRAFT' makes this idempotent
      data: {
        onChainId,
        escrowAddress,
        nftAddress,
        status: 'LIVE',
        publishedAt: new Date(),
      },
    })

    await tx.activityLog.create({
      data: {
        actorUserId: session.user.id,
        type: 'PROJECT_PUBLISHED',
        targetType: 'Project',
        targetId: id,
        metadata: { txHash, onChainId, escrowAddress, nftAddress, orgId: project.organizationId },
      },
    })
  }).catch((err: unknown) => {
    // If update matched 0 rows (project already LIVE), that's OK — idempotent
    const e = err as { code?: string; meta?: { cause?: string } }
    if (e.meta?.cause?.includes('0 rows')) return
    throw err
  })

  return okResponse({
    projectId: id,
    status: 'LIVE',
    escrowAddress,
    nftAddress,
  })
}
