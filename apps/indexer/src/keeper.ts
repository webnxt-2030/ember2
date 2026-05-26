import { prisma } from "./lib/db.js";
import { keeperWallet, publicClient } from "./lib/client.js";
import { logger } from "./lib/logger.js";
import { ProjectEscrowAbi } from "@ember/shared/abis.js";

const KEEPER_INTERVAL_MS = 60_000;

let intervalId: ReturnType<typeof setInterval> | null = null;

async function resolveStaleMilestones() {
  const staleMilestones = await prisma.milestone.findMany({
    where: {
      status: "VOTING",
      voteEndAt: { lt: new Date() },
    },
    select: {
      id: true,
      project: {
        select: {
          escrowAddress: true,
          id: true,
        },
      },
      index: true,
    },
  });

  if (staleMilestones.length === 0) return;

  logger.info(
    { count: staleMilestones.length },
    "Keeper: found stale milestones to resolve"
  );

  for (const milestone of staleMilestones) {
    const escrowAddress = milestone.project.escrowAddress as `0x${string}`;

    try {
      const hash = await keeperWallet.writeContract({
        address: escrowAddress,
        abi: ProjectEscrowAbi,
        functionName: "resolveMilestone",
        args: [BigInt(milestone.index)],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === "success") {
        logger.info(
          { milestoneId: milestone.id, escrowAddress, txHash: hash },
          "Keeper: resolved milestone"
        );
      } else {
        logger.warn(
          { milestoneId: milestone.id, txHash: hash },
          "Keeper: resolveMilestone reverted"
        );
      }
    } catch (err) {
      logger.error(
        { err, milestoneId: milestone.id, escrowAddress },
        "Keeper: error resolving milestone"
      );
    }
  }
}

export function startKeeper() {
  logger.info({ intervalMs: KEEPER_INTERVAL_MS }, "Keeper: starting");

  resolveStaleMilestones();

  intervalId = setInterval(resolveStaleMilestones, KEEPER_INTERVAL_MS);
}

export function stopKeeper() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info("Keeper: stopped");
  }
}