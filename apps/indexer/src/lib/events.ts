/* eslint-disable @typescript-eslint/no-unsafe-call,
   @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import { xdr, Address, scValToNative } from "@stellar/stellar-sdk";
import { sorobanServer } from "./client.js";
import { logger } from "./logger.js";

export interface ContractEvent {
  ledgerSequence: number;
  txHash: string;
  eventIndex: number;
  contractId: string;
  topics: xdr.ScVal[];
  value: xdr.ScVal;
}

export function parseEventSymbol(topic: xdr.ScVal): string | null {
  try {
    return topic.sym().toString();
  } catch {
    return null;
  }
}

export function parseAddress(val: xdr.ScVal): string | null {
  try {
    return Address.fromScVal(val).toString();
  } catch {
    return null;
  }
}

export function parseI128(val: xdr.ScVal): bigint {
  const i128 = val.i128();
  const lo = BigInt(i128.lo().toString());
  const hi = BigInt(i128.hi().toString());
  return (hi << 64n) + lo;
}

export function parseU32(val: xdr.ScVal): number {
  return val.u32();
}

export function parseString(val: xdr.ScVal): string {
  return val.str().toString();
}

export function parseBool(val: xdr.ScVal): boolean {
  return val.b();
}

export function parseVec(val: xdr.ScVal, parser: (v: xdr.ScVal) => unknown): unknown[] {
  return val.vec()?.map(parser) ?? [];
}

export async function getContractEvents(
  contractId: string,
  eventName: string,
  fromLedger: number,
  toLedger: number
): Promise<ContractEvent[]> {
  try {
    const response = await sorobanServer.getEvents({
      startLedger: fromLedger,
      endLedger: toLedger,
      filters: [
        {
          type: "contract",
          contractIds: [contractId],
          topics: [[xdr.ScVal.scvSymbol(eventName).toXDR("base64")]],
        },
      ],
    });

    if (!response?.events) return [];
    return response.events
      .filter((e) => e.type === "contract")
      .map((e, idx) => ({
        ledgerSequence: e.ledger,
        txHash: e.txHash,
        eventIndex: idx,
        contractId: e.contractId,
        topics: e.topic,
        value: e.value,
      }));
  } catch (err) {
    logger.error(
      { err, contractId, eventName, fromLedger, toLedger },
      "Failed to fetch contract events"
    );
    return [];
  }
}

export async function getLatestLedger(): Promise<number> {
  const latest = await sorobanServer.getLatestLedger();
  return latest.sequence;
}

export { scValToNative };
