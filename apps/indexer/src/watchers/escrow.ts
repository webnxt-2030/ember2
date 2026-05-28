import { getAbiItem } from "viem";
import type { AbiEvent } from "viem";
import { ProjectEscrowAbi } from "@ember/shared/abis";
import { publicClient } from "../lib/client.js";
import { logger } from "../lib/logger.js";
import { prisma } from "../lib/db.js";
import { handleContributed } from "../handlers/contributed.js";
import { handleVoted } from "../handlers/voted.js";
import { handleMilestoneSubmitted } from "../handlers/milestone-submitted.js";
import { handleMilestoneResolved } from "../handlers/milestone-resolved.js";
import { handleMilestoneClaimed } from "../handlers/milestone-claimed.js";
import { getCursor } from "../lib/cursor.js";

const POLLING_INTERVAL = 1_000;

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

const MAX_BLOCK_RANGE = 5000n;

const FALLBACK_BLOCK_RANGE = 100_000n;

export async function backfillEscrow(escrowAddress: `0x${string}`, fromBlockOverride?: bigint) {
  const cursorBlock = await getEscrowStartBlock(escrowAddress);
  const toBlock = await publicClient.getBlockNumber();
  const fromBlock = fromBlockOverride ?? cursorBlock ?? (toBlock > FALLBACK_BLOCK_RANGE ? toBlock - FALLBACK_BLOCK_RANGE : 0n);

  if (fromBlock > toBlock) return;

  logger.info(
    { escrow: escrowAddress, fromBlock, toBlock },
    "Escrow: backfilling events"
  );

  for (const { name } of escrowEvents) {
    const eventItem = getAbiItem({ abi: ProjectEscrowAbi, name }) as AbiEvent;

    for (let batchFrom = fromBlock; batchFrom <= toBlock; batchFrom += MAX_BLOCK_RANGE) {
      const batchTo = batchFrom + MAX_BLOCK_RANGE - 1n > toBlock
        ? toBlock
        : batchFrom + MAX_BLOCK_RANGE - 1n;

      const events = await publicClient.getLogs({
        address: escrowAddress,
        event: eventItem,
        fromBlock: batchFrom,
        toBlock: batchTo,
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
): Promise<boolean> {
  switch (eventName) {
    case "Contributed":
      return handleContributed({
        contract: escrowAddress,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        logIndex: log.logIndex,
        args: log.args as unknown as Parameters<typeof handleContributed>[0]["args"],
      });
    case "Voted":
      return handleVoted({
        contract: escrowAddress,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        logIndex: log.logIndex,
        args: log.args as unknown as Parameters<typeof handleVoted>[0]["args"],
      });
    case "MilestoneSubmitted":
      return handleMilestoneSubmitted({
        contract: escrowAddress,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        logIndex: log.logIndex,
        args: log.args as unknown as Parameters<typeof handleMilestoneSubmitted>[0]["args"],
      });
    case "MilestoneResolved":
      return handleMilestoneResolved({
        contract: escrowAddress,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        logIndex: log.logIndex,
        args: log.args as unknown as Parameters<typeof handleMilestoneResolved>[0]["args"],
      });
    case "MilestoneClaimed":
      return handleMilestoneClaimed({
        contract: escrowAddress,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        logIndex: log.logIndex,
        args: log.args as unknown as Parameters<typeof handleMilestoneClaimed>[0]["args"],
      });
    default:
      return true;
  }
}

async function startEscrowWatcher(escrowAddress: `0x${string}`) {
  if (escrowWatchers.has(escrowAddress)) return;

  logger.info({ escrow: escrowAddress }, "Escrow watcher: starting");

  const abortControllers = new Map<string, AbortController>();

  for (const { name } of escrowEvents) {
    const eventItem = getAbiItem({ abi: ProjectEscrowAbi, name }) as AbiEvent;
    const cursor = await getCursor(escrowAddress, name);
    let lastBlock = cursor ?? (await publicClient.getBlockNumber());
    const abort = new AbortController();
    abortControllers.set(name, abort);

    const poll = async () => {
      while (!abort.signal.aborted) {
        try {
          const currentBlock = await publicClient.getBlockNumber();
          if (currentBlock > lastBlock) {
            const logs = await publicClient.getLogs({
              address: escrowAddress,
              event: eventItem,
              fromBlock: lastBlock + 1n,
              toBlock: currentBlock,
              strict: true,
            });

            for (const log of logs as unknown as {
              blockNumber: bigint;
              transactionHash: `0x${string}`;
              logIndex: number;
              args: Record<string, unknown>;
            }[]) {
              try {
                await prisma.indexerCursor.upsert({
                  where: {
                    contract_eventName: {
                      contract: escrowAddress.toLowerCase(),
                      eventName: name,
                    },
                  },
                  create: {
                    contract: escrowAddress.toLowerCase(),
                    eventName: name,
                    lastBlock: log.blockNumber - 1n,
                  },
                  update: {
                    lastBlock: log.blockNumber - 1n,
                  },
                });

                const ok = await dispatchEvent(escrowAddress, name, log);
                if (ok) {
                  await prisma.indexerCursor.upsert({
                    where: {
                      contract_eventName: {
                        contract: escrowAddress.toLowerCase(),
                        eventName: name,
                      },
                    },
                    create: {
                      contract: escrowAddress.toLowerCase(),
                      eventName: name,
                      lastBlock: log.blockNumber,
                    },
                    update: {
                      lastBlock: log.blockNumber,
                    },
                  });
                  lastBlock = log.blockNumber;
                }
              } catch (err) {
                logger.error(
                  { err, event: name, txHash: log.transactionHash },
                  "Escrow: error handling event"
                );
              }
            }

            if (logs.length === 0) {
              lastBlock = currentBlock;
            }
          }
        } catch (err) {
          logger.error(
            { err, escrow: escrowAddress, event: name },
            "Escrow: polling error"
          );
        }

        await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
      }
    };

    void poll();
  }

  const combinedStop = () => {
    for (const abort of abortControllers.values()) {
      abort.abort();
    }
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