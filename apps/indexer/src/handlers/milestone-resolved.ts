import { publicClient, indexerEnv } from "../lib/client.js";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { updateCursor } from "../lib/cursor.js";
import type { MilestoneResolvedArgs } from "../types.js";

export async function handleMilestoneResolved(args: {
  contract: `0x${string}`;
  blockNumber: bigint;
  txHash: `0x${string}`;
  args: MilestoneResolvedArgs;
}) {
  const { contract, blockNumber, txHash, args: eventArgs } = args;
  const { milestoneIndex, passed, weightYes, weightNo } = eventArgs;

  const currentBlock = await publicClient.getBlockNumber();
  if (currentBlock - blockNumber < indexerEnv.INDEXER_CONFIRMATIONS) {
    logger.debug(
      { contract, txHash, currentBlock, eventBlock: blockNumber },
      "MilestoneResolved: waiting for confirmations"
    );
    return false;
  }

  const project = await prisma.project.findFirst({
    where: { escrowAddress: contract.toLowerCase() },
    select: { id: true },
  });
  if (!project) {
    logger.warn({ contract }, "MilestoneResolved: project not found for escrow");
    return false;
  }

  await prisma.$transaction(async (tx) => {
    await tx.milestone.updateMany({
      where: {
        projectId: project.id,
        index: Number(milestoneIndex),
      },
      data: {
        status: passed ? "PASSED" : "FAILED",
        weightYes,
        weightNo,
        passed,
      },
    });

    const projectBackers = await tx.contribution.findMany({
      where: { projectId: project.id },
      include: { backer: { select: { email: true, name: true } } },
      distinct: ["backerId"],
    });

    const emailRows = projectBackers
      .filter((c) => c.backer)
      .map((c) => ({
        to: c.backer!.email,
        template: "MILESTONE_VOTE_OUTCOME" as const,
        payload: {
          projectId: project.id,
          milestoneIndex: Number(milestoneIndex),
          passed,
          name: c.backer!.name ?? c.backer!.email,
        },
        status: "QUEUED" as const,
      }));

    if (emailRows.length > 0) {
      await tx.emailNotification.createMany({ data: emailRows });
    }

    await updateCursor(tx, contract, "MilestoneResolved", blockNumber);
  });

  logger.info(
    { projectId: project.id, milestoneIndex, passed, txHash },
    "MilestoneResolved: indexed"
  );
  return true;
}