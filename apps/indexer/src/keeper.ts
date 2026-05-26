import { prisma } from "./lib/db.js";
import { keeperWallet, publicClient } from "./lib/client.js";
import { logger } from "./lib/logger.js";
import { ProjectEscrowAbi } from "@ember/shared/abis.js";

const KEEPER_INTERVAL_MS = 60_000;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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

async function sweepComingSoonMilestones() {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const upcoming = await prisma.milestone.findMany({
    where: {
      status: "PENDING",
      deliverableDate: {
        gte: now,
        lte: in24h,
      },
      comingSoonNotifiedAt: null,
    },
    select: {
      id: true,
      title: true,
      deliverableDate: true,
      project: {
        select: {
          id: true,
          slug: true,
          title: true,
        },
      },
    },
  });

  if (upcoming.length === 0) return;

  logger.info(
    { count: upcoming.length },
    "Keeper: found upcoming milestones to notify"
  );

  for (const milestone of upcoming) {
    const projectUrl = `${APP_URL}/projects/${milestone.project.slug}`;

    const backers = await prisma.contribution.findMany({
      where: {
        projectId: milestone.project.id,
        backerId: { not: null },
      },
      include: {
        backer: {
          select: { email: true, name: true },
        },
      },
      distinct: ["backerId"],
    });

    const emailRows = backers
      .filter((c): c is typeof c & { backer: NonNullable<typeof c.backer> } => !!c.backer)
      .map((c) => ({
        to: c.backer.email,
        template: "MILESTONE_VOTE_COMING_SOON" as const,
        payload: {
          name: c.backer.name ?? c.backer.email,
          projectName: milestone.project.title,
          milestoneTitle: milestone.title,
          deliverableDate: milestone.deliverableDate?.toISOString() ?? "",
          projectUrl,
        },
        status: "QUEUED" as const,
      }));

    await prisma.$transaction(async (tx) => {
      if (emailRows.length > 0) {
        await tx.emailNotification.createMany({ data: emailRows });
      }

      await tx.milestone.update({
        where: { id: milestone.id },
        data: { comingSoonNotifiedAt: new Date() },
      });
    });

    logger.info(
      { milestoneId: milestone.id, emailsQueued: emailRows.length },
      "Keeper: queued coming-soon notifications"
    );
  }
}

export function startKeeper() {
  logger.info({ intervalMs: KEEPER_INTERVAL_MS }, "Keeper: starting");

  resolveStaleMilestones().catch((err: unknown) => {
    logger.error({ err }, "Keeper: initial sweep failed");
  });

  sweepComingSoonMilestones().catch((err: unknown) => {
    logger.error({ err }, "Keeper: initial coming-soon sweep failed");
  });

  intervalId = setInterval(() => {
    resolveStaleMilestones().catch((err: unknown) => {
      logger.error({ err }, "Keeper: sweep failed");
    });

    sweepComingSoonMilestones().catch((err: unknown) => {
      logger.error({ err }, "Keeper: coming-soon sweep failed");
    });
  }, KEEPER_INTERVAL_MS);
}

export function stopKeeper() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info("Keeper: stopped");
  }
}