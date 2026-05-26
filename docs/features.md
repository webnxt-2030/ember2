# Features

## Indexer (`apps/indexer`)

A standalone Node.js service that watches onchain events and mirrors state into Postgres.

### Factory watcher — `ProjectCreated`
- Subscribes to `ProjectFactory.ProjectCreated` events.
- After `INDEXER_CONFIRMATIONS` (default 12), updates the matching `Project` row by `onChainId` with:
  - `escrowAddress`
  - `nftAddress`
  - `status = LIVE`
  - `publishedAt = now()`
- Reconciles idempotently with the `publish/confirm` flow; either path can set the addresses.
- Backfills from the last cursor block on startup.

### Escrow watcher — `Contributed`
- Watches `Contributed` events on every known `ProjectEscrow` contract.
- After confirmations, inserts a `Contribution` row (keyed by `txHash`) with:
  - `amount`, `m0Share`, `tokenId`, `contract`, `txHash`, `blockNumber`, `logIndex`
- Updates `Project.totalRaised` via atomic increment.
- Enqueues a `CONTRIBUTION_RECEIVED` email for linked backers.
- Idempotent via `txHash` upsert.

### Additional escrow events
- `MilestoneSubmitted` — sets milestone to `VOTING`, stores `updateUri` / `voteEndAt`.
- `Voted` — inserts `MilestoneVote` (unique by `txHash + logIndex`).
- `MilestoneResolved` — updates milestone to `PASSED` or `FAILED`, enqueues outcome emails.
- `MilestoneClaimed` — updates milestone to `CLAIMED`.

### Keeper
- Runs every 60s, calls `resolveMilestone()` on any milestone whose `voteEndAt` has passed and status is `VOTING`.

### Email worker
- Polls `EmailNotification` table every 10s for `QUEUED` rows.
- Uses BullMQ + Redis for reliable delivery with retries.
- Updates row status to `SENT` or `FAILED`.

### Cursor tracking
- `IndexerCursor` table stores `lastBlock` per `(contract, eventName)`.
- Used for backfill and crash recovery.

## Web app (`apps/web`)

### Project publish/confirm
- `POST /api/projects/[id]/publish` returns encoded calldata for `ProjectFactory.createProject`.
- `POST /api/projects/[id]/publish/confirm` waits 12 confirmations, parses `ProjectCreated` event, and persists `onChainId`, `escrowAddress`, `nftAddress`, and `status = LIVE`.
- Idempotent: repeating the confirm call is a no-op if the project is already `LIVE`.

## Sprint 4

### NFT Metadata Endpoint
- `GET /api/nft/[contract]/[tokenId]` — Returns ERC-721 metadata JSON regenerated on the fly from the `Contribution` table.
- `Cache-Control: public, max-age=60`.
- Metadata includes project info, amount, m0Share, allocatedRemaining, and standard ERC-721 attributes.

### Organization Public Page
- `/organizations/[slug]` — Public organization profile with projects list and verification badge.
- `GET /api/organizations/[id]` — Public API returning org profile, live projects, and members.
- Verification badge uses tertiary (green) styling per BRAND.md.
