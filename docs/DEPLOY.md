# Ember — Deployment Runbook

## Railway Project Layout

| Service | Type | Notes |
|---|---|---|
| `web` | Next.js (Node) | Exposes HTTP. Volume `uploads` mounted at `/data/uploads`. |
| `indexer` | Node.js process | No public port. Needs `FACTORY_ADDRESS` before starting. |
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

```bash
railway run --service web pnpm --filter @ember/web exec prisma db seed
```

Requires:
- `SEED_SUPER_ADMIN_EMAIL` — email for the initial super admin
- `SEED_SUPER_ADMIN_PASSWORD` — temporary password; **must be changed on first login**

### 5. Deploy services

Deploy in this order:

1. **`web`** — deploy first; it serves the app and exposes `/api/health` for Railway health checks.
2. **`indexer`** — deploy after `FACTORY_ADDRESS` is set (see [Smart Contract Deployment](#smart-contract-deployment)).

### 6. Verify

- `GET /api/health` → `{"status":"ok"}` (200)
- `GET /api/ready` → `{"status":"ok"}` (200) — confirms DB and Redis are reachable

---

## Smart Contract Deployment (one-time)

```bash
cd contracts
forge build
forge script script/DeployFactory.s.sol \
  --rpc-url $MORPH_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --verify
```

After deploy:
1. Copy the deployed `ProjectFactory` address from the Forge output.
2. Set `NEXT_PUBLIC_FACTORY_ADDRESS=0x…` on both `web` and `indexer` services in Railway.
3. Deploy the `indexer` service.

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
| `NEXT_PUBLIC_REOWN_PROJECT_ID` | | From cloud.reown.com. |
| `NEXT_PUBLIC_APP_NAME` | `Ember` | |
| `NEXT_PUBLIC_APP_URL` | `https://app.ember.example` | |
| `NEXT_PUBLIC_MORPH_CHAIN_ID` | `2818` | |
| `NEXT_PUBLIC_MORPH_RPC_URL` | `https://rpc.morphl2.io` | |
| `NEXT_PUBLIC_MORPH_EXPLORER_URL` | `https://explorer.morphl2.io` | |
| `NEXT_PUBLIC_USDT_ADDRESS` | `0xc7d67a9cbb121b3b0b9c053dd9f469523243379a` | |
| `NEXT_PUBLIC_FACTORY_ADDRESS` | `0x…` | Set after smart contract deploy. |
| `STORAGE_DRIVER` | `railway-volume` | |
| `STORAGE_ROOT` | `/data/uploads` | |
| `MAX_UPLOAD_BYTES` | `5242880` | |
| `DEFAULT_VOTING_PERIOD_SECONDS` | `604800` | |
| `SENTRY_DSN` | | Optional. |

### `indexer` only

| Variable | Example | Notes |
|---|---|---|
| `KEEPER_PRIVATE_KEY` | `0x…` | Used for automated `resolveMilestone()` calls. |
| `INDEXER_CONFIRMATIONS` | `12` | Blocks to wait before processing an event. |
| `INDEXER_API_KEY` | `<random 32 chars>` | Must match `web`'s `INDEXER_API_KEY`. |
| `NEXT_PUBLIC_FACTORY_ADDRESS` | `0x…` | Set after smart contract deploy. |
| `NEXT_PUBLIC_MORPH_CHAIN_ID` | `2818` | |
| `NEXT_PUBLIC_MORPH_RPC_URL` | `https://rpc.morphl2.io` | |
| `NEXT_PUBLIC_USDT_ADDRESS` | `0xc7d67a9cbb121b3b0b9c053dd9f469523243379a` | |

---

## Backups

Railway Postgres takes daily snapshots with 7-day retention. No action required.

To manually trigger a backup or restore, use the Railway dashboard → Postgres plugin → Backups tab.

**Restore drill** (run before launch):
1. In Railway dashboard, select the Postgres plugin → Backups → choose a snapshot → Restore.
2. Verify `GET /api/ready` returns 200 after restore.
3. Spot-check one row in each critical table: `User`, `Organization`, `Project`, `Contribution`.
