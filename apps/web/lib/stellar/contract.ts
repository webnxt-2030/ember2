/**
 * Soroban contract invocation helpers for the Ember web app.
 */

import {
  Account,
  Contract,
  rpc,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import type { xdr } from "@stellar/stellar-sdk";
import { networkPassphrase, rpcUrl } from "./config";
import type { useStellarWallet } from "@/components/providers/stellar-provider";

export const sorobanServer = new rpc.Server(rpcUrl, {
  allowHttp: rpcUrl.startsWith("http://"),
});

export function getNetworkPassphrase() {
  return networkPassphrase;
}

export function buildContractCall(
  source: string,
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  fee = "100",
) {
  const contract = new Contract(contractId);
  const account = new Account(source, "0");
  return new TransactionBuilder(account, {
    fee,
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();
}

export async function simulateAndSubmit(
  wallet: ReturnType<typeof useStellarWallet>["wallet"],
  contractId: string,
  method: string,
  args: xdr.ScVal[],
) {
  if (!wallet) throw new Error("Wallet not connected");

  const tx = buildContractCall(wallet.address, contractId, method, args);
  const simulated = await sorobanServer.simulateTransaction(tx);

  if (!rpc.Api.isSimulationSuccess(simulated)) {
    throw new Error(
      `Simulation failed for ${method}: ${JSON.stringify(simulated)}`,
    );
  }

  const prepared = rpc.assembleTransaction(tx, simulated).build();
  const signedXdr = await wallet.signTransaction(prepared.toXDR());
  const signedTx = TransactionBuilder.fromXDR(signedXdr, getNetworkPassphrase());
  const result = await sorobanServer.sendTransaction(signedTx);

  if (result.status !== "PENDING") {
    throw new Error(`Transaction failed: ${result.status}`);
  }

  // Poll for completion
  let txResult = await sorobanServer.getTransaction(result.hash);
  const start = Date.now();
  while (txResult.status === rpc.Api.GetTransactionStatus.NOT_FOUND && Date.now() - start < 30_000) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    txResult = await sorobanServer.getTransaction(result.hash);
  }

  if (txResult.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error(`Transaction not successful: ${txResult.status}`);
  }

  return {
    txHash: result.hash,
    resultXdr: txResult.resultXdr,
  };
}

export async function readContract(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  source = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
) {
  const tx = buildContractCall(source, contractId, method, args);
  const simulated = await sorobanServer.simulateTransaction(tx);
  if (!rpc.Api.isSimulationSuccess(simulated)) {
    throw new Error(`Read failed for ${method}`);
  }
  return simulated.result;
}
