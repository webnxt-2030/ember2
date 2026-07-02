import type { xdr } from "@stellar/stellar-sdk";
import { indexerEnv } from "../lib/env.js";
import { logger } from "../lib/logger.js";
import { handleProjectCreated } from "../handlers/project-created.js";
import { getCursor } from "../lib/cursor.js";
import {
  getContractEvents,
  getLatestLedger,
  parseEventSymbol,
  parseAddress,
  parseU32,
  parseVec,
} from "../lib/events.js";

const POLLING_INTERVAL = 1_000;
const MAX_LEDGER_RANGE = 1_000;
const FALLBACK_LEDGER_RANGE = 100;

const factoryContractId = indexerEnv.FACTORY_CONTRACT_ID;

let factoryStopFn: (() => void) | null = null;

async function backfillFactory(fromLedger: number, toLedger: number) {
  logger.info(
    { factory: factoryContractId, fromLedger, toLedger },
    "Factory: backfilling ProjectCreated events"
  );

  let totalEvents = 0;
  for (let batchFrom = fromLedger; batchFrom <= toLedger; batchFrom += MAX_LEDGER_RANGE) {
    const batchTo = Math.min(batchFrom + MAX_LEDGER_RANGE - 1, toLedger);
    const events = await getContractEvents(
      factoryContractId,
      "project_created",
      batchFrom,
      batchTo
    );

    for (const event of events) {
      if (parseEventSymbol(event.topics[0]) !== "project_created") continue;
      const parsed = parseProjectCreated(event);
      if (!parsed) continue;
      await handleProjectCreated({
        contract: factoryContractId,
        ledgerSequence: event.ledgerSequence,
        txHash: event.txHash,
        eventIndex: event.eventIndex,
        args: parsed,
      });
    }
    totalEvents += events.length;
  }

  logger.info(
    { factory: factoryContractId, count: totalEvents },
    "Factory: backfill complete"
  );
}

function parseProjectCreated(event: {
  topics: xdr.ScVal[];
  value: xdr.ScVal;
}) {
  try {
    const topics = event.topics;
    if (topics.length < 2) return null;
    const projectId = parseU32(topics[1]);
    const data = event.value.vec();
    if (!data || data.length < 6) return null;

    const organization = parseAddress(data[0]);
    const creator = parseAddress(data[1]);
    const escrow = parseAddress(data[2]);
    const nft = parseAddress(data[3]);
    if (!organization || !creator || !escrow || !nft) {
      logger.error("Factory: failed to parse addresses in ProjectCreated event");
      return null;
    }

    return {
      projectId,
      organization,
      creator,
      escrow,
      nft,
      milestoneBps: (parseVec(data[4], parseU32) as number[]).filter(
        (n): n is number => typeof n === "number"
      ),
      votingPeriod: parseU32(data[5]),
    };
  } catch (err) {
    logger.error({ err }, "Factory: failed to parse ProjectCreated event");
    return null;
  }
}

export async function startFactoryWatcher() {
  logger.info({ factory: factoryContractId }, "Factory watcher: starting");

  const lastCursorLedger = await getCursor(factoryContractId, "ProjectCreated");
  const toLedger = await getLatestLedger();
  const fromLedger = lastCursorLedger
    ? Number(lastCursorLedger) + 1
    : Math.max(toLedger - FALLBACK_LEDGER_RANGE, 1);

  if (fromLedger <= toLedger) {
    await backfillFactory(fromLedger, toLedger);
  }

  let lastLedger = (await getCursor(factoryContractId, "ProjectCreated")) ?? BigInt(toLedger);
  const abort = new AbortController();

  const poll = async () => {
    while (!abort.signal.aborted) {
      try {
        const currentLedger = await getLatestLedger();
        if (currentLedger > Number(lastLedger)) {
          const events = await getContractEvents(
            factoryContractId,
            "project_created",
            Number(lastLedger) + 1,
            currentLedger
          );

          for (const event of events) {
            if (parseEventSymbol(event.topics[0]) !== "project_created") continue;
            const parsed = parseProjectCreated(event);
            if (!parsed) continue;
            try {
              await handleProjectCreated({
                contract: factoryContractId,
                ledgerSequence: event.ledgerSequence,
                txHash: event.txHash,
                eventIndex: event.eventIndex,
                args: parsed,
              });
              lastLedger = BigInt(event.ledgerSequence);
            } catch (err) {
              logger.error(
                { err, txHash: event.txHash },
                "Factory: error handling ProjectCreated"
              );
            }
          }

          if (events.length === 0) {
            lastLedger = BigInt(currentLedger);
          }
        }
      } catch (err) {
        logger.error({ err, factory: factoryContractId }, "Factory: polling error");
      }

      await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
    }
  };

  void poll();

  factoryStopFn = () => {
    abort.abort();
    factoryStopFn = null;
  };

  logger.info({ factory: factoryContractId }, "Factory watcher: started");
}

export function stopFactoryWatcher() {
  if (factoryStopFn) {
    factoryStopFn();
    logger.info("Factory watcher: stopped");
  }
}
