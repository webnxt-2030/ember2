import { formatUsdc } from "../lib/format.js";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { updateCursor } from "../lib/cursor.js";
import type { MilestoneResolvedArgs } from "../types.js";

export async function handleMilestoneResolved(args: {
  contract: string;
  ledgerSequence: number;
  txHash: string;
  eventIndex: number;
  args: MilestoneResolvedArgs;
}) {
  const { contract, ledgerSequence, txHash, args: eventArgs } = args;
  const { milestoneIndex, passed, weightYes, weightNo } = eventArgs;

  const project = await prisma.project.findFirst({
    where: { escrowAddress: contract },
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
        index: milestoneIndex,
      },
      data: {
        status: passed ? "PASSED" : "FAILED",
        weightYes: formatUsdc(weightYes),
        weightNo: formatUsdc(weightNo),
        passed,
      },
    });

    const projectBackers = await tx.contribution.findMany({
      where: { projectId: project.id },
      include: { backer: { select: { id: true, email: true, name: true } } },
      distinct: ["backerId"],
    });

    const emailRows = projectBackers
      .filter((c): c is typeof c & { backer: NonNullable<typeof c.backer> } => !!c.backer)
      .map((c) => ({
        to: c.backer.email,
        template: "MILESTONE_VOTE_OUTCOME" as const,
        payload: {
          projectId: project.id,
          milestoneIndex,
          passed,
          name: c.backer.name ?? c.backer.email,
        },
        status: "QUEUED" as const,
      }));

    if (emailRows.length > 0) {
      await tx.emailNotification.createMany({ data: emailRows });
    }

    const inAppRows = projectBackers
      .filter((c): c is typeof c & { backer: NonNullable<typeof c.backer> } => !!c.backer)
      .map((c) => ({
        userId: c.backer.id,
        type: "MILESTONE_VOTE_OUTCOME" as const,
        title: passed ? "Milestone Passed" : "Milestone Failed",
        message: `Milestone #${String(milestoneIndex)} ${passed ? "passed" : "failed"} backer vote.`,
        linkUrl: `/dashboard/votes`,
      }));

    if (inAppRows.length > 0) {
      await tx.inAppNotification.createMany({ data: inAppRows });
    }

    await updateCursor(tx, contract, "MilestoneResolved", BigInt(ledgerSequence));
  });

  logger.info(
    { projectId: project.id, milestoneIndex, passed, txHash },
    "MilestoneResolved: indexed"
  );
  return true;
}
