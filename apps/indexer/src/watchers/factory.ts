import { publicClient } from "../lib/client.js";
import { getAbiItem } from "viem";
import type { AbiEvent } from "viem";
import { ProjectFactoryAbi } from "@ember/shared/abis";
import { indexerEnv } from "../lib/env.js";
import { logger } from "../lib/logger.js";
import { handleProjectCreated } from "../handlers/project-created.js";
import { getCursor } from "../lib/cursor.js";

const POLLING_INTERVAL = 4_000;
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

  factoryStopFn = publicClient.watchContractEvent({
    address: factoryAddress,
    abi: ProjectFactoryAbi,
    eventName,
    pollingInterval: POLLING_INTERVAL,
    onLogs: (logs) => {
      void (async () => {
        for (const log of logs as unknown as {
          blockNumber: bigint;
          transactionHash: `0x${string}`;
          logIndex: number;
          args: Parameters<typeof handleProjectCreated>[0]["args"];
        }[]) {
          try {
            await handleProjectCreated({
              contract: factoryAddress,
              blockNumber: log.blockNumber,
              txHash: log.transactionHash,
              logIndex: log.logIndex,
              args: log.args,
            });
          } catch (err) {
            logger.error(
              { err, txHash: log.transactionHash },
              "Factory: error handling ProjectCreated"
            );
          }
        }
      })();
    },
  });

  logger.info({ factory: factoryAddress }, "Factory watcher: started");
}

export function stopFactoryWatcher() {
  if (factoryStopFn) {
    factoryStopFn();
    factoryStopFn = null;
    logger.info("Factory watcher: stopped");
  }
}