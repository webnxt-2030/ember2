import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { updateCursor } from "../lib/cursor.js";
import type { MilestoneSubmittedArgs } from "../types.js";

export async function handleMilestoneSubmitted(args: {
  contract: string;
  ledgerSequence: number;
  txHash: string;
  eventIndex: number;
  args: MilestoneSubmittedArgs;
}) {
  const { contract, ledgerSequence, txHash, args: eventArgs } = args;
  const { milestoneIndex, updateURI, voteEndAt } = eventArgs;

  const project = await prisma.project.findFirst({
    where: { escrowAddress: contract },
    select: { id: true, slug: true, title: true },
  });
  if (!project) {
    logger.warn({ contract }, "MilestoneSubmitted: project not found for escrow");
    return false;
  }

  const milestone = await prisma.milestone.findFirst({
    where: { projectId: project.id, index: milestoneIndex },
    select: { title: true },
  });

  const voteEndAtDate = new Date(voteEndAt * 1000);

  await prisma.$transaction(async (tx) => {
    await tx.milestone.updateMany({
      where: {
        projectId: project.id,
        index: milestoneIndex,
      },
      data: {
        status: "VOTING",
        updateUri: updateURI,
        voteStartAt: new Date(),
        voteEndAt: voteEndAtDate,
        weightYes: 0,
        weightNo: 0,
      },
    });

    const backers = await tx.contribution.findMany({
      where: { projectId: project.id, backerId: { not: null } },
      include: { backer: { select: { id: true, email: true, name: true } } },
      distinct: ["backerId"],
    });

    const emailRows = backers
      .filter((c): c is typeof c & { backer: NonNullable<typeof c.backer> } => !!c.backer)
      .map((c) => ({
        to: c.backer.email,
        template: "MILESTONE_VOTE_OPEN" as const,
        payload: {
          projectId: project.id,
          milestoneIndex,
          name: c.backer.name ?? c.backer.email,
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
        message: `Voting is now open for milestone "${milestone?.title ?? `#${String(milestoneIndex)}`}" in ${project.title}.`,
        linkUrl: `/projects/${project.slug}`,
      }));

    if (inAppRows.length > 0) {
      await tx.inAppNotification.createMany({ data: inAppRows });
    }

    await updateCursor(tx, contract, "MilestoneSubmitted", BigInt(ledgerSequence));
  });

  logger.info(
    { projectId: project.id, milestoneIndex, txHash },
    "MilestoneSubmitted: indexed"
  );
  return true;
}
