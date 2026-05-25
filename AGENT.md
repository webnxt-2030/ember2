# AGENT.md — Coding Agent Guide for Ember

This file tells you (the coding agent) **how to build** the Ember crowdfunding dApp. The companion `SPEC.md` defines **what to build**. Read SPEC.md first, then this file, before writing any code.

If the two disagree on *what*, SPEC.md wins. If they disagree on *how*, this file wins. If something is ambiguous in both, **ask the human** before guessing.

---

## 1. Mental Model

You are building a **trust-minimized crowdfunding platform**. The single most important property is: **backer funds cannot leave the escrow contract except via the rules encoded in the contract**. Your off-chain code (Next.js, Prisma, indexer) is a UI and accounting mirror over an onchain source of truth. When the two disagree, **the chain is right**. Build accordingly: never display "claimed" until the on-chain event is observed; never act on a contribution until the tx has the configured confirmations.

Second-most important: **the activity log is the customer-support and legal record**. Every state-changing action must produce a log entry. If you find a code path that mutates state without logging, that's a bug.

---

## 2. Versions — Use These Exact Floors

Latest verified May 2026. Use these as **minimum** versions; `pnpm add` the latest in each major line at install time.

| Package | Min version |
| --- | --- |
| `next` | `16.2.6` |
| `react`, `react-dom` | `19.2.6` |
| `typescript` | `5.6` |
| `prisma`, `@prisma/client` | `7.8.0` |
| `tailwindcss`, `@tailwindcss/postcss` | `4.2.0` |
| `better-auth` | latest (≥ 1.0) |
| `wagmi` | `3.6.11` |
| `viem` | `2.x` |
| `@reown/appkit`, `@reown/appkit-adapter-wagmi` | `1.8.x` |
| `resend` | latest |
| `react-email`, `@react-email/components` | `6.x` |
| `bullmq`, `ioredis` | latest |
| `zod` | latest 4.x |
| `react-hook-form`, `@hookform/resolvers` | latest |
| OpenZeppelin Contracts (forge) | `v5.5.0` |
| Solidity | `^0.8.28` |
| Foundry | latest (`foundryup`) |
| Node.js | `22.x LTS` |
| pnpm | `10.x` |

Pin via `pnpm install` so the lockfile records the exact resolution. **Never** use `^` ranges in CI for security-sensitive packages; pin `next-auth`-equivalent, `better-auth`, and Web3 libraries to exact versions in `package.json`.

Run `pnpm audit --prod` in CI; fail on high/critical.

---

## 3. Repository Setup

```bash
mkdir ember && cd ember
pnpm init
# Add pnpm-workspace.yaml:
#   packages:
#     - "apps/*"
#     - "packages/*"

# Web app
pnpm create next-app@latest apps/web --typescript --tailwind --app --src-dir=false --import-alias='@/*' --turbopack
# Strip defaults you don't need, then:
cd apps/web && pnpm add prisma @prisma/client better-auth resend react-email @react-email/components \
  wagmi viem @reown/appkit @reown/appkit-adapter-wagmi @tanstack/react-query \
  zod react-hook-form @hookform/resolvers bullmq ioredis \
  react-markdown remark-gfm rehype-sanitize
cd ../..

# Indexer
mkdir -p apps/indexer/src && cd apps/indexer
pnpm init && pnpm add viem ioredis bullmq @prisma/client pino
pnpm add -D typescript tsx @types/node
cd ../..

# Contracts (Foundry)
mkdir contracts && cd contracts
forge init --no-commit
forge install OpenZeppelin/openzeppelin-contracts@v5.5.0
cd ..
```

Set `"packageManager": "pnpm@10.x.x"` in the root `package.json` and use `corepack enable` everywhere.

---

## 4. Coding Standards

### 4.1 TypeScript
- `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`.
- No `any`. If you truly need to escape, use `unknown` and narrow with Zod.
- All shared types in `packages/shared/src/types`. ABIs in `packages/shared/src/abis`, generated from forge by a `pnpm gen:abis` script.

### 4.2 Next.js (App Router)
- Server-first: components are RSC by default; only mark `"use client"` when you need state, event handlers, or browser-only APIs.
- Mutations: **prefer Server Actions** for forms; use Route Handlers (`app/api/.../route.ts`) for endpoints that are called by non-form clients (webhooks, mobile clients, the indexer).
- Use `cookies()` and `headers()` from `next/headers`. Do not roll your own session reads.
- Cache: use `revalidateTag` / `revalidatePath` after mutations. Tag reads with their domain (`projects`, `org:{id}`, `project:{id}`).
- Never put secrets in `next.config.ts` `env`; use `process.env` server-side only. Prefix only what's truly public with `NEXT_PUBLIC_`.

### 4.3 React
- Functional components, no class components.
- Co-locate component-level state. Lift state only when shared.
- Lists need stable `key`s — never use array index for dynamic lists.
- For web3 reads/writes, use **wagmi v3 hooks** (`useReadContract`, `useWriteContract`, `useSimulateContract`) and the `@tanstack/react-query` client wagmi configures internally. Don't bypass into raw viem unless wagmi lacks a primitive.

### 4.4 Tailwind v4
- CSS-first config in `app/globals.css` via `@theme`. **No `tailwind.config.js`.**
- Use semantic CSS variables for colors (`--color-brand`, `--color-surface`, etc.) so dark mode is `[data-theme="dark"]` overrides.
- Use shadcn/ui patterns where they fit; vendor the components into `components/ui/` (don't depend on a registry at runtime).

### 4.5 Prisma
- Schema in `apps/web/prisma/schema.prisma`. One migration per feature. Never edit applied migrations — generate a new one.
- Add the `citext` extension in the first migration: `CREATE EXTENSION IF NOT EXISTS citext;`. Required for case-insensitive wallet address columns.
- All Prisma calls happen in `apps/web/lib/db/` modules grouped by domain (`projects.ts`, `orgs.ts`, `users.ts`). Route handlers and server actions call these — they do not call `prisma` directly.
- Use `prisma.$transaction` for any multi-write operation. Set transaction `isolationLevel: 'Serializable'` for vote-tally writes if you ever do those off-chain (you shouldn't — the indexer aggregates).
- Use `Decimal` (Prisma) for all money; never `number`. Same goes for milestone basis points (use `Int`).

### 4.6 Auth
- **Better Auth** with Prisma adapter and the `nextCookies()` plugin (required for Server Actions to set cookies correctly).
- Three providers: Google, credentials (for super admin only — guard the route by `role`), and SIWE for wallet linking (custom plugin or simple `/api/auth/wallet/*` flow).
- Sessions: JWT strategy with 30-day expiry; rotate on every sign-in.
- All API handlers and Server Actions begin with `const session = await auth.api.getSession({ headers: await headers() })` then `assertRole(session, ...)`.
- Centralize permission helpers in `apps/web/lib/auth/permissions.ts`. Test every helper in isolation with role-permutation tables.

### 4.7 Validation (Zod)
- One Zod schema per request shape, exported from `packages/shared/src/schemas`.
- Reuse them on the client (React Hook Form `zodResolver`) and the server (route handler / server action). **No duplicate schemas.**
- For numeric money inputs, validate as `z.string().regex(/^\d+(\.\d{1,6})?$/)` then parse to `Decimal`. Never trust client-side number parsing.

### 4.8 Logging
- `pino` everywhere. Web app and indexer share the same logger config (`packages/shared/src/logger.ts`).
- Redact at the logger layer: keys `password`, `passwordHash`, `accessToken`, `refreshToken`, `privateKey`, `secret`, `apiKey`, full `Authorization` headers, full session tokens.
- Log levels: `error` for actionable failures, `warn` for unexpected-but-recoverable, `info` for state changes, `debug` for dev only.

### 4.9 Errors
- Throw typed errors from `lib/errors.ts`: `AuthError`, `ForbiddenError`, `NotFoundError`, `ValidationError`, `ConflictError`, `ChainError`.
- A single error handler middleware maps these to HTTP via RFC 7807. **Never** return raw `Error.message` to clients in production — log it server-side, return a generic message + request ID.

### 4.10 Tests
- Unit tests for `lib/` and contract code (Foundry). Use `vitest` for TypeScript.
- Integration tests for API routes use `vitest` + `@testing-library/react` for the (small amount of) client logic.
- E2E with Playwright against a local stack (anvil + docker-compose), exercising the full happy-path flow described in SPEC.md § 21.
- Foundry: `forge coverage` ≥ 90 % branch on the escrow.
- Tests run in CI on every PR.

---

## 5. Smart Contract Conventions

Read SPEC.md § 7 first. Then:

1. **Solidity 0.8.28+** — natural overflow checks. Use `unchecked { ... }` only where you've proven no overflow possible (e.g. loop counters bounded by `milestones.length`).
2. **OpenZeppelin v5** — `Ownable` constructor takes initial owner (no `Ownable()` without arg). `AccessControl` uses `_grantRole` (not `_setupRole`).
3. **SafeERC20** — always. USDT historically returns no bool; SafeERC20 handles both.
4. **ReentrancyGuard** — on `contribute`, `vote`, `claimMilestone`. Order: `nonReentrant` first, then state changes, then external calls. (CEI pattern is sufficient; the guard is belt-and-suspenders.)
5. **No upgradeability.** A new factory deploys new escrows; bugs become migrations, not upgrades.
6. **No `tx.origin`.** Authorization uses `msg.sender`.
7. **No unbounded loops over voters.** The vote tally accumulates on each `vote()` call. Iteration over backers is forbidden in any contract function.
8. **Events** — index addresses and amounts. The indexer relies on these. Don't change event signatures after launch; if you must, deploy a new factory.
9. **Storage layout** — group hot variables; place `mapping`s last. Document slots if the contract ever becomes upgradeable.
10. **`PositionNFT.tokenURI`** — base URI is configurable, set once in the constructor by the factory. The off-chain server resolves `/api/nft/{contract}/{tokenId}`.

**Tests required (non-exhaustive):**

- `test_contribute_AutoReleasesMilestoneZero` — exact wei accounting.
- `test_contribute_MintsNftWithCorrectMetadata` — onchain state matches.
- `test_vote_RevertsAfterVotingEnded`, `test_vote_RevertsBeforeSubmission`, `test_vote_RevertsForNonBacker`, `test_vote_RevertsOnDoubleVote`.
- `test_resolveMilestone_RevertsBeforeEnd`, `test_resolveMilestone_AbstainsCountAsYes`, `test_resolveMilestone_FailsWhenStrictMajorityNo`.
- `test_claimMilestone_RevertsIfNotPassed`, `test_claimMilestone_OnlyOrg`.
- `test_claimMilestone_TransfersExactlyAllocatedAmount`.
- Invariant: `sum(milestone.allocated for i>=1) + sum(claimedAmounts) + sum(m0Released) == totalContributed`.
- Fuzz `contribute` with random amounts and milestone counts; invariant holds.
- Re-submission after FAILED works (`test_submitMilestone_AfterFailedAllowed`).

Run `slither contracts/` in CI. Annotate accepted findings with `// slither-disable-next-line ...` and a justification comment.

---

## 6. Indexer Conventions

`apps/indexer` is a Node service. Treat it as a worker, not a server.

- Single process, multiple watchers. One watcher per event signature × contract address. Use `viem.watchContractEvent` with `pollingInterval: 4_000` (Morph block time is ~2s; poll twice as fast for low latency).
- Wait for `INDEXER_CONFIRMATIONS` (default 12) before persisting to DB.
- Cursor per `(contract, eventName)` in `IndexerCursor`. On startup, replay from cursor to head.
- All writes are **idempotent** keyed by `txHash + logIndex`. The indexer can crash and replay safely.
- Email queue: `BullMQ` worker polls `EmailNotification` table every 10s for `QUEUED` rows, enqueues to Redis, worker processes with 5 concurrency + exponential backoff (max 3 retries), calls `sendEmail()` which fetches render from `web app /api/internal/email/render` then sends via Resend; DB status updated to `SENT` on success, `FAILED` on final failure. Shutdown calls `stopEmailWorker()`.
- Keeper job: a `setInterval(60_000)` sweeps milestones with `voteEndAt < now()` and status `VOTING`, calls `resolveMilestone()`. Use a wallet client with `KEEPER_PRIVATE_KEY`.

**Resend webhooks**: web app has `POST /api/webhooks/resend` that verifies `Resend-Webhook-Signature` header and updates `EmailNotification.status` on `delivered`/`bounced`/`complained` events.

**Never** call indexer code paths from the web app. They are separate concerns; the indexer is the only writer to `Contribution`, `MilestoneVote`, and milestone status fields (except for `updateUri` which the web app writes optimistically and the indexer reconciles).

---

## 7. Frontend UX Conventions

- The contribute flow has two transactions (approve, contribute). Use a stepper UI; never lump them. Show explicit prompts: "Step 1 of 2: Approving USDT" then "Step 2 of 2: Sending contribution".
- All amounts are entered as USDT (decimal string), displayed as USDT with 2 decimals + ≤6 decimals on hover.
- Loading states: skeletons, never spinners on content blocks > 200ms expected. Use `<Suspense>` with RSC.
- Error states: every fetch boundary has an `ErrorBoundary`. Surface a request ID for support.
- A11y: every form input has a label; focus rings visible; modals trap focus; color contrast ≥ AA.
- Internationalization: not required for v1, but use a `t()` helper from day one so strings are centralized.

---

## 8. Security Checklist (must pass before any deploy)

- [ ] `.env.example` lists every variable; no secret committed.
- [ ] `pnpm audit --prod` passes (no high/critical).
- [ ] All API routes call `assertRole` / `assertOwnsOrg` before any DB write.
- [ ] All Server Actions accept `unknown` and parse via Zod first.
- [ ] No `dangerouslySetInnerHTML` except inside the markdown renderer (with sanitize plugin).
- [ ] CSP header set; verified in browser devtools on prod build.
- [ ] Rate limiting in place on `/api/auth/*`, `/api/upload`, and all write routes.
- [ ] `slither` clean (or annotated).
- [ ] `forge test` ≥ 90 % branch coverage on escrow.
- [ ] All emails are queued through the `EmailNotification` table (no direct `resend.emails.send` calls outside the worker).
- [ ] Logger redaction confirmed by a unit test (assert that a log containing `password: "foo"` is redacted).
- [ ] Postgres extension `citext` enabled.
- [ ] No `console.log` in production code paths; only `logger.*`.
- [ ] Sentry / equivalent error reporting wired (optional but recommended).

---

## 9. Common Pitfalls (don't make these)

1. **Treating the DB as source of truth for funds.** It isn't. The chain is. The DB mirrors. If the indexer is down, the contribute button can still work — the user's USDT moves onchain regardless. The UI will catch up.
2. **Decimal mismatch.** USDT on Morph is 6 decimals. UI inputs are floats. Use `parseUnits(input, 6)` from viem before any contract call. Test with amounts containing fractional cents.
3. **Voting power drift.** Snapshot voting power at the moment of `vote()`, not when the milestone was submitted. If a backer contributes after voting opens but before they vote, the new contribution should count. Conversely, a backer who votes and then contributes more does **not** retroactively increase their cast vote.
4. **Approval reuse.** Don't always send `approve(amount)`. Read current allowance; if sufficient, skip approval. Also: the contract should not `transferFrom` more than the user approved.
5. **Race in `submitMilestone`.** The org owner can call it multiple times for the same milestone. Contract should revert if status is already `VOTING`, `PASSED`, or `CLAIMED`.
6. **Reentrancy via the NFT.** `_safeMint` calls `onERC721Received` on the recipient. If the recipient is a malicious contract, it could reenter the escrow. Use `nonReentrant` on `contribute`. The mint happens **after** all state writes (CEI).
7. **`block.timestamp` manipulation.** Voting periods of ≥ 3 days dwarf any miner timestamp drift; this is fine. But never use it for randomness.
8. **Server Action without Zod.** A Server Action argument is just an HTTP body — treat it as fully untrusted.
9. **Better Auth without `nextCookies()`.** Server Actions will silently fail to set the session cookie. The LogRocket 2026 study called this out specifically.
10. **Indexer at-head writes.** If you write before confirmations, a chain re-org could lead to phantom contributions. Always confirm.
11. **Background jobs in serverless functions.** Don't try to run BullMQ workers inside Next.js route handlers. The indexer service is the worker.
12. **Storing the keeper key client-side.** Never. It lives only on the indexer, in Railway env.

---

## 10. Git / PR Conventions

- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- One PR per logical change. Small (< 400 lines) when possible.
- Every PR must: pass CI, include tests for new logic, update SPEC.md if behavior changes, update AGENT.md if conventions change.
- Branch naming: `feat/<scope>`, `fix/<scope>`. Trunk-based; rebase, don't merge.
- Tag releases as `v0.x.y`. The contract deployment is tied to a tag.

---

## 11. When to Ask the Human

Ask before:

- Making any change to a deployed contract's storage layout or external interface.
- Adding a new third-party service or API key.
- Changing the funding model or vote-resolution formula in any way.
- Introducing custodial behavior (the platform holding funds).
- Loosening rate limits or auth checks.
- Adding any client-side handling of private keys.
- Anything that materially changes a backer's risk profile.

Don't ask before:

- Bug fixes that preserve behavior.
- UI / UX polish.
- Adding tests.
- Doc improvements.
- Performance work that preserves semantics.

---

## 12. First-Week Build Order

Aim to deliver a working slice end-to-end before going deep. Suggested sequence:

1. Repo + tooling + Docker Compose + CI skeleton.
2. Prisma schema + migrations + `citext` + seed script.
3. Better Auth (Google + admin creds).
4. Foundry contracts + tests on a local anvil.
5. Web app: landing + sign-in + admin panel for orgs.
6. Web app: project create + publish (wallet tx flow).
7. Indexer: pick up `ProjectCreated`, populate addresses.
8. Web app: project detail + contribute flow.
9. Indexer: pick up `Contributed`, write `Contribution`, mint NFT mirror.
10. NFT metadata endpoint.
11. Submit milestone + vote + resolve + claim — full loop.
12. Emails via Resend through the queue.
13. Activity log everywhere.
14. Admin panels.
15. E2E on Morph Hoodi testnet.
16. Hardening: CSP, rate limits, slither, audit, Playwright suite.

Don't try to do everything in parallel. Vertical slices ship. Horizontal layers stall.

---

*End of AGENT.md*
