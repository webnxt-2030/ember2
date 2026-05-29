import { publicClient } from "../lib/client.js";
import { getAbiItem } from "viem";
import type { AbiEvent } from "viem";
import { ProjectFactoryAbi } from "@ember/shared/abis";
import { indexerEnv } from "../lib/env.js";
import { logger } from "../lib/logger.js";
import { prisma } from "../lib/db.js";
import { handleProjectCreated } from "../handlers/project-created.js";
import { getCursor } from "../lib/cursor.js";

const POLLING_INTERVAL = 1_000;
const MAX_BLOCK_RANGE = 5000n;

const factoryAddress = indexerEnv.FACTORY_ADDRESS as `0x${string}`;

let factoryStopFn: (() => void) | null = null;

async function backfillFactory(fromBlock: bigint, toBlock: bigint) {
  logger.info(
    { factory: factoryAddress, fromBlock, toBlock },
    "Factory: backfilling ProjectCreated events"
  );

  const eventItem = getAbiItem({ abi: ProjectFactoryAbi, name: "ProjectCreated" }) as AbiEvent;
  let totalEvents = 0;

  for (let batchFrom = fromBlock; batchFrom <= toBlock; batchFrom += MAX_BLOCK_RANGE) {
    const batchTo = batchFrom + MAX_BLOCK_RANGE - 1n > toBlock
      ? toBlock
      : batchFrom + MAX_BLOCK_RANGE - 1n;

    const events = await publicClient.getLogs({
      address: factoryAddress,
      event: eventItem,
      fromBlock: batchFrom,
      toBlock: batchTo,
      strict: true,
    }) as unknown as {
      blockNumber: bigint;
      transactionHash: `0x${string}`;
      logIndex: number;
      args: Parameters<typeof handleProjectCreated>[0]["args"];
    }[];

    for (const event of events) {
      await handleProjectCreated({
        contract: factoryAddress,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        logIndex: event.logIndex,
        args: event.args,
      });
    }

    totalEvents += events.length;
  }

  logger.info(
    { factory: factoryAddress, count: totalEvents },
    "Factory: backfill complete"
  );
}

export async function startFactoryWatcher() {
  logger.info({ factory: factoryAddress }, "Factory watcher: starting");

  const lastCursorBlock = await getCursor(factoryAddress, "ProjectCreated");
  const fromBlock = lastCursorBlock ? lastCursorBlock + 1n : undefined;
  const toBlock = await publicClient.getBlockNumber();

  if (fromBlock && fromBlock <= toBlock) {
    await backfillFactory(fromBlock, toBlock);
  }

  const eventName = "ProjectCreated" as const;
  const eventItem = getAbiItem({ abi: ProjectFactoryAbi, name: "ProjectCreated" }) as AbiEvent;
  const cursor = await getCursor(factoryAddress, eventName);
  let lastBlock = cursor ?? toBlock;
  const abort = new AbortController();

  const poll = async () => {
    while (!abort.signal.aborted) {
      try {
        const currentBlock = await publicClient.getBlockNumber();
        if (currentBlock > lastBlock) {
          const logs = await publicClient.getLogs({
            address: factoryAddress,
            event: eventItem,
            fromBlock: lastBlock + 1n,
            toBlock: currentBlock,
            strict: true,
          });

          for (const log of logs as unknown as {
            blockNumber: bigint;
            transactionHash: `0x${string}`;
            logIndex: number;
            args: Parameters<typeof handleProjectCreated>[0]["args"];
          }[]) {
            try {
              await prisma.indexerCursor.upsert({
                where: {
                  contract_eventName: {
                    contract: factoryAddress.toLowerCase(),
                    eventName,
                  },
                },
                create: {
                  contract: factoryAddress.toLowerCase(),
                  eventName,
                  lastBlock: log.blockNumber - 1n,
                },
                update: {
                  lastBlock: log.blockNumber - 1n,
                },
              });

              const ok = await handleProjectCreated({
                contract: factoryAddress,
                blockNumber: log.blockNumber,
                txHash: log.transactionHash,
                logIndex: log.logIndex,
                args: log.args,
              });
              if (ok) {
                await prisma.indexerCursor.upsert({
                  where: {
                    contract_eventName: {
                      contract: factoryAddress.toLowerCase(),
                      eventName,
                    },
                  },
                  create: {
                    contract: factoryAddress.toLowerCase(),
                    eventName,
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
                { err, txHash: log.transactionHash },
                "Factory: error handling ProjectCreated"
              );
            }
          }

          if (logs.length === 0) {
            lastBlock = currentBlock;
          }
        }
      } catch (err) {
        logger.error({ err, factory: factoryAddress }, "Factory: polling error");
      }

      await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
    }
  };

  void poll();

  factoryStopFn = () => {
    abort.abort();
    factoryStopFn = null;
  };

  logger.info({ factory: factoryAddress }, "Factory watcher: started");
}

export function stopFactoryWatcher() {
  if (factoryStopFn) {
    factoryStopFn();
    logger.info("Factory watcher: stopped");
  }
}