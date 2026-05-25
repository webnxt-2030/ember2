import { watchContractEvent } from "/home/salt/Documents/VS_Code/ember2/apps/indexer/node_modules/viem/_esm/actions/public/watchContractEvent.js";
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
  { name: "Contributed", handler: handleContributed },
  { name: "Voted", handler: handleVoted },
  { name: "MilestoneSubmitted", handler: handleMilestoneSubmitted },
  { name: "MilestoneResolved", handler: handleMilestoneResolved },
  { name: "MilestoneClaimed", handler: handleMilestoneClaimed },
] as const;

function findEventAbi(abi: readonly any[], name: string): any {
  return abi.find((item: any) => item.type === "event" && item.name === name);
}

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
    const eventAbi = findEventAbi(ProjectEscrowAbi, name);
    if (!eventAbi) continue;

    const events = await (publicClient.getLogs as any)({
      address: escrowAddress,
      event: eventAbi,
      fromBlock,
      toBlock,
      strict: true,
    });

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
  eventName: string,
  log: any
) {
  const args = log.args;
  switch (eventName) {
    case "Contributed":
      await handleContributed({
        contract: escrowAddress,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        args,
      });
      break;
    case "Voted":
      await handleVoted({
        contract: escrowAddress,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        args,
      });
      break;
    case "MilestoneSubmitted":
      await handleMilestoneSubmitted({
        contract: escrowAddress,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        args,
      });
      break;
    case "MilestoneResolved":
      await handleMilestoneResolved({
        contract: escrowAddress,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        args,
      });
      break;
    case "MilestoneClaimed":
      await handleMilestoneClaimed({
        contract: escrowAddress,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        args,
      });
      break;
  }
}

function startEscrowWatcher(escrowAddress: `0x${string}`) {
  if (escrowWatchers.has(escrowAddress)) return;

  logger.info({ escrow: escrowAddress }, "Escrow watcher: starting");

  const stopFns: (() => void)[] = [];

  for (const { name } of escrowEvents) {
    const eventAbi = findEventAbi(ProjectEscrowAbi, name);
    if (!eventAbi) continue;

    const stopFn = watchContractEvent(publicClient, {
      address: escrowAddress,
      event: eventAbi,
      pollingInterval: POLLING_INTERVAL,
      onLogs: async (logs: any[]) => {
        for (const log of logs) {
          try {
            await dispatchEvent(escrowAddress, name, log);
          } catch (err) {
            logger.error(
              { err, event: name, txHash: log.transactionHash },
              "Escrow: error handling event"
            );
          }
        }
      },
    });

    stopFns.push(stopFn);
  }

  const combinedStop = () => {
    stopFns.forEach((fn) => fn());
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