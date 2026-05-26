import { publicClient, indexerEnv } from "../lib/client.js";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { updateCursor } from "../lib/cursor.js";
import type { MilestoneClaimedArgs } from "../types.js";

export async function handleMilestoneClaimed(args: {
  contract: `0x${string}`;
  blockNumber: bigint;
  txHash: `0x${string}`;
  logIndex: number;
  args: MilestoneClaimedArgs;
}) {
  const { contract, blockNumber, txHash, args: eventArgs } = args;
  const { milestoneIndex, amount } = eventArgs;

  const currentBlock = await publicClient.getBlockNumber();
  if (currentBlock - blockNumber < indexerEnv.INDEXER_CONFIRMATIONS) {
    logger.debug(
      { contract, txHash, currentBlock, eventBlock: blockNumber },
      "MilestoneClaimed: waiting for confirmations"
    );
    return false;
  }

  const project = await prisma.project.findFirst({
    where: { escrowAddress: contract.toLowerCase() },
    select: { id: true },
  });
  if (!project) {
    logger.warn({ contract }, "MilestoneClaimed: project not found for escrow");
    return false;
  }

  await prisma.$transaction(async (tx) => {
    await tx.milestone.updateMany({
      where: {
        projectId: project.id,
        index: Number(milestoneIndex),
      },
      data: {
        status: "CLAIMED",
        claimedAt: new Date(),
        claimedTxHash: txHash.toLowerCase(),
      },
    });

    const backers = await tx.contribution.findMany({
      where: { projectId: project.id, backerId: { not: null } },
      include: { backer: { select: { email: true, name: true } } },
      distinct: ["backerId"],
    });

    const emailRows = backers
      .filter((c) => c.backer)
      .map((c) => ({
        to: c.backer!.email,
        template: "MILESTONE_CLAIMED" as const,
        payload: {
          projectId: project.id,
          milestoneIndex: Number(milestoneIndex),
          name: c.backer!.name ?? c.backer!.email,
        },
        status: "QUEUED" as const,
      }));

    if (emailRows.length > 0) {
      await tx.emailNotification.createMany({ data: emailRows });
    }

    await updateCursor(tx, contract, "MilestoneClaimed", blockNumber);
  });

  logger.info(
    { projectId: project.id, milestoneIndex, amount, txHash },
    "MilestoneClaimed: indexed"
  );
  return true;
}