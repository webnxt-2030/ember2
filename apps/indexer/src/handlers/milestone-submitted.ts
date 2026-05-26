import { publicClient, indexerEnv } from "../lib/client.js";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { updateCursor } from "../lib/cursor.js";
import type { MilestoneSubmittedArgs } from "../types.js";

export async function handleMilestoneSubmitted(args: {
  contract: `0x${string}`;
  blockNumber: bigint;
  txHash: `0x${string}`;
  logIndex: number;
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
    select: { id: true, slug: true, title: true },
  });
  if (!project) {
    logger.warn({ contract }, "MilestoneSubmitted: project not found for escrow");
    return false;
  }

  const milestone = await prisma.milestone.findFirst({
    where: { projectId: project.id, index: Number(milestoneIndex) },
    select: { title: true },
  });

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

    const backers = await tx.contribution.findMany({
      where: { projectId: project.id, backerId: { not: null } },
      include: { backer: { select: { email: true, name: true } } },
      distinct: ["backerId"],
    });

    const emailRows = backers
      .filter((c) => c.backer)
      .map((c) => ({
        to: c.backer!.email,
        template: "MILESTONE_VOTE_OPEN" as const,
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

    const inAppRows = backers
      .filter((c): c is typeof c & { backer: NonNullable<typeof c.backer> } => !!c.backer)
      .map((c) => ({
        userId: c.backer.id,
        type: "MILESTONE_VOTE_OPEN" as const,
        title: "Vote Open",
        message: `Voting is now open for milestone "${milestone?.title ?? `#${milestoneIndex}`}" in ${project.title}.`,
        linkUrl: `/projects/${project.slug}`,
      }));

    if (inAppRows.length > 0) {
      await tx.inAppNotification.createMany({ data: inAppRows });
    }

    await updateCursor(tx, contract, "MilestoneSubmitted", blockNumber);
  });

  logger.info(
    { projectId: project.id, milestoneIndex, txHash },
    "MilestoneSubmitted: indexed"
  );
  return true;
}