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
- **Coming-soon sweeper** — 24h before a milestone's `deliverableDate`, if status is still `PENDING` and `comingSoonNotifiedAt` is unset, the keeper queues `MILESTONE_VOTE_COMING_SOON` emails to all project backers and marks the milestone as notified. Idempotent: a milestone is never notified twice.

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

### Milestone management (org owner)
- `/org/dashboard/[orgId]/projects/[id]` — Project detail for org owners with stats, milestones timeline, and per-milestone action cards.
- `/org/dashboard/[orgId]/projects/[id]/milestones/[mid]` — Milestone detail with description, update note, and submit-for-vote form.
- `POST /api/projects/[id]/milestones/[mid]/submit` — Validates org ownership, guards m0 (not submittable) and `PENDING` status, accepts `updateNote` markdown, writes `updateUri` and `updateNote` optimistically, and returns `submitMilestone` calldata.
- The on-chain `MilestoneSubmitted` event is indexed by `apps/indexer`, which reconciles the milestone status to `VOTING`.

### Auth + Email triggers
- `WELCOME` email is queued via Better Auth `databaseHooks` on every new user creation (Google OAuth or credentials).
- `CONTRIBUTION_RECEIVED` email is queued by the indexer when a `Contributed` event is observed.
- `MILESTONE_VOTE_OPEN`, `MILESTONE_VOTE_OUTCOME`, `MILESTONE_CLAIMED` emails are queued by the indexer on the corresponding on-chain events.
- `MILESTONE_UPDATED` email is queued by the web app when an org owner edits a project's milestones.
- `ORG_VERIFIED` / `ORG_REJECTED` emails are queued when a Super Admin updates an org's verification status.
- `ADMIN_INVITATION` emails are queued when a Super Admin creates an organization and assigns owners.

## Sprint 4

### NFT Metadata Endpoint
- `GET /api/nft/[contract]/[tokenId]` — Returns ERC-721 metadata JSON regenerated on the fly from the `Contribution` table.
- `Cache-Control: public, max-age=60`.
- Image URL points to `<NEXT_PUBLIC_APP_URL>/og/nft/<contract>/<tokenId>`.
- Metadata includes `name`, `description`, `image`, and standard `attributes` array with `Project` (slug), `Amount (USDT)`, `M0 Share (USDT)`, and `Contributed At`.
- Queries via `getContributionByNft` helper in `lib/db/contributions.ts`.
- Case-insensitive contract address matching via Prisma `Citext`.
- Covered by unit tests in `route.test.ts`.

### Organization Public Page
- `/organizations/[slug]` — Public organization profile with projects list and verification badge.
- `GET /api/organizations/[id]` — Public API returning org profile, live projects, and members.
- Verification badge uses tertiary (green) styling per BRAND.md.

### Backer Dashboard
- `/dashboard` — Summary cards (total contributed, positions count, active votes) plus recent activity and active votes panels.
- `/dashboard/contributions` — List of all user contributions across projects with progress and allocation summary.
- `/dashboard/contributions/[id]` — Detail view with NFT metadata, allocation breakdown per milestone, and on-chain links.
- `GET /api/users/me/contributions` — Authed paginated API for current user's contributions.
- Wallet verify endpoint back-fills past contributions: links unlinked `Contribution` rows to the user when a wallet is verified via SIWE.

## Sprint 5

### Claim Milestone Flow
- `POST /api/projects/[id]/milestones/[index]/claim` — Returns encoded calldata for `ProjectEscrow.claimMilestone(index)`.
  - Auth: org owner (via `assertOwnsOrg`).
  - Guards: milestone must be `PASSED`, not already `CLAIMED`, and project must have an `escrowAddress`.
- `ClaimButton` (`components/milestones/claim-button.tsx`) — Client component that:
  - Verifies the connected wallet matches the organization's `receivingWallet`.
  - Uses wagmi hooks (`useSimulateContract`, `useWriteContract`, `useWaitForTransactionReceipt`) to send the claim transaction.
  - Shows a confirmation step before sending.
  - Displays success state with a Morph Explorer link.
  - On error, maps contract revert reasons (`OnlyOrg`, `MilestoneNotPassed`) to human-readable messages.
- Org dashboard project detail page (`/org/dashboard/[orgId]/projects/[id]`) lists milestones with status, allocation, and a claim button for `PASSED` milestones.
- Org dashboard milestone detail page (`/org/dashboard/[orgId]/projects/[id]/milestones/[mid]`) shows vote results and a dedicated claim panel.
- UI reflects `CLAIMED` only after the indexer observes the `MilestoneClaimed` event and updates the DB (chain is source of truth).

### Backer Votes Dashboard
- `/dashboard/votes` — Active and historical votes for projects the user has backed.
- Active votes panel:
  - Shows milestones in `VOTING` status for projects the user contributed to.
  - Displays whether the user has already voted (and their choice).
  - Renders a live tally bar (YES vs NO) and voting end date.
- Historical votes panel:
  - Shows all `MilestoneVote` rows cast by the user's linked wallets.
  - Displays vote choice badge, final milestone status, and outcome.
  - Includes vote weight and date cast.
- Queries use the user's linked `Wallet` addresses to find both active milestones (via `Contribution.backerId`) and historical votes (via `MilestoneVote.walletAddress`).

### Voting UI + Vote Transaction
- Voting panel rendered inside `MilestoneTimeline` when a milestone status is `VOTING`.
- `GET /api/projects/{slug}/milestones/{index}/votes` — Returns vote totals (weightYes, weightNo), vote window timing, and optional user-specific data when a `wallet` query parameter is provided.
- `VotePanel` (`components/vote/vote-panel.tsx`) — Client component that:
  - Fetches vote data from the API.
  - Reads on-chain voting power via `ProjectEscrow.votingPowerOf(address)`.
  - Displays a split tally bar (tertiary YES / error NO) annotated as indexer-lagged.
  - Shows a live countdown timer for the voting window.
  - Handles vote transaction via wagmi (`useSimulateContract`, `useWriteContract`, `useWaitForTransactionReceipt`).
  - Enforces one vote per backer in the UI (disabled after voting, checked against DB and contract reverts).
  - Opens Reown AppKit modal if the user is not connected.
- The contract enforces:
  - `AlreadyVoted` — one vote per backer per milestone.
  - `NotABacker` — only contributors can vote.
  - `VotingWindowClosed` — votes only accepted during the active window.

## Sprint 6

### Activity Logging
- `logActivity` helper in `lib/activity-log.ts` — append-only audit log capturing `actorUserId`, `actorWallet`, `type`, `targetType`, `targetId`, `metadata`, `ipAddress`, `userAgent`.
- Written on all state-changing paths (auth, org, project, milestone, contribution, email).

### Admin Users Management
- `/admin/users` — Super Admin only. Search by email or wallet, paginated table.
- `GET /api/admin/users` — Returns paginated users with wallets and org count.
- `PATCH /api/admin/users/[id]` — Updates user role with guard: cannot demote self if last super admin. Writes `ADMIN_ACTION` log.

### Admin Projects Management
- `/admin/projects` — Super Admin only. Search by title or slug, paginated table.
- `GET /api/admin/projects` — Returns all projects with org title, target, raised, status.
- `POST /api/admin/projects/[id]/pause` — Sets status to `PAUSED`, writes `PROJECT_PAUSED` log.
- `POST /api/admin/projects/[id]/cancel` — Sets status to `CANCELLED`, writes `PROJECT_CANCELLED` log.
- Pause hides projects from `/projects` and disables contribute off-chain; cancel blocks contributions entirely.

### Admin Audit Logs
- `/admin/audit-logs` — Super Admin only. Filterable, paginated view of all `ActivityLog` rows.
- `GET /api/admin/audit-logs` — Supports filtering by `type`, `q` (actor email/wallet, target), `from`/`to` date range, and pagination.
- Client-side CSV export of the current result set.

### Admin Email Log + Retry
- `/admin/emails` — Super Admin only. Filterable, paginated view of `EmailNotification` rows.
- `GET /api/admin/emails` — Supports filtering by `status` and `q` (recipient or template).
- `POST /api/admin/emails/[id]/retry` — Resets a `FAILED` email to `QUEUED` for re-delivery. Writes `ADMIN_ACTION` log.

### Admin Reports
- `/admin/reports` — Super Admin only. Aggregate dashboard with cards for:
  - Total users, organizations, projects, contributions
  - Breakdowns by role, verification status, project status, email status
  - Total USDT raised across all contributions
- `GET /api/admin/reports` — Returns all aggregate counts.

### Admin Settings
- `/admin/settings` — Super Admin only. Read-only view of key platform environment configuration (factory contract, USDT contract, explorer URL, webhook secrets masked).

## Sprint 7

### Backer Notifications
- `InAppNotification` model — per-user notifications with `type`, `title`, `message`, `linkUrl`, `readAt`, `createdAt`.
- Triggered alongside every email notification:
  - `WELCOME` — on user creation (auth hook).
  - `CONTRIBUTION_RECEIVED` — on `Contributed` event (indexer).
  - `MILESTONE_VOTE_OPEN` — on `MilestoneSubmitted` event (indexer).
  - `MILESTONE_VOTE_OUTCOME` — on `MilestoneResolved` event (indexer).
  - `MILESTONE_CLAIMED` — on `MilestoneClaimed` event (indexer).
  - `MILESTONE_UPDATED` — on live project milestone edits (web API).
  - `ORG_VERIFIED` / `ORG_REJECTED` — on admin verify/reject (web API).
  - `ADMIN_INVITATION` — on org creation (web API).
- `GET /api/users/me/notifications` — Paginated in-app notifications + unread count, or email log by `to` address.
- `PATCH /api/users/me/notifications/[id]/read` — Mark single in-app notification as read.
- `/dashboard/notifications` — Tabbed UI for in-app notifications (with mark-as-read) and email history.

### Backer Settings
- `EmailPreference` model — per-user, per-template unsubscribe state.
- `GET /api/users/me/settings` — Returns user profile, linked wallets, and email preferences.
- `PATCH /api/users/me/settings` — Updates `name` and `image`.
- `PATCH /api/users/me/email-preferences` — Upserts an `EmailPreference` row for a template.
- `/dashboard/settings` — Profile editing, wallet management (set primary, unlink), and email preference toggles per template.

## Issue #136

### About Page
- `/about` — Static page with platform overview, mission, technology stack, and CTAs linking to `/projects` and `/how-it-works`.

## Issue #137

### Legal Pages
- `/legal/terms` — Terms of Service static page.
- `/legal/privacy` — Privacy Policy static page.
- `apps/web/app/legal/layout.tsx` — Shared layout for legal pages with Container wrapper.

## Issue #138

### Org Settings Page
- `/org/dashboard/[orgId]/settings` — Dedicated org profile settings page for Org Owners.
- Editable fields: `title`, `description`, `logoUrl`, `website`, `receivingWallet`.
- Warning displayed when `receivingWallet` changes on a VERIFIED org (will reset verification to PENDING).
- `PATCH /api/organizations/[id]` extended to accept `receivingWallet`; resets `verifiedStatus` to PENDING when wallet changes.

## Issue #139

### Org Verify / Reject Endpoints
- `POST /api/organizations/[id]/verify` — Super Admin only. Sets `verifiedStatus = VERIFIED`, queues `ORG_VERIFIED` email + in-app notification to org owners, writes `ORG_VERIFIED` activity log. Returns 409 if already VERIFIED.
- `POST /api/organizations/[id]/reject` — Super Admin only. Accepts optional `{ reason }` body. Sets `verifiedStatus = REJECTED`, queues `ORG_REJECTED` email + in-app notification, writes `ORG_REJECTED` activity log. Returns 409 if already REJECTED.
- Both endpoints are rate-limited at 10 req/min per IP.

## Issue #140

### File Upload and Serving
- `POST /api/upload` — Authed. Accepts `multipart/form-data` with a `file` field. Validates MIME type (jpeg/png/webp/gif) and max size (`MAX_UPLOAD_BYTES`, default 5 MB). Returns `{ url }` pointing at `/api/files/<key>`. Rate-limited at 10 req/min per IP.
- `GET /api/files/[...path]` — Public. Streams the stored file with `Content-Type` and `Cache-Control: public, max-age=31536000, immutable`. Blocks path traversal. Returns 404 for missing files.
- `lib/storage.ts` — Storage driver abstraction. `STORAGE_DRIVER` env selects: `railway-volume` (default, uses `STORAGE_ROOT`) or `minio`/`s3` (requires `@aws-sdk/client-s3` and `S3_*` env vars).
