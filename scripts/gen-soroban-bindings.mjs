#!/usr/bin/env node
/**
 * gen-soroban-bindings.mjs
 * Generates TypeScript bindings from the Soroban WASM artifacts.
 * Requires stellar-cli and built WASM files.
 * Run: node scripts/gen-soroban-bindings.mjs  (or via pnpm gen:soroban)
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const WASM_DIR = join(ROOT, 'contracts-stellar/target/wasm32-unknown-unknown/release');
const OUT_DIR = join(ROOT, 'packages/shared/src/soroban/generated');
const NETWORK = process.env.STELLAR_NETWORK ?? 'testnet';

const CONTRACTS = [
  { name: 'factory', wasm: 'ember_factory.wasm' },
  { name: 'escrow', wasm: 'ember_escrow.wasm' },
  { name: 'nft', wasm: 'ember_position_nft.wasm' },
];

function run(cmd) {
  console.log(`$ ${cmd}`);
  return execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
}

function main() {
  if (!existsSync(WASM_DIR)) {
    console.error(`WASM directory not found: ${WASM_DIR}`);
    console.error("Run 'cargo build --target wasm32-unknown-unknown --release' first.");
    process.exit(1);
  }

  if (existsSync(OUT_DIR)) {
    rmSync(OUT_DIR, { recursive: true });
  }
  mkdirSync(OUT_DIR, { recursive: true });

  for (const { name, wasm } of CONTRACTS) {
    const wasmPath = join(WASM_DIR, wasm);
    if (!existsSync(wasmPath)) {
      console.warn(`Warning: ${wasmPath} not found, skipping ${name}`);
      continue;
    }

    const contractId = process.env[`NEXT_PUBLIC_${name.toUpperCase()}_CONTRACT_ID`] ?? '';
    const idArg = contractId ? `--contract-id ${contractId}` : '';

    run(
      `stellar contract bindings typescript --wasm ${wasmPath} --network ${NETWORK} ${idArg} --output-dir ${join(OUT_DIR, name)}`,
    );
    console.log(`✓ Generated bindings for ${name}`);
  }

  console.log(`✓ Soroban bindings written to ${OUT_DIR}`);
  console.log('Update packages/shared/src/soroban/index.ts to export the generated clients.');
}

main();
