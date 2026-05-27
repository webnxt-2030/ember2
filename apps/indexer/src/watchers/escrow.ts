import { getAbiItem } from "viem";
import type { AbiEvent } from "viem";
import { ProjectEscrowAbi } from "@ember/shared/abis.js";
import { publicClient } from "../lib/client.js";
import { logger } from "../lib/logger.js";
import { prisma } from "../lib/db.js";
import { handleContributed } from "../handlers/contributed.js";
import { handleVoted } from "../handlers/voted.js";
import { handleMilestoneSubmitted } from "../handlers/milestone-submitted.js";
import { handleMilestoneResolved } from "../handlers/milestone-resolved.js";
import { handleMilestoneClaimed } from "../handlers/milestone-claimed.js";
import { getCursor } from "../lib/cursor.js";

const POLLING_INTERVAL = 4_000;

const escrowWatchers = new Map<string, () => void>();

const escrowEvents = [
  { name: "Contributed" as const, handler: handleContributed },
  { name: "Voted" as const, handler: handleVoted },
  { name: "MilestoneSubmitted" as const, handler: handleMilestoneSubmitted },
  { name: "MilestoneResolved" as const, handler: handleMilestoneResolved },
  { name: "MilestoneClaimed" as const, handler: handleMilestoneClaimed },
];

async function getEscrowStartBlock(escrowAddress: `0x${string}`) {
  let earliest: bigint | null = null;
  for (const { name } of escrowEvents) {
    const cursor = await getCursor(escrowAddress, name);
    if (cursor !== null && (earliest === null || cursor < earliest)) {
      earliest = cursor;
    }
  }
  return earliest;
}

async function backfillEscrow(escrowAddress: `0x${string}`) {
  const fromBlock = await getEscrowStartBlock(escrowAddress);
  const toBlock = await publicClient.getBlockNumber();

  if (!fromBlock || fromBlock > toBlock) return;

  logger.info(
    { escrow: escrowAddress, fromBlock, toBlock },
    "Escrow: backfilling events"
  );

  for (const { name } of escrowEvents) {
    const eventItem = getAbiItem({ abi: ProjectEscrowAbi, name }) as AbiEvent;
    const events = await publicClient.getLogs({
      address: escrowAddress,
      event: eventItem,
      fromBlock,
      toBlock,
      strict: true,
    }) as unknown as {
      blockNumber: bigint;
      transactionHash: `0x${string}`;
      logIndex: number;
      args: Record<string, unknown>;
    }[];

    for (const event of events) {
      await dispatchEvent(escrowAddress, name, event);
    }
  }

  logger.info(
    { escrow: escrowAddress },
    "Escrow: backfill complete"
  );
}

async function dispatchEvent(
  escrowAddress: `0x${string}`,
  eventName: typeof escrowEvents[number]["name"],
  log: { blockNumber: bigint; transactionHash: `0x${string}`; logIndex: number; args: Record<string, unknown> }
) {
  switch (eventName) {
    case "Contributed":
      await handleContributed({
        contract: escrowAddress,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        logIndex: log.logIndex,
        args: log.args as unknown as Parameters<typeof handleContributed>[0]["args"],
      });
      break;
    case "Voted":
      await handleVoted({
        contract: escrowAddress,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        logIndex: log.logIndex,
        args: log.args as unknown as Parameters<typeof handleVoted>[0]["args"],
      });
      break;
    case "MilestoneSubmitted":
      await handleMilestoneSubmitted({
        contract: escrowAddress,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        logIndex: log.logIndex,
        args: log.args as unknown as Parameters<typeof handleMilestoneSubmitted>[0]["args"],
      });
      break;
    case "MilestoneResolved":
      await handleMilestoneResolved({
        contract: escrowAddress,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        logIndex: log.logIndex,
        args: log.args as unknown as Parameters<typeof handleMilestoneResolved>[0]["args"],
      });
      break;
    case "MilestoneClaimed":
      await handleMilestoneClaimed({
        contract: escrowAddress,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        logIndex: log.logIndex,
        args: log.args as unknown as Parameters<typeof handleMilestoneClaimed>[0]["args"],
      });
      break;
  }
}

function startEscrowWatcher(escrowAddress: `0x${string}`) {
  if (escrowWatchers.has(escrowAddress)) return;

  logger.info({ escrow: escrowAddress }, "Escrow watcher: starting");

  const stopFns: (() => void)[] = [];

  for (const { name } of escrowEvents) {
    const stopFn = publicClient.watchContractEvent({
      address: escrowAddress,
      abi: ProjectEscrowAbi,
      eventName: name,
      pollingInterval: POLLING_INTERVAL,
      onLogs: (logs) => {
        void (async () => {
          for (const log of logs as unknown as {
            blockNumber: bigint;
            transactionHash: `0x${string}`;
            logIndex: number;
            args: Record<string, unknown>;
          }[]) {
            try {
              await dispatchEvent(escrowAddress, name, log);
            } catch (err) {
              logger.error(
                { err, event: name, txHash: log.transactionHash },
                "Escrow: error handling event"
              );
            }
          }
        })();
      },
    });

    stopFns.push(stopFn);
  }

  const combinedStop = () => {
    stopFns.forEach((fn) => { fn(); });
    escrowWatchers.delete(escrowAddress);
  };

  escrowWatchers.set(escrowAddress, combinedStop);
  logger.info({ escrow: escrowAddress }, "Escrow watcher: started");
}

async function startEscrowWatchersForKnownProjects() {
  const projects = await prisma.project.findMany({
    where: {
      escrowAddress: { not: null },
      status: "LIVE",
    },
    select: { escrowAddress: true },
  });

  for (const project of projects) {
    if (project.escrowAddress) {
      const address = project.escrowAddress as `0x${string}`;
      await backfillEscrow(address);
      startEscrowWatcher(address);
    }
  }
}

export function addEscrowWatcher(escrowAddress: `0x${string}`) {
  startEscrowWatcher(escrowAddress);
}

export function stopAllEscrowWatchers() {
  for (const [address, stop] of escrowWatchers) {
    stop();
    logger.info({ escrow: address }, "Escrow watcher: stopped");
  }
  escrowWatchers.clear();
}

export async function startEscrowWatchers() {
  await startEscrowWatchersForKnownProjects();
}