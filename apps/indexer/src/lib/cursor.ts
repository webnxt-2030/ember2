import { prisma } from "./db.js";

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export async function updateCursor(
  tx: TxClient,
  contract: `0x${string}`,
  eventName: string,
  blockNumber: bigint
) {
  await tx.indexerCursor.upsert({
    where: {
      contract_eventName: {
        contract: contract.toLowerCase(),
        eventName,
      },
    },
    create: {
      contract: contract.toLowerCase(),
      eventName,
      lastBlock: blockNumber,
    },
    update: {
      lastBlock: blockNumber,
    },
  });
}

export async function getCursor(contract: `0x${string}`, eventName: string) {
  const cursor = await prisma.indexerCursor.findUnique({
    where: {
      contract_eventName: {
        contract: contract.toLowerCase(),
        eventName,
      },
    },
  });
  return cursor?.lastBlock ?? null;
}