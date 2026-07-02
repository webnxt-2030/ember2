/* eslint-disable @typescript-eslint/no-unsafe-call,
   @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Keypair, Horizon } from "@stellar/stellar-sdk";
import SorobanRpc from "@stellar/stellar-sdk/rpc";
import { indexerEnv } from "./env.js";

export const sorobanServer = new SorobanRpc.Server(
  indexerEnv.STELLAR_RPC_URL,
  { allowHttp: indexerEnv.STELLAR_RPC_URL.startsWith("http://") }
);

export const horizonServer = new Horizon.Server(
  indexerEnv.STELLAR_HORIZON_URL,
  { allowHttp: indexerEnv.STELLAR_HORIZON_URL.startsWith("http://") }
);

export const keeperKeypair = Keypair.fromSecret(indexerEnv.KEEPER_PRIVATE_KEY);

export { indexerEnv } from "./env.js";
