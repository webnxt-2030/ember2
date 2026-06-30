import { formatUsdc } from "../lib/format.js";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { updateCursor } from "../lib/cursor.js";
import type { VotedArgs } from "../types.js";

export async function handleVoted(args: {
  contract: string;
  ledgerSequence: number;
  txHash: string;
  eventIndex: number;
  args: VotedArgs;
}) {
  const { contract, ledgerSequence, txHash, eventIndex, args: eventArgs } = args;
  const { milestoneIndex, voter, yes, weight } = eventArgs;

  const project = await prisma.project.findFirst({
    where: { escrowAddress: contract },
    select: { id: true },
  });
  if (!project) {
    logger.warn({ contract }, "Voted: project not found for escrow");
    return false;
  }

  const milestone = await prisma.milestone.findUnique({
    where: { projectId_index: { projectId: project.id, index: milestoneIndex } },
    select: { id: true },
  });
  if (!milestone) {
    logger.warn({ contract, milestoneIndex }, "Voted: milestone not found");
    return false;
  }

  await prisma.$transaction(async (tx) => {
    await tx.milestoneVote.upsert({
      where: { txHash_logIndex: { txHash, logIndex: eventIndex } },
      create: {
        milestoneId: milestone.id,
        walletAddress: voter,
        choice: yes ? "YES" : "NO",
        weight: formatUsdc(weight),
        txHash,
        logIndex: eventIndex,
        votedAt: new Date(),
      },
      update: {},
    });

    await tx.milestone.updateMany({
      where: {
        projectId: project.id,
        index: milestoneIndex,
      },
      data: yes
        ? { weightYes: { increment: formatUsdc(weight) } }
        : { weightNo: { increment: formatUsdc(weight) } },
    });

    await updateCursor(tx, contract, "Voted", BigInt(ledgerSequence));
  });

  logger.info(
    { projectId: project.id, milestoneIndex, voter, txHash },
    "Voted: indexed"
  );
  return true;
}
