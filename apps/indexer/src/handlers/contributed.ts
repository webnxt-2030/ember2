import { publicClient, indexerEnv } from "../lib/client.js";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { updateCursor } from "../lib/cursor.js";
import type { ContributedArgs } from "../types.js";

export async function handleContributed(args: {
  contract: `0x${string}`;
  blockNumber: bigint;
  txHash: `0x${string}`;
  logIndex: number;
  args: ContributedArgs;
}) {
  const { contract, blockNumber, txHash, logIndex, args: eventArgs } = args;
  const { backer, amount, tokenId, m0Share } = eventArgs;

  const currentBlock = await publicClient.getBlockNumber();
  if (currentBlock - blockNumber < indexerEnv.INDEXER_CONFIRMATIONS) {
    logger.debug(
      { contract, txHash, currentBlock, eventBlock: blockNumber },
      "Contributed: waiting for confirmations"
    );
    return false;
  }

  const project = await prisma.project.findFirst({
    where: { escrowAddress: contract.toLowerCase() },
    select: { id: true },
  });
  if (!project) {
    logger.warn({ contract }, "Contributed: project not found for escrow");
    return false;
  }

  const backerUser = await prisma.user.findFirst({
    where: { wallets: { some: { address: backer.toLowerCase() } } },
    select: { id: true, email: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.contribution.upsert({
      where: { txHash: txHash.toLowerCase() },
      create: {
        projectId: project.id,
        backerId: backerUser?.id ?? null,
        walletAddress: backer.toLowerCase(),
        amount: amount.toString(),
        m0Share: m0Share.toString(),
        nftTokenId: tokenId.toString(),
        nftContract: contract.toLowerCase(),
        txHash: txHash.toLowerCase(),
        logIndex,
        blockNumber,
        contributedAt: new Date(),
      },
      update: {},
    });

    await tx.project.update({
      where: { id: project.id },
      data: {
        totalRaised: { increment: amount.toString() },
      },
    });

    await tx.emailNotification.createMany({
      data: backerUser?.email
        ? [
            {
              to: backerUser.email,
              template: "CONTRIBUTION_RECEIVED",
              payload: {
                projectId: project.id,
                backerAddress: backer.toLowerCase(),
                amount: amount.toString(),
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
          message: `Your contribution of ${amount.toString()} USDT has been received.`,
          linkUrl: `/dashboard/contributions`,
        },
      });
    }

    await updateCursor(tx, contract, "Contributed", blockNumber);
  });

  logger.info({ projectId: project.id, txHash }, "Contributed: indexed");
  return true;
}