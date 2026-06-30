import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { updateCursor } from "../lib/cursor.js";
import { addEscrowWatcher, backfillEscrow } from "../watchers/escrow.js";
import type { ProjectCreatedArgs } from "../types.js";

const escrowEventNames = [
  "Contributed",
  "Voted",
  "MilestoneSubmitted",
  "MilestoneResolved",
  "MilestoneClaimed",
] as const;

async function initEscrowCursors(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  escrowAddress: string,
  ledgerSequence: number
) {
  for (const eventName of escrowEventNames) {
    const existing = await tx.indexerCursor.findUnique({
      where: {
        contract_eventName: {
          contract: escrowAddress,
          eventName,
        },
      },
    });
    if (!existing) {
      await tx.indexerCursor.create({
        data: {
          contract: escrowAddress,
          eventName,
          lastBlock: BigInt(ledgerSequence),
        },
      });
    }
  }
}

export async function handleProjectCreated(args: {
  contract: string;
  ledgerSequence: number;
  txHash: string;
  eventIndex: number;
  args: ProjectCreatedArgs;
}) {
  const { contract, ledgerSequence, txHash, args: eventArgs } = args;
  const { projectId, escrow, nft } = eventArgs;

  await prisma.$transaction(async (tx) => {
    await tx.project.updateMany({
      where: { onChainId: projectId.toString() },
      data: {
        escrowAddress: escrow,
        nftAddress: nft,
        status: "LIVE",
        publishedAt: new Date(),
      },
    });

    await updateCursor(tx, contract, "ProjectCreated", BigInt(ledgerSequence));
    await initEscrowCursors(tx, escrow, ledgerSequence);
  });

  addEscrowWatcher(escrow);
  await backfillEscrow(escrow);

  logger.info(
    { projectId, escrow, nft, txHash },
    "ProjectCreated: indexed"
  );
  return true;
}
