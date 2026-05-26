import { publicClient, indexerEnv } from "../lib/client.js";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { updateCursor } from "../lib/cursor.js";
import type { VotedArgs } from "../types.js";

export async function handleVoted(args: {
  contract: `0x${string}`;
  blockNumber: bigint;
  txHash: `0x${string}`;
  logIndex: number;
  args: VotedArgs;
}) {
  const { contract, blockNumber, txHash, logIndex, args: eventArgs } = args;
  const { milestoneIndex, voter, yes, weight } = eventArgs;

  const currentBlock = await publicClient.getBlockNumber();
  if (currentBlock - blockNumber < indexerEnv.INDEXER_CONFIRMATIONS) {
    logger.debug(
      { contract, txHash, currentBlock, eventBlock: blockNumber },
      "Voted: waiting for confirmations"
    );
    return false;
  }

  const project = await prisma.project.findFirst({
    where: { escrowAddress: contract.toLowerCase() },
    select: { id: true },
  });
  if (!project) {
    logger.warn({ contract }, "Voted: project not found for escrow");
    return false;
  }

  const milestone = await prisma.milestone.findUnique({
    where: { projectId_index: { projectId: project.id, index: Number(milestoneIndex) } },
    select: { id: true },
  });
  if (!milestone) {
    logger.warn(
      { contract, milestoneIndex },
      "Voted: milestone not found"
    );
    return false;
  }

  await prisma.$transaction(async (tx) => {
    await tx.milestoneVote.upsert({
      where: { txHash_logIndex: { txHash: txHash.toLowerCase(), logIndex } },
      create: {
        milestoneId: milestone.id,
        walletAddress: voter.toLowerCase(),
        choice: yes ? "YES" : "NO",
        weight,
        txHash: txHash.toLowerCase(),
        logIndex,
        votedAt: new Date(),
      },
      update: {},
    });

    await updateCursor(tx, contract, "Voted", blockNumber);
  });

  logger.info(
    { projectId: project.id, milestoneIndex, voter, txHash },
    "Voted: indexed"
  );
  return true;
}