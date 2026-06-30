import { prisma } from "./db.js";

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * On the Stellar branch the `lastBlock` column stores the latest processed
 * Stellar ledger sequence. The column name is kept to avoid a schema migration.
 */
export async function updateCursor(
  tx: TxClient,
  contract: string,
  eventName: string,
  lastLedger: bigint
) {
  await tx.indexerCursor.upsert({
    where: {
      contract_eventName: {
        contract,
        eventName,
      },
    },
    create: {
      contract,
      eventName,
      lastBlock: lastLedger,
    },
    update: {
      lastBlock: lastLedger,
    },
  });
}

export async function getCursor(contract: string, eventName: string) {
  const cursor = await prisma.indexerCursor.findUnique({
    where: {
      contract_eventName: {
        contract,
        eventName,
      },
    },
  });
  return cursor?.lastBlock ?? null;
}
