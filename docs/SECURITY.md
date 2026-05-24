# Ember — Security Checklist

Tracks AGENT.md §8 and SPEC.md §15 requirements. Updated each sprint.

## AGENT.md §8 Checklist

| # | Requirement | Status | Notes |
|---|---|---|---|
| 1 | `.env.example` lists every variable; no secret committed | ✅ Done | `.env.example` checked in |
| 2 | `pnpm audit --prod` passes (no high/critical) | ✅ In CI | `pnpm audit` in GitHub Actions CI |
| 3 | All API routes call `assertRole` / `assertOwnsOrg` before any DB write | ⏳ Sprint 1 | No API routes with DB writes yet; helper will be wired in Issue #10 |
| 4 | All Server Actions accept `unknown` and parse via Zod first | ⏳ Sprint 1 | No Server Actions yet; enforced in Issue #8+ |
| 5 | No `dangerouslySetInnerHTML` except inside the markdown renderer (with sanitize plugin) | ✅ Done | No `dangerouslySetInnerHTML` in codebase |
| 6 | CSP header set; verified in browser devtools on prod build | ✅ Done | `apps/web/middleware.ts` sets full CSP; Issue #61 |
| 7 | Rate limiting on `/api/auth/*`, `/api/upload`, and all write routes | ✅ Done | Redis sliding window; Issue #62 |
| 8 | `slither` clean (or annotated) | ✅ In CI | `contracts-slither` CI job; Issue #22 |
| 9 | `forge test` ≥ 90% branch coverage on escrow | ✅ Done | Invariant + fuzz tests; Issues #15–#20 |
| 10 | All emails queued through `EmailNotification` table (no direct `resend.emails.send` outside worker) | ⏳ Sprint 6 | Email worker tracked in Issue #49 |
| 11 | Logger redaction confirmed by unit test | ⏳ Sprint 0 | Shared logger tracked in Issue #4 |
| 12 | Postgres `citext` extension enabled | ⏳ Sprint 1 | Tracked in Issue #7 (Prisma schema + init migration) |
| 13 | No `console.log` in production code paths; only `logger.*` | ⏳ Sprint 0 | Shared logger tracked in Issue #4 |
| 14 | Sentry / equivalent error reporting wired | ⏳ Optional | `SENTRY_DSN` env var present; wiring deferred post-launch |

## SPEC.md §15 Security Requirements

| # | Requirement | Status | Notes |
|---|---|---|---|
| 1 | Secrets never in client bundle | ✅ Done | `NEXT_PUBLIC_*` only for public values; all others server-only |
| 2 | CSRF — SameSite=Lax session cookie + Server Actions | ⏳ Sprint 1 | Better Auth setup tracked in Issue #9 |
| 3 | XSS — markdown via `rehype-sanitize`; no bare `dangerouslySetInnerHTML` | ⏳ Sprint 3 | Markdown renderer tracked in Issue #23+ |
| 4 | SQL injection — all queries via Prisma | ⏳ Sprint 1 | Prisma setup tracked in Issue #7 |
| 5 | Authorization — centralized `assertRole` / `assertOwnsOrg` | ⏳ Sprint 1 | Tracked in Issue #10 |
| 6 | SIWE nonce single-use, 10-min TTL | ⏳ Sprint 1 | Tracked in Issue #11 |
| 7 | Rate limiting — Redis sliding window with indexer bypass | ✅ Done | Issue #62 |
| 8 | Idempotency on confirm/retry endpoints | ⏳ Sprint 3+ | Tracked per endpoint implementation |
| 9 | Smart contracts — ReentrancyGuard, SafeERC20, no tx.origin | ✅ Done | Audited in Issues #15–#22 |
| 10 | USDT 6 decimals — no hardcoded 18 | ✅ Done | Contracts use USDT_DECIMALS = 6 |
| 11 | Funds at rest in escrow only | ✅ Done | No custodial wallet; all via ProjectEscrow |
| 12 | Keeper key — quarterly rotation, minimal ETH | ✅ Documented | See `RUNBOOK.md` |
| 13 | Logging — no raw secrets/tokens in logs | ⏳ Sprint 0 | Redaction tracked in Issue #4 |
| 14 | Backups — Railway Postgres daily snapshot, 7-day retention, restore drill | ✅ Documented | See `RUNBOOK.md` |
| 15 | Dependency hygiene — `pnpm audit --prod` in CI | ✅ In CI | `.github/workflows/ci.yml` |
| 16 | CSP — strict headers, wasm-unsafe-eval, explicit origins | ✅ Done | Issue #61 |
| 17 | Admin login — strong passwords, bcrypt ≥ 12 | ⏳ Sprint 1 | Tracked in Issue #9 (Better Auth admin credentials) |

## Pre-launch Blockers

The following checklist items must be ✅ before deploying to production:

- Issue #4: Shared logger with redaction (items 11, 13)
- Issue #7: Prisma schema + citext (item 12)
- Issue #9: Better Auth setup (items 2, 17)
- Issue #10: assertRole / assertOwnsOrg (items 3, 5)
- Issue #49: Email worker / queue (item 10)
