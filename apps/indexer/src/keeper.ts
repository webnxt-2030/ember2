import { Contract, TransactionBuilder, xdr } from "@stellar/stellar-sdk";
import SorobanRpc from "@stellar/stellar-sdk/rpc";
import { prisma } from "./lib/db.js";
import { keeperKeypair, sorobanServer, horizonServer, indexerEnv } from "./lib/client.js";
import { logger } from "./lib/logger.js";
import { formatContractError } from "@ember/shared/contract-errors";

const KEEPER_INTERVAL_MS = 60_000;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const RESOLVE_BUFFER_MS = 60_000;

let intervalId: ReturnType<typeof setInterval> | null = null;

async function loadOrCreateAccount() {
  try {
    return await horizonServer.loadAccount(keeperKeypair.publicKey());
  } catch (err: unknown) {
    logger.error(
      { err, address: keeperKeypair.publicKey() },
      "Keeper: failed to load account; ensure it is funded with XLM"
    );
    throw err;
  }
}

async function submitResolveMilestone(escrowContractId: string, milestoneIndex: number) {
  const account = await loadOrCreateAccount();
  const contract = new Contract(escrowContractId);

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: indexerEnv.STELLAR_NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("resolve_milestone", xdr.ScVal.scvU32(milestoneIndex)))
    .setTimeout(30)
    .build();

  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call,
     @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions */
  const simulated = await sorobanServer.simulateTransaction(tx);
  if (!SorobanRpc.Api.isSimulationSuccess(simulated)) {
    throw new Error(`Simulation failed: ${JSON.stringify(simulated)}`);
  }

  const prepared = SorobanRpc.assembleTransaction(tx, simulated).build();
  prepared.sign(keeperKeypair);

  const result = await sorobanServer.sendTransaction(prepared);
  if (result.status !== "PENDING") {
    throw new Error(`Transaction failed: ${result.status}`);
  }

  let txResult = await sorobanServer.getTransaction(result.hash);
  const start = Date.now();
  while (txResult.status === "NOT_FOUND" && Date.now() - start < 30_000) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    txResult = await sorobanServer.getTransaction(result.hash);
  }

  if (txResult.status !== "SUCCESS") {
    throw new Error(`Transaction not successful: ${txResult.status}`);
  }

  return result.hash as string;
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call,
     @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions */
}

async function resolveStaleMilestones() {
  const staleMilestones = await prisma.milestone.findMany({
    where: {
      status: "VOTING",
      voteEndAt: { lt: new Date(Date.now() - RESOLVE_BUFFER_MS) },
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
    const escrowContractId = milestone.project.escrowAddress;
    if (!escrowContractId) continue;

    try {
      const txHash: string = await submitResolveMilestone(escrowContractId, milestone.index);
      logger.info(
        { milestoneId: milestone.id, escrowContractId, txHash },
        "Keeper: resolved milestone"
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const friendly = formatContractError(err instanceof Error ? err : new Error(String(err)));
      if (friendly?.includes("Voting has not ended yet")) {
        logger.warn(
          { milestoneId: milestone.id, escrowContractId },
          "Keeper: milestone not ready for resolution yet"
        );
      } else if (msg.includes("insufficient funds") || msg.includes("low reserve")) {
        logger.error(
          { milestoneId: milestone.id, escrowContractId },
          "Keeper: keeper account may be out of XLM. Fund the keeper address."
        );
      } else {
        logger.error(
          { err, milestoneId: milestone.id, escrowContractId, friendly },
          "Keeper: error resolving milestone"
        );
      }
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

export async function startKeeper() {
  logger.info({ intervalMs: KEEPER_INTERVAL_MS }, "Keeper: starting");

  try {
    const account = await horizonServer.loadAccount(keeperKeypair.publicKey());
    logger.info(
      { address: keeperKeypair.publicKey(), balance: account.balances },
      "Keeper: account loaded"
    );
  } catch {
    logger.error(
      { address: keeperKeypair.publicKey() },
      "Keeper: could not load account; ensure it is funded"
    );
  }

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
