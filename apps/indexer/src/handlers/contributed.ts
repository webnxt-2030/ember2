import { USDC_DECIMALS } from "@ember/shared/soroban";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { updateCursor } from "../lib/cursor.js";
import type { ContributedArgs } from "../types.js";

function formatUnits(value: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = value % divisor;
  const fractionStr = fraction.toString().padStart(decimals, "0");
  const trimmed = fractionStr.replace(/0+$/, "");
  return trimmed ? `${String(whole)}.${trimmed}` : whole.toString();
}

export async function handleContributed(args: {
  contract: string;
  ledgerSequence: number;
  txHash: string;
  eventIndex: number;
  args: ContributedArgs;
}) {
  const { contract, ledgerSequence, txHash, eventIndex, args: eventArgs } = args;
  const { backer, amount, tokenId, m0Share } = eventArgs;
  const decimalAmount = formatUnits(amount, USDC_DECIMALS);
  const decimalM0Share = formatUnits(m0Share, USDC_DECIMALS);

  const project = await prisma.project.findFirst({
    where: { escrowAddress: contract },
    select: { id: true },
  });
  if (!project) {
    logger.warn({ contract }, "Contributed: project not found for escrow");
    return false;
  }

  const backerUser = await prisma.user.findFirst({
    where: { wallets: { some: { address: backer } } },
    select: { id: true, email: true },
  });

  await prisma.$transaction(async (tx) => {
    const existing = await tx.contribution.findUnique({
      where: { txHash },
    });
    if (existing) {
      logger.debug({ txHash }, "Contributed: already indexed");
      return;
    }

    await tx.contribution.create({
      data: {
        projectId: project.id,
        backerId: backerUser?.id ?? null,
        walletAddress: backer,
        amount: decimalAmount,
        m0Share: decimalM0Share,
        nftTokenId: tokenId.toString(),
        nftContract: contract,
        txHash,
        logIndex: eventIndex,
        blockNumber: BigInt(ledgerSequence),
        contributedAt: new Date(),
      },
    });

    await tx.project.update({
      where: { id: project.id },
      data: {
        totalRaised: { increment: decimalAmount },
      },
    });

    await tx.milestone.updateMany({
      where: { projectId: project.id, index: 0, status: "PENDING" },
      data: { status: "AUTO_RELEASED" },
    });

    await tx.emailNotification.createMany({
      data: backerUser?.email
        ? [
            {
              to: backerUser.email,
              template: "CONTRIBUTION_RECEIVED",
              payload: {
                projectId: project.id,
                backerAddress: backer,
                amount: decimalAmount,
                tokenId: tokenId.toString(),
              },
              status: "QUEUED",
            },
          ]
        : [],
      skipDuplicates: true,
    });

    if (backerUser?.id) {
      await tx.inAppNotification.create({
        data: {
          userId: backerUser.id,
          type: "CONTRIBUTION_RECEIVED",
          title: "Contribution Received",
          message: `Your contribution of ${decimalAmount} USDC has been received.`,
          linkUrl: `/dashboard/contributions`,
        },
      });
    }

    await updateCursor(tx, contract, "Contributed", BigInt(ledgerSequence));
  });

  logger.info({ projectId: project.id, txHash }, "Contributed: indexed");
  return true;
}
