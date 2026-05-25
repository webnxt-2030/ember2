import { watchContractEvent } from "/home/salt/Documents/VS_Code/ember2/apps/indexer/node_modules/viem/_esm/actions/public/watchContractEvent.js";
import { ProjectFactoryAbi } from "@ember/shared/abis.js";
import { indexerEnv } from "../lib/env.js";
import { publicClient } from "../lib/client.js";
import { logger } from "../lib/logger.js";
import { handleProjectCreated } from "../handlers/project-created.js";
import { getCursor } from "../lib/cursor.js";

const POLLING_INTERVAL = 4_000;

const factoryAddress = indexerEnv.FACTORY_ADDRESS as `0x${string}`;

let factoryStopFn: (() => void) | null = null;

function findEventAbi(abi: readonly any[], name: string): any {
  return abi.find((item: any) => item.type === "event" && item.name === name);
}

async function backfillFactory(fromBlock: bigint, toBlock: bigint) {
  logger.info(
    { factory: factoryAddress, fromBlock, toBlock },
    "Factory: backfilling ProjectCreated events"
  );

  const eventAbi = findEventAbi(ProjectFactoryAbi, "ProjectCreated");
  if (!eventAbi) return;

  const events = await (publicClient.getLogs as any)({
    address: factoryAddress,
    event: eventAbi,
    fromBlock,
    toBlock,
    strict: true,
  });

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

  const eventAbi = findEventAbi(ProjectFactoryAbi, "ProjectCreated");
  if (!eventAbi) {
    logger.error("Factory: ProjectCreated event not found in ABI");
    return;
  }

  factoryStopFn = watchContractEvent(publicClient, {
    address: factoryAddress,
    event: eventAbi,
    pollingInterval: POLLING_INTERVAL,
    onLogs: async (logs: any[]) => {
      for (const log of logs) {
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