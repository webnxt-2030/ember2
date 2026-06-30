import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { updateCursor } from "../lib/cursor.js";
import type { MilestoneClaimedArgs } from "../types.js";

export async function handleMilestoneClaimed(args: {
  contract: string;
  ledgerSequence: number;
  txHash: string;
  eventIndex: number;
  args: MilestoneClaimedArgs;
}) {
  const { contract, ledgerSequence, txHash, args: eventArgs } = args;
  const { milestoneIndex } = eventArgs;

  const project = await prisma.project.findFirst({
    where: { escrowAddress: contract },
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
        index: milestoneIndex,
      },
      data: {
        status: "CLAIMED",
        claimedAt: new Date(),
        claimedTxHash: txHash,
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
        template: "MILESTONE_CLAIMED" as const,
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
        type: "MILESTONE_CLAIMED" as const,
        title: "Milestone Claimed",
        message: `Milestone #${String(milestoneIndex)} funds have been claimed by the organization.`,
        linkUrl: `/dashboard/contributions`,
      }));

    if (inAppRows.length > 0) {
      await tx.inAppNotification.createMany({ data: inAppRows });
    }

    await updateCursor(tx, contract, "MilestoneClaimed", BigInt(ledgerSequence));
  });

  logger.info(
    { projectId: project.id, milestoneIndex, txHash },
    "MilestoneClaimed: indexed"
  );
  return true;
}
