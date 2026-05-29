import { publicClient, indexerEnv } from "../lib/client.js";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { updateCursor } from "../lib/cursor.js";
import { addEscrowWatcher, backfillEscrow } from "../watchers/escrow.js";
import type { ProjectCreatedArgs } from "../types.js";

const escrowEventNames = [
  "Contributed",
  "Voted",
  "MilestoneSubmitted",
  "MilestoneResolved",
  "MilestoneClaimed",
] as const;

async function initEscrowCursors(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  escrowAddress: `0x${string}`,
  blockNumber: bigint
) {
  for (const eventName of escrowEventNames) {
    const existing = await tx.indexerCursor.findUnique({
      where: {
        contract_eventName: {
          contract: escrowAddress.toLowerCase(),
          eventName,
        },
      },
    });
    if (!existing) {
      await tx.indexerCursor.create({
        data: {
          contract: escrowAddress.toLowerCase(),
          eventName,
          lastBlock: blockNumber,
        },
      });
    }
  }
}

export async function handleProjectCreated(args: {
  contract: `0x${string}`;
  blockNumber: bigint;
  txHash: `0x${string}`;
  logIndex: number;
  args: ProjectCreatedArgs;
}) {
  const { contract, blockNumber, txHash, args: eventArgs } = args;
  const { projectId, escrow, nft } = eventArgs;

  const currentBlock = await publicClient.getBlockNumber();
  if (currentBlock - blockNumber < indexerEnv.INDEXER_CONFIRMATIONS) {
    logger.debug(
      { contract, txHash, currentBlock, eventBlock: blockNumber },
      "ProjectCreated: waiting for confirmations"
    );
    return false;
  }

  await prisma.$transaction(async (tx) => {
    await tx.project.updateMany({
      where: { onChainId: projectId.toString() },
      data: {
        escrowAddress: escrow.toLowerCase(),
        nftAddress: nft.toLowerCase(),
        status: "LIVE",
        publishedAt: new Date(),
      },
    });

    await updateCursor(tx, contract, "ProjectCreated", blockNumber);
    await initEscrowCursors(tx, escrow, blockNumber);
  });

  addEscrowWatcher(escrow);
  await backfillEscrow(escrow);

  logger.info(
    { projectId, escrow, nft, txHash },
    "ProjectCreated: indexed"
  );
  return true;
}