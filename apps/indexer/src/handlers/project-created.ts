import { publicClient, indexerEnv } from "../lib/client.js";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { updateCursor } from "../lib/cursor.js";
import type { ProjectCreatedArgs } from "../types.js";

export async function handleProjectCreated(args: {
  contract: `0x${string}`;
  blockNumber: bigint;
  txHash: `0x${string}`;
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
      where: { id: Number(projectId).toString() },
      data: {
        escrowAddress: escrow.toLowerCase(),
        nftAddress: nft.toLowerCase(),
      },
    });

    await updateCursor(tx, contract, "ProjectCreated", blockNumber);
  });

  logger.info(
    { projectId, escrow, nft, txHash },
    "ProjectCreated: indexed"
  );
  return true;
}