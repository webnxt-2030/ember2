import type { xdr } from "@stellar/stellar-sdk";
import { logger } from "../lib/logger.js";
import { prisma } from "../lib/db.js";
import { handleContributed } from "../handlers/contributed.js";
import { handleVoted } from "../handlers/voted.js";
import { handleMilestoneSubmitted } from "../handlers/milestone-submitted.js";
import { handleMilestoneResolved } from "../handlers/milestone-resolved.js";
import { handleMilestoneClaimed } from "../handlers/milestone-claimed.js";
import { getCursor } from "../lib/cursor.js";
import {
  getContractEvents,
  getLatestLedger,
  parseAddress,
  parseU32,
  parseI128,
  parseString,
  parseBool,
} from "../lib/events.js";

const POLLING_INTERVAL = 1_000;
const MAX_LEDGER_RANGE = 1_000;
const FALLBACK_LEDGER_RANGE = 100;

const escrowWatchers = new Map<string, () => void>();

const escrowEvents = [
  { name: "Contributed" as const, symbol: "contrib", handler: handleContributed },
  { name: "Voted" as const, symbol: "voted", handler: handleVoted },
  { name: "MilestoneSubmitted" as const, symbol: "submit", handler: handleMilestoneSubmitted },
  { name: "MilestoneResolved" as const, symbol: "resolved", handler: handleMilestoneResolved },
  { name: "MilestoneClaimed" as const, symbol: "claimed", handler: handleMilestoneClaimed },
];

async function getEscrowStartLedger(escrowContractId: string) {
  let earliest: bigint | null = null;
  for (const { name } of escrowEvents) {
    const cursor = await getCursor(escrowContractId, name);
    if (cursor !== null && (earliest === null || cursor < earliest)) {
      earliest = cursor;
    }
  }
  return earliest;
}

function parseContributed(topics: xdr.ScVal[], value: xdr.ScVal[]) {
  const backer = parseAddress(topics[1]);
  if (!backer) throw new Error("Failed to parse backer address");
  return {
    backer,
    amount: parseI128(value[0]),
    tokenId: parseU32(value[1]),
    m0Share: parseI128(value[2]),
  };
}

function parseVoted(topics: xdr.ScVal[], value: xdr.ScVal[]) {
  const voter = parseAddress(topics[2]);
  if (!voter) throw new Error("Failed to parse voter address");
  return {
    milestoneIndex: parseU32(topics[1]),
    voter,
    yes: parseBool(value[0]),
    weight: parseI128(value[1]),
  };
}

function parseMilestoneSubmitted(topics: xdr.ScVal[], value: xdr.ScVal[]) {
  return {
    milestoneIndex: parseU32(topics[1]),
    updateURI: parseString(value[0]),
    voteEndAt: parseU32(value[1]),
  };
}

function parseMilestoneResolved(topics: xdr.ScVal[], value: xdr.ScVal[]) {
  return {
    milestoneIndex: parseU32(topics[1]),
    passed: parseBool(value[0]),
    weightYes: parseI128(value[1]),
    weightNo: parseI128(value[2]),
  };
}

function parseMilestoneClaimed(topics: xdr.ScVal[], value: xdr.ScVal) {
  return {
    milestoneIndex: parseU32(topics[1]),
    amount: parseI128(value),
  };
}

async function dispatchEvent(
  escrowContractId: string,
  eventName: typeof escrowEvents[number]["name"],
  event: {
    ledgerSequence: number;
    txHash: string;
    eventIndex: number;
    topics: xdr.ScVal[];
    value: xdr.ScVal;
  }
) {
  const ctx = {
    contract: escrowContractId,
    ledgerSequence: event.ledgerSequence,
    txHash: event.txHash,
    eventIndex: event.eventIndex,
  };

  switch (eventName) {
    case "Contributed": {
      const data = event.value.vec();
      if (!data) return true;
      return handleContributed({ ...ctx, args: parseContributed(event.topics, data) });
    }
    case "Voted": {
      const data = event.value.vec();
      if (!data) return true;
      return handleVoted({ ...ctx, args: parseVoted(event.topics, data) });
    }
    case "MilestoneSubmitted": {
      const data = event.value.vec();
      if (!data) return true;
      return handleMilestoneSubmitted({
        ...ctx,
        args: parseMilestoneSubmitted(event.topics, data),
      });
    }
    case "MilestoneResolved": {
      const data = event.value.vec();
      if (!data) return true;
      return handleMilestoneResolved({
        ...ctx,
        args: parseMilestoneResolved(event.topics, data),
      });
    }
    case "MilestoneClaimed": {
      return handleMilestoneClaimed({
        ...ctx,
        args: parseMilestoneClaimed(event.topics, event.value),
      });
    }
    default:
      return true;
  }
}

export async function backfillEscrow(escrowContractId: string, fromLedgerOverride?: number) {
  const cursorLedger = await getEscrowStartLedger(escrowContractId);
  const toLedger = await getLatestLedger();
  const fromLedger =
    fromLedgerOverride ??
    (cursorLedger !== null
      ? Number(cursorLedger) + 1
      : Math.max(toLedger - FALLBACK_LEDGER_RANGE, 1));

  if (fromLedger > toLedger) return;

  logger.info(
    { escrow: escrowContractId, fromLedger, toLedger },
    "Escrow: backfilling events"
  );

  for (const { name, symbol } of escrowEvents) {
    for (let batchFrom = fromLedger; batchFrom <= toLedger; batchFrom += MAX_LEDGER_RANGE) {
      const batchTo = Math.min(batchFrom + MAX_LEDGER_RANGE - 1, toLedger);
      const events = await getContractEvents(
        escrowContractId,
        symbol,
        batchFrom,
        batchTo
      );
      for (const event of events) {
        await dispatchEvent(escrowContractId, name, event);
      }
    }
  }

  logger.info({ escrow: escrowContractId }, "Escrow: backfill complete");
}

async function startEscrowWatcher(escrowContractId: string) {
  if (escrowWatchers.has(escrowContractId)) return;

  logger.info({ escrow: escrowContractId }, "Escrow watcher: starting");

  const abortControllers = new Map<string, AbortController>();

  for (const { name, symbol } of escrowEvents) {
    const cursor = await getCursor(escrowContractId, name);
    let lastLedger = cursor ?? BigInt(await getLatestLedger());
    const abort = new AbortController();
    abortControllers.set(name, abort);

    const poll = async () => {
      while (!abort.signal.aborted) {
        try {
          const currentLedger = await getLatestLedger();
          if (currentLedger > Number(lastLedger)) {
            const events = await getContractEvents(
              escrowContractId,
              symbol,
              Number(lastLedger) + 1,
              currentLedger
            );

            for (const event of events) {
              try {
                const ok = await dispatchEvent(escrowContractId, name, event);
                if (ok) {
                  lastLedger = BigInt(event.ledgerSequence);
                }
              } catch (err) {
                logger.error(
                  { err, event: name, txHash: event.txHash },
                  "Escrow: error handling event"
                );
              }
            }

            if (events.length === 0) {
              lastLedger = BigInt(currentLedger);
            }
          }
        } catch (err) {
          logger.error(
            { err, escrow: escrowContractId, event: name },
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
    escrowWatchers.delete(escrowContractId);
  };

  escrowWatchers.set(escrowContractId, combinedStop);
  logger.info({ escrow: escrowContractId }, "Escrow watcher: started");
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
      await backfillEscrow(project.escrowAddress);
      void startEscrowWatcher(project.escrowAddress);
    }
  }
}

export function addEscrowWatcher(escrowContractId: string) {
  void startEscrowWatcher(escrowContractId);
}

export function stopAllEscrowWatchers() {
  for (const [contractId, stop] of escrowWatchers) {
    stop();
    logger.info({ escrow: contractId }, "Escrow watcher: stopped");
  }
  escrowWatchers.clear();
}

export async function startEscrowWatchers() {
  await startEscrowWatchersForKnownProjects();
}
