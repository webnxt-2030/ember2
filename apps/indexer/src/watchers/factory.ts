import { publicClient } from "../lib/client.js";
import { getAbiItem } from "viem";
import { ProjectFactoryAbi } from "@ember/shared/abis.js";
import { indexerEnv } from "../lib/env.js";
import { logger } from "../lib/logger.js";
import { handleProjectCreated } from "../handlers/project-created.js";
import { getCursor } from "../lib/cursor.js";

const POLLING_INTERVAL = 4_000;

const factoryAddress = indexerEnv.FACTORY_ADDRESS as `0x${string}`;

let factoryStopFn: (() => void) | null = null;

async function backfillFactory(fromBlock: bigint, toBlock: bigint) {
  logger.info(
    { factory: factoryAddress, fromBlock, toBlock },
    "Factory: backfilling ProjectCreated events"
  );

  const eventItem = getAbiItem({ abi: ProjectFactoryAbi, name: "ProjectCreated" }) as import("viem").AbiEvent;
  const events = await publicClient.getLogs({
    address: factoryAddress,
    event: eventItem,
    fromBlock,
    toBlock,
    strict: true,
  }) as unknown as Array<{
    blockNumber: bigint;
    transactionHash: `0x${string}`;
    args: Parameters<typeof handleProjectCreated>[0]["args"];
  }>;

  for (const event of events) {
    await handleProjectCreated({
      contract: factoryAddress,
      blockNumber: event.blockNumber,
      txHash: event.transactionHash,
      args: event.args,
    });
  }

  logger.info(
    { factory: factoryAddress, count: events.length },
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
    onLogs: async (logs) => {
      for (const log of logs as unknown as Array<{
        blockNumber: bigint;
        transactionHash: `0x${string}`;
        args: Parameters<typeof handleProjectCreated>[0]["args"];
      }>) {
        try {
          await handleProjectCreated({
            contract: factoryAddress,
            blockNumber: log.blockNumber,
            txHash: log.transactionHash,
            args: log.args,
          });
        } catch (err) {
          logger.error(
            { err, txHash: log.transactionHash },
            "Factory: error handling ProjectCreated"
          );
        }
      }
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