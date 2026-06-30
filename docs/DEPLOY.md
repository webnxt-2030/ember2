# Ember — Deployment Runbook (Stellar branch)

This runbook covers deploying the Stellar/Soroban version of Ember. The Morph EVM
version remains on the `develop` branch; all Stellar work lives on
`develop-stellar`.

## Railway Project Layout

| Service | Type | Notes |
|---|---|---|
| `web` | Next.js (Node) | Exposes HTTP. Volume `uploads` mounted at `/data/uploads`. |
| `indexer` | Node.js process | No public port. Higher restart retries (10) because chain-event reconnect can take longer than a web server. Needs `FACTORY_CONTRACT_ID` before starting. |
| `postgres` | Railway Postgres plugin | Provides `DATABASE_URL`. |
| `redis` | Railway Redis plugin | Provides `REDIS_URL`. |

## First-time Deploy

### 1. Provision services in Railway

1. Create a new Railway project.
2. Add the **Postgres** plugin → note the `DATABASE_URL`.
3. Add the **Redis** plugin → note the `REDIS_URL`.
4. Add a **Volume** named `uploads`; note the mount path `/data/uploads`.
5. Add two services from the monorepo: `web` (root path `apps/web`) and `indexer` (root path `apps/indexer`).
6. Mount the `uploads` volume on the `web` service at `/data/uploads`.

### 2. Set environment variables

Set all variables listed in [Environment Variables](#environment-variables) on the appropriate services before deploying.

**Important:** Set `STORAGE_DRIVER=railway-volume` and `STORAGE_ROOT=/data/uploads` on `web`.

### 3. Run database migration

Before the first deploy, run migrations:

```bash
railway run --service web pnpm --filter @ember/web exec prisma migrate deploy
```

Or set a pre-deploy command in the Railway dashboard:

```
pnpm --filter @ember/web exec prisma migrate deploy
```

### 4. Seed the database (one-time only)

Seed the bootstrap super-admin account. **Run this exactly once — it is not idempotent.**

> **Note:** The seed script (`apps/web/prisma/seed.ts`) is implemented as part of Sprint 1 (Issue #8). Ensure it exists before running this step.

```bash
railway run --service web pnpm --filter @ember/web exec prisma db seed
```

Requires:
- `SEED_SUPER_ADMIN_EMAIL` — email for the initial super admin
- `SEED_SUPER_ADMIN_PASSWORD` — temporary password; **must be changed on first login**

### 5. Deploy services

Deploy in this order:

1. **`web`** — deploy first; it serves the app and exposes `/api/health` for Railway health checks.
2. **`indexer`** — deploy after `FACTORY_CONTRACT_ID` is set (see [Smart Contract Deployment](#smart-contract-deployment)).

### 6. Verify

- `GET /api/health` → `{"status":"ok"}` (200)
- `GET /api/ready` → `{"status":"ok"}` (200) — confirms DB and Redis are reachable

---

## Smart Contract Deployment (one-time)

Prerequisites: [Rust](https://rustup.rs/), the `wasm32-unknown-unknown` target,
and the [Stellar CLI](https://soroban.stellar.org/docs/getting-started/setup).

```bash
cd contracts-stellar
rustup target add wasm32-unknown-unknown
cargo build --target wasm32-unknown-unknown --release
```

### Install WASM hashes

Each contract must be installed on the network before the factory can deploy
instances of escrow/NFT contracts.

```bash
export STELLAR_NETWORK=testnet
export SOURCE_ACCOUNT=S... # your deployer secret key

stellar contract install \
  --wasm target/wasm32-unknown-unknown/release/ember_escrow.wasm \
  --source-account $SOURCE_ACCOUNT \
  --network $STELLAR_NETWORK
# note escrow_wasm_hash

stellar contract install \
  --wasm target/wasm32-unknown-unknown/release/ember_position_nft.wasm \
  --source-account $SOURCE_ACCOUNT \
  --network $STELLAR_NETWORK
# note nft_wasm_hash
```

### Deploy the factory

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/ember_factory.wasm \
  --source-account $SOURCE_ACCOUNT \
  --network $STELLAR_NETWORK \
  -- \
  --admin G... \
  --usdc C... \
  --app_base_uri https://app.ember.example/metadata/ \
  --escrow_wasm_hash <escrow_wasm_hash> \
  --nft_wasm_hash <nft_wasm_hash>
```

After deploy:
1. Copy the deployed factory contract ID from the CLI output.
2. Set `FACTORY_CONTRACT_ID=C...` on both `web` and `indexer` services in Railway.
3. Deploy the `indexer` service.

### Generate TypeScript bindings

```bash
pnpm gen:soroban
```

This invokes `stellar-cli contract bindings typescript` for each contract and
writes the generated clients to `packages/shared/src/soroban/`.

---

## Subsequent Deploys

Railway auto-deploys on push to the connected branch. For schema changes:

```bash
railway run --service web pnpm --filter @ember/web exec prisma migrate deploy
```

Run migrations before the new app version starts (configure as a pre-deploy command in Railway).

---

## Environment Variables

### Both services (`web` + `indexer`)

| Variable | Example | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/ember` | Provided by Railway Postgres plugin. |
| `SHADOW_DATABASE_URL` | `postgresql://user:pass@host:5432/ember_shadow` | Required for `prisma migrate` on managed Postgres. |
| `REDIS_URL` | `redis://default:pass@host:6379` | Provided by Railway Redis plugin. |
| `LOG_LEVEL` | `info` | |

### `web` only

| Variable | Example | Notes |
|---|---|---|
| `BETTER_AUTH_SECRET` | `<32-byte base64>` | Generate: `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `https://app.ember.example` | Must match the Railway domain. |
| `AUTH_GOOGLE_ID` | `….apps.googleusercontent.com` | |
| `AUTH_GOOGLE_SECRET` | | |
| `SEED_SUPER_ADMIN_EMAIL` | `admin@ember.example` | Seed only. |
| `SEED_SUPER_ADMIN_PASSWORD` | `ChangeMeOnFirstLogin!` | Seed only. Change on first login. |
| `RESEND_API_KEY` | `re_…` | |
| `EMAIL_FROM` | `Ember <no-reply@ember.example>` | |
| `RESEND_WEBHOOK_SECRET` | `whsec_…` | |
| `INDEXER_API_KEY` | `<random 32 chars>` | Must match `indexer`'s `INDEXER_API_KEY`. |
| `NEXT_PUBLIC_APP_NAME` | `Ember` | |
| `NEXT_PUBLIC_APP_URL` | `https://app.ember.example` | |
| `NEXT_PUBLIC_STELLAR_NETWORK` | `TESTNET` | `TESTNET`, `PUBLIC`, or `FUTURENET`. |
| `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE` | `Test SDF Network ; September 2015` | |
| `NEXT_PUBLIC_STELLAR_RPC_URL` | `https://soroban-testnet.stellar.org` | Soroban RPC endpoint. |
| `NEXT_PUBLIC_STELLAR_HORIZON_URL` | `https://horizon-testnet.stellar.org` | Horizon endpoint. |
| `NEXT_PUBLIC_STELLAR_EXPLORER_URL` | `https://stellar.expert/explorer/testnet` | |
| `NEXT_PUBLIC_USDC_CONTRACT_ID` | `C...` | USDC (or test token) contract ID. |
| `NEXT_PUBLIC_FACTORY_CONTRACT_ID` | `C...` | Set after smart contract deploy. |
| `STORAGE_DRIVER` | `railway-volume` | |
| `STORAGE_ROOT` | `/data/uploads` | |
| `MAX_UPLOAD_BYTES` | `5242880` | |
| `DEFAULT_VOTING_PERIOD_SECONDS` | `604800` | |
| `SENTRY_DSN` | | Optional. |

### `indexer` only

| Variable | Example | Notes |
|---|---|---|
| `KEEPER_PRIVATE_KEY` | `S...` | Used for automated `resolve_milestone()` calls. |
| `INDEXER_CONFIRMATIONS` | `12` | Ledgers to wait before processing an event. |
| `INDEXER_API_KEY` | `<random 32 chars>` | Must match `web`'s `INDEXER_API_KEY`. |
| `FACTORY_CONTRACT_ID` | `C...` | Set after smart contract deploy. |
| `STELLAR_NETWORK_PASSPHRASE` | `Test SDF Network ; September 2015` | |
| `STELLAR_RPC_URL` | `https://soroban-testnet.stellar.org` | |
| `STELLAR_HORIZON_URL` | `https://horizon-testnet.stellar.org` | |
| `NEXT_PUBLIC_STELLAR_RPC_URL` | `https://soroban-testnet.stellar.org` | |
| `NEXT_PUBLIC_USDC_CONTRACT_ID` | `C...` | |

---

## Backups

Railway Postgres takes daily snapshots with 7-day retention. No action required.

To manually trigger a backup or restore, use the Railway dashboard → Postgres plugin → Backups tab.

**Restore drill** (run before launch):
1. In Railway dashboard, select the Postgres plugin → Backups → choose a snapshot → Restore.
2. Verify `GET /api/ready` returns 200 after restore.
3. Spot-check one row in each critical table: `User`, `Organization`, `Project`, `Contribution`.
