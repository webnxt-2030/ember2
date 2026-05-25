import { publicClient, indexerEnv } from "../lib/client.js";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { updateCursor } from "../lib/cursor.js";
import type { MilestoneSubmittedArgs } from "../types.js";

export async function handleMilestoneSubmitted(args: {
  contract: `0x${string}`;
  blockNumber: bigint;
  txHash: `0x${string}`;
  args: MilestoneSubmittedArgs;
}) {
  const { contract, blockNumber, txHash, args: eventArgs } = args;
  const { milestoneIndex, updateURI, voteEndAt } = eventArgs;

  const currentBlock = await publicClient.getBlockNumber();
  if (currentBlock - blockNumber < indexerEnv.INDEXER_CONFIRMATIONS) {
    logger.debug(
      { contract, txHash, currentBlock, eventBlock: blockNumber },
      "MilestoneSubmitted: waiting for confirmations"
    );
    return false;
  }

  const project = await prisma.project.findFirst({
    where: { escrowAddress: contract.toLowerCase() },
    select: { id: true },
  });
  if (!project) {
    logger.warn({ contract }, "MilestoneSubmitted: project not found for escrow");
    return false;
  }

  const voteEndAtDate = new Date(Number(voteEndAt) * 1000);

  await prisma.$transaction(async (tx) => {
    await tx.milestone.updateMany({
      where: {
        projectId: project.id,
        index: Number(milestoneIndex),
      },
      data: {
        status: "VOTING",
        updateUri: updateURI,
        voteStartAt: new Date(),
        voteEndAt: voteEndAtDate,
      },
    });

    const projectWithMembers = await tx.project.findUnique({
      where: { id: project.id },
      include: {
        organization: {
          include: {
            members: {
              include: { user: { select: { email: true, name: true } } },
            },
          },
        },
      },
    });

    const emailRows =
      projectWithMembers?.organization.members.map((member) => ({
        to: member.user.email,
        template: "MILESTONE_VOTE_OPEN" as const,
        payload: {
          projectId: project.id,
          milestoneIndex: Number(milestoneIndex),
          name: member.user.name ?? member.user.email,
        },
        status: "QUEUED" as const,
      })) ?? [];

    if (emailRows.length > 0) {
      await tx.emailNotification.createMany({ data: emailRows });
    }

    await updateCursor(tx, contract, "MilestoneSubmitted", blockNumber);
  });

  logger.info(
    { projectId: project.id, milestoneIndex, txHash },
    "MilestoneSubmitted: indexed"
  );
  return true;
}