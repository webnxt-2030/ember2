# Ember — Specification

> Working codename: **Ember**. Rename freely.

A milestone-based, onchain crowdfunding dApp on Morph L2 that solves the single biggest failure mode of traditional crowdfunding — creators taking the money and disappearing — through **escrowed funds**, **per-milestone backer voting**, **mass-market social login**, and **stablecoin-native rails (USDT)**.

This document is the source of truth for the coding agent. Read it end-to-end before writing any code. Where this document and AGENT.md conflict, this document wins for *what to build*; AGENT.md wins for *how to build it*.

---

## 1. Product Overview

### 1.1 Problem
Backers on traditional crowdfunding platforms have no enforceable recourse if a creator disappears after collecting funds. Funds are released up front; trust is a promise, not a guarantee.

### 1.2 Solution
- Contributions sit in an onchain **escrow contract** per project.
- Funds are released to the organization **only when backers approve each milestone**.
- Backers vote with **weight proportional to their contribution**.
- Each contribution mints a **position NFT** to the backer, so positions are portable and inspectable onchain.
- Users sign up with **Google** (mass-market) and connect a **Bitget/WalletConnect wallet** when funding.

### 1.3 Non-Goals (v1)
- No KYC/AML — orgs are "verified" manually by a Super Admin for v1.
- No refunds on a NO vote — funds remain locked until org resubmits the milestone (per founder's decision).
- No secondary market for position NFTs (NFTs are transferable but no marketplace UI).
- No multi-chain support — Morph L2 only.
- No fiat on-ramp inside the app (Reown AppKit's built-in on-ramp can be enabled later).

### 1.4 Competitive Landscape (verified May 2026)

As of this writing, **no dApp on Morph offers milestone-based escrow crowdfunding** for organizations. The category is open.

Morph's official ecosystem directory (`morph.network/apps`) lists ~30 dApps concentrated in payment infrastructure (OSL, OSL Biz Pay, Alchemy Pay, AEON, Paydify), wallets (Bitget Wallet, MetaMask, Rabby, Fox, Nabox), bridges (Morph Bridge, Orbiter, WheelX), and infra (Pyth, Chainlink CCIP, LayerZero, Tenderly, Goldsky, Redstone, Fireblocks). The chain's stated North Star is being "the primary settlement layer of the Bitget ecosystem" — payments-first, with consumer dApps still nascent.

The closest adjacent products are not direct competitors:

- **BulbaSwap** — a DEX on Morph with IDO/launchpad functionality. Different model: backers buy a token at TGE; no milestone-gated escrow, no deliverable accountability.
- **Muffun** — one-click memecoin launcher. Not crowdfunding.
- **Tally** — generic DAO governance UI. Potential future integration if Ember adds token-gated governance over organizations; not a competitor.

Off-chain reference points: `MileStarter` (open-source academic Ethereum demo of milestone DAO crowdfunding; not productized) and the dormant Escrow Protocol from 2021 (multi-chain milestone ICOs with DeFi yield on escrowed funds). Neither was used as a code reference; both informed parts of the conceptual design.

**Positioning implications for the build:**
- Ember exercises stablecoin (USDT) rails on Morph — directly aligned with Morph's payments narrative. Use this framing in marketing copy and any grant/accelerator application.
- The Morph Payment Accelerator (`morph.network/accelerator`) and the Morph × Foresight Ventures $20M ecosystem fund explicitly target early-stage consumer dApps. Apply once a working Morph Hoodi testnet build exists.
- No direct competitor means no migration tooling and no chain-specific differentiation work required in v1. Focus on UX and trust-minimization.

---

## 2. Roles

| Role | Description | Auth |
| --- | --- | --- |
| **Backer** | Default for all signed-up users. Browses projects, contributes USDT, votes on milestones, receives position NFTs. | Google OAuth + connected wallet (wallet required for funding/voting only). |
| **Organization Owner** | Admin of one or more organizations. Creates projects, defines milestones, submits milestones for vote, claims released funds. | Google OAuth + connected wallet. Role assigned by Super Admin. |
| **Super Admin** | Seeded platform operator. Creates organizations, assigns Organization Owners, verifies organizations, audits activity, manages users. | Username + password (seeded). |

A single user account can simultaneously be a Backer and an Org Owner (one or many orgs). Super Admin is a distinct account type seeded via Prisma `seed.ts` and is not OAuth-based.

---

## 3. End-to-End Flows

### 3.1 Onboarding
1. User signs in with Google → row in `User` table created with `role = BACKER`.
2. To contribute or vote, user clicks "Connect Wallet" → Reown AppKit modal opens with Bitget Wallet featured + all WalletConnect-compatible wallets listed.
3. User signs a Sign-In-With-Ethereum (SIWE / EIP-4361) message that binds the wallet to the user account. Multiple wallets per account are allowed; one is marked `isPrimary`.

### 3.2 Organization Onboarding
1. Super Admin creates an `Organization` and assigns one or more `User`s as Org Owners via `/admin/organizations/new`.
2. Org Owner logs in and completes the org profile (title, description, logo, website).
3. Super Admin reviews → toggles `verifiedStatus = VERIFIED` (or `REJECTED`).
4. Only `VERIFIED` orgs may publish projects. Unverified orgs can save drafts.

### 3.3 Project Creation
1. Org Owner navigates to `/org/dashboard/projects/new`.
2. Fills in: title, slug, summary, full description (markdown), pictures, social links, backing links, target amount (USDT), funding deadline (optional), receiving wallet address (defaults to org wallet).
3. Defines milestones:
   - Number of milestones N (min 2, max 20).
   - Reward curve: `LINEAR` | `EXPONENTIAL` | `BINARY` | `CUSTOM`.
   - If `CUSTOM`, provides an array of N percentages summing to exactly `10000` basis points (100.00 %).
   - Per-milestone title + description (markdown) + deliverable date (optional).
4. On publish:
   - Backend calls `ProjectFactory.createProject(...)` which deploys a new `ProjectEscrow` and `PositionNFT` for the project.
   - Project status: `DRAFT` → `LIVE`.
5. Milestone 0 is special: its allocated share is auto-forwarded to the org wallet on each contribution (see § 3.4).

### 3.4 Backing a Project
1. Backer views `/projects/[slug]`, enters amount in USDT, clicks "Back this project".
2. Wallet prompts two transactions:
   - **Tx 1:** `USDT.approve(escrowAddress, amount)` (skipped if allowance sufficient).
   - **Tx 2:** `ProjectEscrow.contribute(amount)`.
3. Inside `contribute(amount)`:
   - Transfers `amount` USDT from backer to escrow.
   - Computes `m0Share = amount * milestoneBps[0] / 10000` and immediately transfers `m0Share` to the org wallet.
   - Stores the per-milestone allocation for milestones 1..N-1 internally.
   - Mints a new `PositionNFT` to the backer with metadata `{ projectId, amount, contributedAt, m0Share }`.
   - Emits `Contributed(backer, amount, tokenId, m0Share)` event.
4. Indexer service (§ 8) picks up the event → inserts `Contribution` row → enqueues a "thank you" email.

### 3.5 Milestone Submission & Vote
1. Org Owner navigates to `/org/dashboard/projects/[id]/milestones/[mid]` and clicks "Submit for vote" with an updates note.
2. Backend calls `ProjectEscrow.submitMilestone(milestoneIndex, updateUri)` where `updateUri` is an IPFS or Railway-volume URL of the markdown update.
3. Contract sets milestone status to `VOTING` and records `voteStartAt = block.timestamp`, `voteEndAt = block.timestamp + votingPeriod` (default 7 days, configurable at project creation, range 3–30 days).
4. Indexer creates `MilestoneVote` "open" record; email service notifies every backer of the project: "Vote opens now; closes in 7 days."
5. Voting window:
   - Eligible voters = backers with at least one position NFT for the project.
   - Each backer's voting power = sum of all `Contribution.amount` from that backer for that project (read from the chain via aggregation, mirrored to DB for UI).
   - Each backer calls `ProjectEscrow.vote(milestoneIndex, choice)` once, where `choice ∈ { YES, NO }`.
   - Ignoring the vote = abstain. Abstains count as YES (per spec).
6. At `voteEndAt`:
   - Indexer reads tallies and resolves the vote:
     - `weightYes = sum of YES voter contributions`
     - `weightNo = sum of NO voter contributions`
     - `weightAbstain = totalContributed - weightYes - weightNo`
     - **Result:** `PASS` if `weightNo < (weightYes + weightAbstain)`, else `FAIL`.
     - Equivalently: PASS if `weightNo < totalContributed / 2` (strict majority NO is required to fail).
   - Updates milestone status: `VOTING` → `PASSED` or `FAILED`.
   - Sends "outcome" email to all project backers.
7. If `PASSED`: Org Owner can call `ProjectEscrow.claimMilestone(milestoneIndex)`. Contract verifies status and transfers the milestone's allocated USDT to the org wallet. Emits `MilestoneClaimed`.
8. If `FAILED`: Funds for that milestone remain locked. Org Owner may re-submit (`submitMilestone` again) after addressing concerns. No automatic timeout — funds stay locked until org resubmits (per founder's decision).

### 3.6 NFT Behavior on Repeat Contributions
- **A new NFT is minted for every contribution.** A backer making 3 contributions to the same project holds 3 NFTs.
- NFT metadata (per spec): `{ projectId, projectSlug, amount, contributedAt, m0Share, allocatedRemaining }`. Metadata is served from `/api/nft/[contract]/[tokenId]` and is regenerated on the fly (no IPFS pinning required in v1).
- Voting power is summed across all of a backer's NFTs for a project.

### 3.7 Pre-Vote "Coming Soon" Notifications
- 24h before an Org Owner is expected to submit a milestone (based on milestone `deliverableDate` if set), a job sweeps and sends a "vote coming soon" email if no submission has happened yet. This is purely informational; submission timing is at the Org Owner's discretion.

---

## 4. Tech Stack (Latest Versions, Verified May 2026)

| Layer | Choice | Version | Notes |
| --- | --- | --- | --- |
| Web framework | Next.js (App Router, Turbopack) | `16.2.6` | Use Server Actions for mutations where appropriate. |
| UI runtime | React | `19.2.6` | RSC + Server Actions. |
| Language | TypeScript | `5.x` (latest) | `strict: true`. |
| Styling | Tailwind CSS | `4.2.0` | CSS-first config via `@theme`. |
| Component primitives | shadcn/ui (Radix-based) | latest | Optional but recommended. |
| ORM | Prisma | `7.8.0` | Rust-free client, `runtime = "nodejs"`. |
| Database | PostgreSQL (Railway) | `17` | Single instance for v1. |
| Auth | Better Auth | latest | Google OAuth + email/password + custom admin role. Replaces NextAuth in 2026 best practice. |
| Email | Resend + React Email | Resend SDK latest, React Email `6.x` | Transactional emails only. |
| File storage | Railway Volume in prod / MinIO in dev | — | S3-compatible abstraction so the adapter is swappable. |
| Wallet UX | Reown AppKit | `1.8.x` | Successor to WalletConnect Modal. Featured wallet: Bitget. |
| Chain SDK | wagmi + viem | wagmi `3.6.11`, viem `2.x` | wagmi v3 React hooks. |
| Chain | Morph L2 mainnet | chainId `2818`, RPC `https://rpc.morphl2.io`, explorer `https://explorer.morphl2.io` | Native gas token: ETH. Testnet: Morph Hoodi. |
| Stablecoin | Bridged USDT on Morph | `0xc7d67a9cbb121b3b0b9c053dd9f469523243379a` | 6 decimals. **Verify against Morph's official docs at deployment time** before mainnet launch. |
| Smart contract toolchain | Foundry (`forge`, `cast`, `anvil`) | latest | Hardhat is allowed if the agent prefers, but Foundry is the primary recommendation. |
| Solidity | `^0.8.28` | latest stable | |
| Contract libs | OpenZeppelin Contracts | `5.5.0` | ERC-721, AccessControl, ReentrancyGuard, SafeERC20. |
| Background jobs | BullMQ + Redis | latest | For email delivery and indexer queues. |
| Indexer | Custom Node.js process using viem `watchEvent` | — | Runs as a separate Railway service. |
| Runtime | Node.js | `22.x LTS` | Avoid Node 24 unless all deps validated. |
| Package manager | pnpm | `10.x` | Enforce via `packageManager` in `package.json`. |
| Container (dev) | Docker Compose | — | For Postgres, MinIO, Redis, MailHog. |
| CI | GitHub Actions | — | Lint, typecheck, test, contract tests. |
| Deployment | Railway | — | Web + Indexer + Postgres + Redis + Volume. |

---

## 5. Repository Layout

```
ember/
├── apps/
│   ├── web/                          # Next.js 16 app (frontend + API)
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── emails/                   # React Email templates
│   │   └── public/
│   └── indexer/                      # Standalone Node service for chain events
│       ├── src/
│       └── package.json
├── contracts/                         # Foundry project
│   ├── src/
│   │   ├── ProjectFactory.sol
│   │   ├── ProjectEscrow.sol
│   │   └── PositionNFT.sol
│   ├── test/
│   ├── script/
│   ├── foundry.toml
│   └── remappings.txt
├── packages/
│   ├── shared/                       # Shared TS types, ABIs, constants
│   │   ├── src/abis/                 # Generated from forge
│   │   └── src/types/
│   └── ui/                           # Shared UI components (optional)
├── docker-compose.yml                # Dev: postgres, minio, redis, mailhog
├── .env.example
├── package.json                      # pnpm workspaces
├── pnpm-workspace.yaml
├── turbo.json                        # Optional, for monorepo build orchestration
├── README.md
├── SPEC.md                           # this file
└── AGENT.md
```

---

## 6. Database Schema (Prisma)

The Prisma schema below uses CUIDs as primary keys and Postgres-native enums. The coding agent should treat this as the **canonical schema** and generate the migration via `prisma migrate dev --name init`.

```prisma
// apps/web/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  runtime  = "nodejs"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Auth (Better Auth schema, with role extension) ────────────────────────
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified Boolean   @default(false)
  name          String?
  image         String?
  passwordHash  String?   // Set only for SUPER_ADMIN credentials login
  role          UserRole  @default(BACKER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts        Account[]
  sessions        Session[]
  wallets         Wallet[]
  orgMemberships  OrganizationMember[]
  contributions   Contribution[]
  activityLogs    ActivityLog[]   @relation("ActorLogs")

  @@index([role])
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  providerId        String
  accountId         String
  accessToken       String?
  refreshToken      String?
  idToken           String?
  expiresAt         DateTime?
  password          String?
  scope             String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([providerId, accountId])
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())

  @@unique([identifier, value])
}

enum UserRole {
  BACKER
  ORG_OWNER
  SUPER_ADMIN
}

// ─── Wallets ───────────────────────────────────────────────────────────────
model Wallet {
  id          String   @id @default(cuid())
  userId      String
  address     String   @db.Citext // case-insensitive; needs `citext` ext
  isPrimary   Boolean  @default(false)
  verifiedAt  DateTime // when SIWE signature was verified
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([address])
  @@index([userId])
}

// ─── Organizations ────────────────────────────────────────────────────────
model Organization {
  id              String                @id @default(cuid())
  slug            String                @unique
  title           String
  description     String
  logoUrl         String?
  website         String?
  receivingWallet String                @db.Citext
  verifiedStatus  VerificationStatus    @default(PENDING)
  verifiedAt      DateTime?
  verifiedById    String?
  createdAt       DateTime              @default(now())
  updatedAt       DateTime              @updatedAt

  members  OrganizationMember[]
  projects Project[]

  @@index([verifiedStatus])
}

enum VerificationStatus {
  PENDING
  VERIFIED
  REJECTED
}

model OrganizationMember {
  id             String       @id @default(cuid())
  organizationId String
  userId         String
  role           OrgRole      @default(OWNER)
  createdAt      DateTime     @default(now())
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([organizationId, userId])
}

enum OrgRole {
  OWNER
}

// ─── Projects ──────────────────────────────────────────────────────────────
model Project {
  id                String          @id @default(cuid())
  organizationId    String
  slug              String          @unique
  title             String
  summary           String
  description       String          // markdown
  pictures          String[]        // URLs
  socialLinks       Json            // { twitter?: string, discord?: string, ... }
  backingLinks      String[]
  targetAmount      Decimal         @db.Decimal(20, 6) // USDT, 6 decimals
  fundingDeadline   DateTime?
  votingPeriodDays  Int             @default(7) // 3..30
  rewardCurveType   RewardCurve     @default(LINEAR)
  milestoneBps      Int[]           // basis points per milestone, sums to 10000
  escrowAddress     String?         @db.Citext // null until deployed
  nftAddress        String?         @db.Citext
  status            ProjectStatus   @default(DRAFT)
  totalRaised       Decimal         @default(0) @db.Decimal(20, 6)
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  publishedAt       DateTime?

  organization Organization   @relation(fields: [organizationId], references: [id], onDelete: Restrict)
  milestones   Milestone[]
  contributions Contribution[]

  @@index([organizationId])
  @@index([status])
}

enum RewardCurve {
  LINEAR
  EXPONENTIAL
  BINARY
  CUSTOM
}

enum ProjectStatus {
  DRAFT
  LIVE
  COMPLETED   // all milestones claimed
  PAUSED      // admin action
  CANCELLED   // admin or org action; no further contributions allowed
}

model Milestone {
  id              String           @id @default(cuid())
  projectId       String
  index           Int              // 0..N-1
  title           String
  description     String           // markdown
  deliverableDate DateTime?
  bps             Int              // share of total raised, basis points
  status          MilestoneStatus  @default(PENDING)
  updateUri       String?          // URI to the org's submission update (markdown)
  voteStartAt     DateTime?
  voteEndAt       DateTime?
  weightYes       Decimal          @default(0) @db.Decimal(20, 6)
  weightNo        Decimal          @default(0) @db.Decimal(20, 6)
  passed          Boolean?
  claimedAt       DateTime?
  claimedTxHash   String?

  project Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  votes   MilestoneVote[]

  @@unique([projectId, index])
  @@index([status])
}

enum MilestoneStatus {
  PENDING     // not yet submitted; m0 is auto-released so never PENDING
  AUTO_RELEASED // m0 only; share already forwarded on each contribution
  VOTING      // submitted; voting window open
  PASSED
  FAILED
  CLAIMED
}

model Contribution {
  id              String   @id @default(cuid())
  projectId       String
  backerId        String?  // null if backer wallet not linked to a User account
  walletAddress   String   @db.Citext
  amount          Decimal  @db.Decimal(20, 6) // USDT
  m0Share         Decimal  @db.Decimal(20, 6)
  nftTokenId      String   // chain-side token ID, as decimal string
  nftContract     String   @db.Citext
  txHash          String   @unique
  blockNumber     BigInt
  contributedAt   DateTime
  createdAt       DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Restrict)
  backer  User?   @relation(fields: [backerId], references: [id], onDelete: SetNull)

  @@index([projectId])
  @@index([walletAddress])
  @@index([backerId])
}

model MilestoneVote {
  id            String   @id @default(cuid())
  milestoneId   String
  walletAddress String   @db.Citext
  choice        VoteChoice
  weight        Decimal  @db.Decimal(20, 6) // snapshot at vote time
  txHash        String   @unique
  votedAt       DateTime

  milestone Milestone @relation(fields: [milestoneId], references: [id], onDelete: Cascade)

  @@unique([milestoneId, walletAddress])
  @@index([milestoneId])
}

enum VoteChoice {
  YES
  NO
}

// ─── Activity Log (audit trail) ───────────────────────────────────────────
model ActivityLog {
  id          String   @id @default(cuid())
  actorUserId String?  // null for system / chain-derived events
  actorWallet String?  @db.Citext
  type        ActivityType
  targetType  String?  // "Project", "Milestone", "Organization", ...
  targetId    String?
  metadata    Json     // free-form payload
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  actor User? @relation("ActorLogs", fields: [actorUserId], references: [id], onDelete: SetNull)

  @@index([actorUserId])
  @@index([type])
  @@index([targetType, targetId])
  @@index([createdAt])
}

enum ActivityType {
  USER_SIGNED_UP
  USER_SIGNED_IN
  USER_SIGNED_OUT
  WALLET_LINKED
  WALLET_UNLINKED
  ORG_CREATED
  ORG_UPDATED
  ORG_VERIFIED
  ORG_REJECTED
  ORG_MEMBER_ADDED
  ORG_MEMBER_REMOVED
  PROJECT_CREATED
  PROJECT_UPDATED
  PROJECT_PUBLISHED
  PROJECT_PAUSED
  PROJECT_CANCELLED
  PROJECT_COMPLETED
  CONTRIBUTION_RECEIVED
  MILESTONE_SUBMITTED
  MILESTONE_VOTE_CAST
  MILESTONE_RESOLVED
  MILESTONE_CLAIMED
  EMAIL_SENT
  EMAIL_FAILED
  ADMIN_ACTION
}

// ─── Email Notifications (delivery tracking) ──────────────────────────────
model EmailNotification {
  id           String              @id @default(cuid())
  to           String
  template     EmailTemplate
  payload      Json
  status       EmailStatus         @default(QUEUED)
  resendId     String?             @unique
  error        String?
  sentAt       DateTime?
  createdAt    DateTime            @default(now())

  @@index([status])
}

enum EmailTemplate {
  WELCOME
  CONTRIBUTION_RECEIVED
  MILESTONE_UPDATED
  MILESTONE_VOTE_OPEN
  MILESTONE_VOTE_COMING_SOON
  MILESTONE_VOTE_OUTCOME
  MILESTONE_CLAIMED
  ORG_VERIFIED
  ORG_REJECTED
  ADMIN_INVITATION
}

enum EmailStatus {
  QUEUED
  SENT
  FAILED
}
```

**Notes for the agent:**
- Enable the `citext` Postgres extension in the first migration so wallet addresses are queried case-insensitively.
- `Decimal(20, 6)` matches USDT's 6 decimals with room for >$10¹⁴ aggregates.
- `BigInt` for `blockNumber` — Prisma maps to `BigInt`/`bigint`.

---

## 7. Smart Contracts

All contracts live under `/contracts` and are built with Foundry. Solidity `^0.8.28`. Use OpenZeppelin v5.5.0.

### 7.1 ProjectFactory.sol

Deploys per-project `ProjectEscrow` and `PositionNFT` instances. Holds platform-wide config (USDT address, fee recipient if added later, default voting period bounds).

```solidity
interface IProjectFactory {
    event ProjectCreated(
        uint256 indexed projectId,        // monotonically increasing
        address indexed organization,     // org receiving wallet
        address indexed creator,          // msg.sender (org owner)
        address escrow,
        address nft,
        uint16[] milestoneBps,
        uint32  votingPeriod              // seconds
    );

    function createProject(
        address organizationWallet,
        uint16[] calldata milestoneBps,   // sums to 10000
        uint32  votingPeriod,             // 3..30 days in seconds
        string  calldata projectURI       // off-chain JSON URL
    ) external returns (uint256 projectId, address escrow, address nft);

    function usdt() external view returns (address);
    function admin() external view returns (address);
}
```

### 7.2 ProjectEscrow.sol

Holds USDT for one project. Tracks per-milestone allocations, accepts contributions, runs the vote, releases funds.

Key state:
- `IERC20 usdt`
- `address organizationWallet`
- `uint16[] milestoneBps`
- `uint32 votingPeriod`
- `mapping(uint256 milestone => MilestoneState) milestones`
- `mapping(address => uint256) totalContributedBy` (used as voting power)
- `uint256 totalContributed`

```solidity
struct MilestoneState {
    Status status;           // PENDING, AUTO_RELEASED (m0 only), VOTING, PASSED, FAILED, CLAIMED
    uint64 voteStartAt;
    uint64 voteEndAt;
    uint256 weightYes;
    uint256 weightNo;
    uint256 allocated;       // sum across all contributions of (amount * bps[i] / 10000)
    string  updateURI;
    mapping(address => bool) hasVoted;
}

interface IProjectEscrow {
    event Contributed(address indexed backer, uint256 amount, uint256 tokenId, uint256 m0Share);
    event MilestoneSubmitted(uint256 indexed milestoneIndex, string updateURI, uint64 voteEndAt);
    event Voted(uint256 indexed milestoneIndex, address indexed voter, bool yes, uint256 weight);
    event MilestoneResolved(uint256 indexed milestoneIndex, bool passed, uint256 weightYes, uint256 weightNo);
    event MilestoneClaimed(uint256 indexed milestoneIndex, uint256 amount);

    function contribute(uint256 amount) external;
    function submitMilestone(uint256 milestoneIndex, string calldata updateURI) external; // onlyOrg
    function vote(uint256 milestoneIndex, bool yes) external;                              // backers only
    function resolveMilestone(uint256 milestoneIndex) external;                            // anyone, after voteEndAt
    function claimMilestone(uint256 milestoneIndex) external;                              // onlyOrg, must be PASSED
    function votingPowerOf(address backer) external view returns (uint256);
}
```

**Critical invariants the agent must enforce in tests:**

1. `totalContributed == sum(milestones[i].allocated for i in 0..N-1)` after each contribution (modulo m0's auto-release).
2. After m0 auto-release, the m0 milestone's `allocated` is 0 and m0's status is `AUTO_RELEASED`. m0 is **not** votable and cannot be re-submitted.
3. A backer can only vote once per milestone. `hasVoted[msg.sender]` is checked.
4. `voteEndAt > block.timestamp` required for `vote()`; `block.timestamp >= voteEndAt` required for `resolveMilestone()`.
5. Vote weight is snapshotted at `vote()` time using `totalContributedBy[msg.sender]`. New contributions after voting in a given milestone do not retroactively increase that vote's weight.
6. Resolution formula: `passed = weightNo * 2 < totalContributed` (strict majority NO required to fail; abstain counts as YES).
7. `claimMilestone` is only callable by `organizationWallet` (use `AccessControl` or simple `Ownable` with org as owner).
8. `ReentrancyGuard` on `contribute`, `vote`, `claimMilestone`.
9. `SafeERC20.safeTransferFrom` / `safeTransfer` for all USDT moves — USDT does not return a bool on Ethereum but Morph's bridged USDT may, so `SafeERC20` handles both.
10. **No upgradeability in v1.** A new project = a new escrow. If we need to fix a bug, the factory deploys a new implementation.

### 7.3 PositionNFT.sol

ERC-721, one contract per project, minted by the escrow.

```solidity
interface IPositionNFT is IERC721 {
    function mint(address to, uint256 amount, uint256 m0Share) external returns (uint256 tokenId); // onlyEscrow
    function positionOf(uint256 tokenId) external view returns (uint256 amount, uint256 m0Share, uint64 contributedAt);
    function tokenURI(uint256 tokenId) external view returns (string memory); // points at /api/nft/{contract}/{tokenId}
}
```

- `baseURI` is set at construction to `https://<host>/api/nft/`. `tokenURI(id)` returns `baseURI + address(this) + "/" + id.toString()`.
- Positions are **transferable** but the backer behind a transferred NFT is what matters for voting at the moment of voting (the contract reads `totalContributedBy[msg.sender]`, not the NFT holder). The agent should document this nuance: voting power is tied to the wallet that contributed, not to NFT ownership. (Alternative — read voting power from NFT holdings — would require iterating NFTs per holder, which is gas-inefficient. We stick with wallet-based voting power; transfers don't change voting rights.)

### 7.4 Deployment Scripts (`/contracts/script/`)
- `DeployFactory.s.sol` — deploys `ProjectFactory` with the USDT address.
- `Verify.s.sol` — verifies contracts on Morph's block explorer (use `forge verify-contract`).

### 7.5 Test Coverage Targets
- Branch coverage ≥ 90 % on `ProjectEscrow` and `PositionNFT`.
- Invariant tests (Foundry fuzz) for: total accounting, double-vote prevention, only-org claim, status transitions.
- Fork tests against Morph testnet (Hoodi) at minimum once before mainnet deploy.

---

## 8. Indexer Service

A standalone Node.js process (`apps/indexer/`) runs alongside the web app. Responsibilities:

- Subscribes to factory `ProjectCreated` events; writes `Project.escrowAddress` / `Project.nftAddress`.
- Subscribes to each known escrow's `Contributed`, `MilestoneSubmitted`, `Voted`, `MilestoneResolved`, `MilestoneClaimed`.
- Mirrors events into the database tables (`Contribution`, `MilestoneVote`, `Milestone` status updates).
- Enqueues emails into BullMQ (separate Redis-backed queue).
- Re-org safety: confirm events at 12 block confirmations before writing to DB. Use viem's `watchContractEvent` with `pollingInterval` set; store last-processed block per contract in `IndexerCursor` table.
- Backfill on startup: read from last cursor to current head.

Add this to schema:
```prisma
model IndexerCursor {
  id          String   @id @default(cuid())
  contract    String   @db.Citext
  eventName   String
  lastBlock   BigInt
  updatedAt   DateTime @updatedAt

  @@unique([contract, eventName])
}
```

A separate scheduled job (running every minute) calls `ProjectEscrow.resolveMilestone()` for any milestone whose voting period has elapsed. The indexer process owns this job and uses a deployer-controlled key (or any key — `resolveMilestone` is permissionless by design). The keeper key is stored as `KEEPER_PRIVATE_KEY`.

---

## 9. Frontend Pages

All routes are under `apps/web/app/`. Auth-gated routes use Better Auth middleware. SSR/RSC by default; only interactive components are `"use client"`.

### 9.1 Public

| Route | Description |
| --- | --- |
| `/` | Landing: hero, "How it works", featured projects, CTA. |
| `/projects` | Searchable / filterable list of LIVE projects. Filters: category, raise size, status. |
| `/projects/[slug]` | Project detail: pictures, markdown description, target vs raised progress, milestone timeline, backer count, contribute CTA, milestone vote status. |
| `/organizations/[slug]` | Organization page: profile, all their projects, verification badge. |
| `/how-it-works` | Static explainer. |
| `/about` | Static. |
| `/auth/sign-in` | Better Auth sign-in (Google primary, admin credentials separated under a "Staff login" link). |
| `/auth/sign-up` | Google sign-up (no email/password for end users). |
| `/legal/terms`, `/legal/privacy` | Static. |

### 9.2 Backer (signed in)

| Route | Description |
| --- | --- |
| `/dashboard` | Summary: total contributed, NFT positions count, active votes, recent activity. |
| `/dashboard/contributions` | List of all the user's contributions across projects, with NFT links. |
| `/dashboard/contributions/[id]` | Detail view: NFT metadata, project link, per-milestone allocation breakdown. |
| `/dashboard/votes` | Active and historical votes for the user's backed projects. |
| `/dashboard/notifications` | Email log + in-app notifications. |
| `/dashboard/settings` | Profile, linked wallets (add/remove/primary), email preferences. |

### 9.3 Organization Owner

| Route | Description |
| --- | --- |
| `/org/dashboard` | If the user owns ≥1 org, lists them. Otherwise: "You're not an org owner; contact a Super Admin." |
| `/org/dashboard/[orgId]` | Selected org overview: projects, totals, verification status. |
| `/org/dashboard/[orgId]/projects` | List projects for this org. |
| `/org/dashboard/[orgId]/projects/new` | Multi-step project creation wizard. Triggers `ProjectFactory.createProject` on submit. |
| `/org/dashboard/[orgId]/projects/[id]` | Project management: edit metadata, view contributions, manage milestones. |
| `/org/dashboard/[orgId]/projects/[id]/milestones/[mid]` | Single-milestone view: submit for vote (write `updateURI`), see tally, claim button when PASSED. |
| `/org/dashboard/[orgId]/settings` | Edit org profile (subject to verification re-review for material changes). |

### 9.4 Super Admin

| Route | Description |
| --- | --- |
| `/admin` | Dashboard: counts of orgs, projects, raised volume, pending verifications, recent activity. |
| `/admin/organizations` | Table: filter by `verifiedStatus`. Verify/Reject buttons. |
| `/admin/organizations/new` | Create org + assign initial owner(s). |
| `/admin/organizations/[id]` | Org detail, add/remove owners, force-verify/reject. |
| `/admin/users` | Search users by email/wallet. Promote/demote roles. |
| `/admin/projects` | All projects across the platform. Pause/cancel buttons. |
| `/admin/audit-logs` | Searchable, filterable audit log. Export CSV. |
| `/admin/emails` | Email delivery log (queued/sent/failed) with retry button. |
| `/admin/reports` | Pre-built: raises per week, top orgs, milestone pass/fail rate, vote turnout. |
| `/admin/settings` | Platform-level: voting period min/max bounds, featured projects. |

### 9.5 Layout & Component Conventions
- Use shadcn/ui patterns for tables, dialogs, forms. Avoid building bespoke primitives where Radix covers it.
- Forms: React Hook Form + Zod, with shared Zod schemas in `packages/shared/src/schemas`.
- Markdown: render with `react-markdown` + `remark-gfm` + `rehype-sanitize`. Never `dangerouslySetInnerHTML`.

---

## 10. API Endpoints

All under `apps/web/app/api/`. Where Server Actions are equally appropriate (e.g., form submissions), prefer Server Actions over REST. The list below covers REST endpoints that are needed for: webhook-style integrations, programmatic admin tools, and client-side fetches.

### 10.1 Authentication
| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| ALL | `/api/auth/[...all]` | Public | Better Auth handler (Google OAuth callback, sign-in/out, session). |
| POST | `/api/auth/admin/sign-in` | Public | Admin credentials sign-in (rate-limited 5/min/IP). |
| POST | `/api/auth/wallet/nonce` | Authed | Returns a SIWE nonce for the given wallet to sign. |
| POST | `/api/auth/wallet/verify` | Authed | Verifies the SIWE signature, links wallet to user. |
| DELETE | `/api/auth/wallet/[address]` | Authed | Unlinks a wallet (cannot unlink the only/primary if active contributions exist). |

### 10.2 Organizations
| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/organizations` | Public | Paginated list of VERIFIED orgs. Query: `q`, `page`, `limit`. |
| GET | `/api/organizations/[id]` | Public | Public org profile. |
| PATCH | `/api/organizations/[id]` | Org owner | Update org profile. |
| POST | `/api/organizations` | Super Admin | Create org. |
| POST | `/api/organizations/[id]/verify` | Super Admin | Set verifiedStatus = VERIFIED. |
| POST | `/api/organizations/[id]/reject` | Super Admin | Set verifiedStatus = REJECTED. |
| POST | `/api/organizations/[id]/members` | Super Admin | Add an org owner (by user email). |
| DELETE | `/api/organizations/[id]/members/[userId]` | Super Admin | Remove an org owner. |

### 10.3 Projects
| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/projects` | Public | Paginated. Query: `q`, `status`, `orgId`. |
| GET | `/api/projects/[id]` | Public | Project detail (includes milestones). |
| POST | `/api/projects` | Org owner | Create draft. Validates milestoneBps sum and N range. |
| PATCH | `/api/projects/[id]` | Org owner | Edit draft. Once `LIVE`, only `description`, `pictures`, `socialLinks`, `backingLinks` editable. |
| POST | `/api/projects/[id]/publish` | Org owner | Returns transaction calldata for `ProjectFactory.createProject`. Frontend executes via wallet. Backend then receives the receipt via `/api/projects/[id]/publish/confirm`. |
| POST | `/api/projects/[id]/publish/confirm` | Org owner | Submit tx hash; backend awaits 12 confirmations, reads logs, persists `escrowAddress`/`nftAddress`, flips status to LIVE. |
| POST | `/api/projects/[id]/pause` | Super Admin | Sets status to PAUSED (off-chain only — does not affect escrow). |
| POST | `/api/projects/[id]/cancel` | Super Admin | Sets status to CANCELLED. |

### 10.4 Milestones
| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/projects/[id]/milestones` | Public | List. |
| POST | `/api/projects/[id]/milestones/[mid]/submit` | Org owner | Returns calldata for `submitMilestone`. Frontend sends tx; backend records via indexer. |
| POST | `/api/projects/[id]/milestones/[mid]/claim` | Org owner | Returns calldata for `claimMilestone`. |
| GET | `/api/projects/[id]/milestones/[mid]/votes` | Public | Tally (live, may be ahead of chain by indexer lag — annotate as such). |

### 10.5 Contributions
| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/projects/[id]/contributions` | Public | Paginated list (anonymized: wallet only). |
| GET | `/api/users/me/contributions` | Authed | Current user's contributions. |

### 10.6 NFT metadata
| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/nft/[contract]/[tokenId]` | Public | ERC-721 metadata JSON. `Cache-Control: public, max-age=60`. |

### 10.7 Files
| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/upload` | Authed | Multipart upload. Validates content-type (images only), max 5 MB, virus-scans optional. Returns public URL served by `/api/files/[...]`. |
| GET | `/api/files/[...path]` | Public | Streams from Railway Volume / MinIO. |

### 10.8 Admin
| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/admin/users` | Super Admin | Search users. |
| PATCH | `/api/admin/users/[id]` | Super Admin | Update role. |
| GET | `/api/admin/audit-logs` | Super Admin | Paginated, filterable. |
| GET | `/api/admin/audit-logs.csv` | Super Admin | Streamed CSV export. |
| GET | `/api/admin/emails` | Super Admin | Email log. |
| POST | `/api/admin/emails/[id]/retry` | Super Admin | Re-enqueue a failed email. |

### 10.9 Health & Ops
| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | Liveness probe. |
| GET | `/api/ready` | Public | DB + Redis reachable. |

All endpoints:
- Use **Zod** for request body validation.
- Return RFC 7807 problem details on 4xx/5xx.
- Are rate-limited via Redis (`@upstash/ratelimit`-style logic): default 60 req/min per IP, 10 req/min per IP for write endpoints, 5 req/min for auth-sensitive endpoints.

---

## 11. Email Notifications

Resend SDK with React Email templates under `apps/web/emails/`.

| Trigger | Recipients | Template |
| --- | --- | --- |
| User signs up via Google for the first time. | The user. | `WELCOME` |
| `Contribution` row inserted by indexer. | The backer (if linked to a user). | `CONTRIBUTION_RECEIVED` |
| Milestone `description` or `deliverableDate` edited by Org Owner. | All backers of the project. | `MILESTONE_UPDATED` |
| Sweeper job 24h before `deliverableDate` if not yet submitted. | All backers of the project. | `MILESTONE_VOTE_COMING_SOON` |
| Indexer observes `MilestoneSubmitted` event. | All backers of the project. | `MILESTONE_VOTE_OPEN` |
| Indexer observes `MilestoneResolved` event. | All backers of the project. | `MILESTONE_VOTE_OUTCOME` |
| Indexer observes `MilestoneClaimed` event. | All backers of the project. | `MILESTONE_CLAIMED` |
| Super Admin verifies / rejects an org. | All owners of the org. | `ORG_VERIFIED` / `ORG_REJECTED` |
| Super Admin invites a user as Org Owner. | The invited user. | `ADMIN_INVITATION` |

Implementation notes:
- All emails go through the `EmailNotification` table (queue + audit). The indexer / web app inserts a `QUEUED` row, then BullMQ worker calls Resend and updates `status` + `resendId`.
- Resend webhooks (delivered, bounced, complained) update the row. Add `/api/webhooks/resend` endpoint with signature verification.
- All templates support a one-click unsubscribe for non-essential emails (CONTRIBUTION_RECEIVED, MILESTONE_UPDATED). Vote-open / outcome / claim emails are essential (transactional) and not unsubscribable.

---

## 12. Activity Logging

Every state-changing action writes an `ActivityLog` row. Logs are append-only — no UPDATE or DELETE in any code path. Admin UI exposes search and CSV export.

Minimal capture for every entry:
- `actorUserId` (the User performing the action, if any)
- `actorWallet` (the wallet that signed, if any)
- `type` (enum)
- `targetType`, `targetId`
- `metadata` JSON
- `ipAddress`, `userAgent`

Examples of `metadata` content:
- `MILESTONE_VOTE_CAST` → `{ projectId, milestoneIndex, choice, weight, txHash }`
- `PROJECT_PUBLISHED` → `{ escrowAddress, nftAddress, txHash, blockNumber }`
- `ADMIN_ACTION` → `{ action: "promote_role", from: "BACKER", to: "ORG_OWNER", reason?: string }`

Retention: indefinite. Backups: daily Postgres backup via Railway.

---

## 13. Admin Features (recap)

The Super Admin can:
- Create, edit, verify, reject, and delete organizations.
- Add/remove Org Owners on any org.
- Promote / demote users (BACKER ↔ ORG_OWNER ↔ SUPER_ADMIN). Cannot demote oneself if last super admin.
- View and export the full activity log.
- View email delivery log; retry failed sends.
- Pause or cancel any project (off-chain status). Pause hides from `/projects` and disables the contribute UI but does not stop the escrow contract.
- View pre-built reports.
- Configure platform-wide defaults (default voting period, voting period min/max).
- Trigger keeper resolution manually for stuck milestones.

---

## 14. Third-Party Services

| Service | Use | Notes |
| --- | --- | --- |
| **Railway** | Hosting Postgres, Redis, Volume, Web app, Indexer | Single project, multiple services. |
| **Google Cloud (OAuth)** | Sign in with Google | Create OAuth Client ID; configure authorized redirect: `https://<host>/api/auth/callback/google`. |
| **Resend** | Transactional email | Verify sending domain. Enable webhook for delivery events. |
| **Reown (WalletConnect)** | Wallet connection UX | Create a Project on `cloud.reown.com`, get Project ID. Feature Bitget Wallet via AppKit's `featuredWalletIds` (Bitget's WalletConnect ID). |
| **Morph L2 RPC** | Onchain reads + writes | Use `https://rpc.morphl2.io` for public read; for higher throughput use Tenderly Node or QuickNode Morph endpoint and store in `MORPH_RPC_URL`. |
| **Morph Explorer** | Contract verification + UI links | `https://explorer.morphl2.io`. |
| **GitHub Actions** | CI | Lint, typecheck, test, contract tests, build. |

---

## 15. Security Requirements

Mandatory:

1. **Secrets** — Never in client bundle. Use `NEXT_PUBLIC_*` only for explicitly public values. All others server-only. Railway environment variables for prod; `.env.local` for dev.
2. **CSRF** — Better Auth handles CSRF for auth flows; for state-changing API routes used by browsers, require either the Better Auth session cookie (which has SameSite=Lax) AND an `Origin` header check, or use Server Actions (which Next.js protects automatically). Disable CORS for the API entirely except for explicitly whitelisted origins.
3. **XSS** — Markdown rendered through `rehype-sanitize` with an explicit allowlist. No `dangerouslySetInnerHTML` anywhere else.
4. **SQL injection** — All queries via Prisma. No raw SQL except in seeded migrations, which never include user input.
5. **Authorization** — Every API handler must call a centralized `assertRole(session, role)` or `assertOwnsOrg(session, orgId)` helper. Tests must cover the 403 path.
6. **Wallet signature replay** — SIWE nonces are single-use; stored in `Verification` with 10-minute TTL and deleted on use.
7. **Rate limiting** — Redis-backed sliding window. Bypass only with a server-only API key for the indexer's webhook endpoint.
8. **Idempotency** — `/api/projects/[id]/publish/confirm`, `/api/admin/emails/[id]/retry`, and any tx-confirmation endpoint must be idempotent. Use the tx hash as the idempotency key.
9. **Smart contracts** — Use `ReentrancyGuard`, `SafeERC20`, `AccessControl`. No `tx.origin`. No unbounded loops over backers (vote tallies are accumulated incrementally on each `vote()` call). Run Slither + `forge test --gas-report` in CI.
10. **USDT decimals** — USDT on Morph uses 6 decimals. **All arithmetic in the contract assumes 6 decimals.** The agent must never hardcode 18 anywhere.
11. **Funds-at-rest** — The platform never holds backer funds in a custodial wallet. All funds live in `ProjectEscrow` instances and move only through onchain actions.
12. **Keeper key** — `KEEPER_PRIVATE_KEY` (used to call `resolveMilestone`) has no special on-chain authority and holds only enough ETH for gas. Rotate quarterly.
13. **Logging hygiene** — Never log raw `passwordHash`, `accessToken`, `refreshToken`, `KEEPER_PRIVATE_KEY`, or full session tokens. Use a redaction layer on the logger.
14. **Backups** — Railway Postgres daily snapshot, 7-day retention. Document restore drill in `RUNBOOK.md`.
15. **Dependency hygiene** — Renovate / Dependabot weekly. `pnpm audit --prod` in CI must pass with no high/critical advisories.
16. **Content Security Policy** — Set strict CSP headers in `next.config.ts` middleware: `default-src 'self'`; allow `script-src 'self' 'wasm-unsafe-eval'`; explicit RPC and Reown origins for `connect-src`.
17. **Admin login** — Locked to allowlisted IPs in production where possible. At minimum, require strong passwords (≥ 14 chars), bcrypt (cost ≥ 12) or argon2id, and 2FA-by-TOTP (can be deferred to v1.1 if scope-pressing).

---

## 16. Deployment (Railway)

A single Railway project containing four services:

1. **`web`** — Next.js app. Build: `pnpm install --frozen-lockfile && pnpm --filter web build`. Start: `pnpm --filter web start`. Exposes HTTP.
2. **`indexer`** — Node process. Build: `pnpm install --frozen-lockfile && pnpm --filter indexer build`. Start: `pnpm --filter indexer start`. No public port.
3. **`postgres`** — Railway Postgres plugin. Provides `DATABASE_URL`.
4. **`redis`** — Railway Redis plugin. Provides `REDIS_URL`.

A Railway Volume named `uploads` is mounted at `/data/uploads` in the `web` service.

Pre-deploy steps (per environment):
1. Set all env vars (see § 17).
2. Run `pnpm --filter web exec prisma migrate deploy`.
3. Run `pnpm --filter web exec prisma db seed` **only once** for the bootstrap super-admin account.
4. Deploy `web`.
5. Deploy `indexer` once factory contract address is known.

Smart contract deployment (one-time):
1. `cd contracts && forge build`.
2. `forge script script/DeployFactory.s.sol --rpc-url $MORPH_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY --broadcast --verify`.
3. Record `FACTORY_ADDRESS` and set in Railway env vars on `web` and `indexer`.

---

## 17. Environment Variables

All apps:

```bash
# ── Database ────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://user:pass@host:5432/ember
SHADOW_DATABASE_URL=postgresql://user:pass@host:5432/ember_shadow  # required for Prisma migrate on managed PG

# ── Cache / Queue ──────────────────────────────────────────────────────────
REDIS_URL=redis://default:pass@host:6379

# ── Auth ───────────────────────────────────────────────────────────────────
BETTER_AUTH_SECRET=base64-32-bytes
BETTER_AUTH_URL=https://app.ember.example
AUTH_GOOGLE_ID=...apps.googleusercontent.com
AUTH_GOOGLE_SECRET=...

# ── Admin seed (used by prisma/seed.ts only) ───────────────────────────────
SEED_SUPER_ADMIN_EMAIL=admin@ember.example
SEED_SUPER_ADMIN_PASSWORD=ChangeMeOnFirstLogin!  # must be reset on first login

# ── Email ──────────────────────────────────────────────────────────────────
RESEND_API_KEY=re_...
EMAIL_FROM="Ember <no-reply@ember.example>"
RESEND_WEBHOOK_SECRET=whsec_...

# ── Wallet UX ──────────────────────────────────────────────────────────────
NEXT_PUBLIC_REOWN_PROJECT_ID=...                  # from cloud.reown.com
NEXT_PUBLIC_APP_NAME=Ember
NEXT_PUBLIC_APP_URL=https://app.ember.example

# ── Chain ──────────────────────────────────────────────────────────────────
NEXT_PUBLIC_MORPH_CHAIN_ID=2818
NEXT_PUBLIC_MORPH_RPC_URL=https://rpc.morphl2.io
NEXT_PUBLIC_MORPH_EXPLORER_URL=https://explorer.morphl2.io
NEXT_PUBLIC_USDT_ADDRESS=0xc7d67a9cbb121b3b0b9c053dd9f469523243379a
NEXT_PUBLIC_FACTORY_ADDRESS=0x...                 # set after deploy

# ── Indexer / Keeper ───────────────────────────────────────────────────────
KEEPER_PRIVATE_KEY=0x...                          # used by indexer for resolveMilestone()
INDEXER_CONFIRMATIONS=12

# ── Storage ────────────────────────────────────────────────────────────────
STORAGE_DRIVER=railway-volume                     # or "minio" or "s3"
STORAGE_ROOT=/data/uploads                        # for railway-volume
S3_ENDPOINT=                                      # for minio/s3
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=

# ── Limits ─────────────────────────────────────────────────────────────────
MAX_UPLOAD_BYTES=5242880
DEFAULT_VOTING_PERIOD_SECONDS=604800              # 7 days

# ── Observability ──────────────────────────────────────────────────────────
LOG_LEVEL=info
SENTRY_DSN=                                       # optional
```

`.env.example` checked in to the repo with placeholder values.

---

## 18. Development Setup

### 18.1 docker-compose.yml

```yaml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: ember
      POSTGRES_USER: ember
      POSTGRES_PASSWORD: ember
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minio
      MINIO_ROOT_PASSWORD: miniominio
    ports: ["9000:9000", "9001:9001"]
    volumes: [miniodata:/data]

  mailhog:
    image: mailhog/mailhog:latest
    ports: ["1025:1025", "8025:8025"]

  anvil:
    image: ghcr.io/foundry-rs/foundry:latest
    command: "anvil --host 0.0.0.0 --chain-id 31337"
    ports: ["8545:8545"]

volumes:
  pgdata:
  miniodata:
```

### 18.2 Bootstrap commands

```bash
pnpm install
docker compose up -d
cp .env.example .env.local
pnpm --filter web exec prisma migrate dev --name init
pnpm --filter web exec prisma db seed
(cd contracts && forge install && forge build && forge test)
pnpm dev   # runs web + indexer concurrently
```

### 18.3 prisma/seed.ts requirements
- Creates a `User` with `role = SUPER_ADMIN`, email = `SEED_SUPER_ADMIN_EMAIL`, `passwordHash` = bcrypt/argon2id hash of `SEED_SUPER_ADMIN_PASSWORD`.
- Idempotent: if the admin already exists, no-op (don't reset the password).
- Logs the credentials only on first creation in development; never in production logs.

---

## 19. Reward-Curve Computation (canonical)

The factory and the project-creation form must agree on these formulas. Compute integer basis points (out of 10000), apportion any rounding residue to the last milestone so the sum is exactly 10000.

- **LINEAR**: `bps[i] = floor(10000 / N)`, last gets residue.
- **EXPONENTIAL**: `bps[i] ∝ 2^i`. Compute `weights[i] = 2^i`, sum, scale to 10000, last gets residue.
- **BINARY**: `bps[0] = 0`, `bps[N-1] = 10000`. (Wait — m0 is auto-released. If `bps[0] = 0`, nothing is auto-released, which matches the BINARY intent: org gets nothing until the very end.)
- **CUSTOM**: user-supplied array of N integers summing to exactly 10000. Validate strictly.

Server-side Zod schema must validate `sum(bps) === 10000` and `bps.length === N` and `N in [2, 20]`.

---

## 20. Open Questions / Assumptions (confirmed by the founder)

1. **Smart contracts in scope** — Yes, in `/contracts`.
2. **Vote weighting** — By amount contributed (cumulative per backer per project).
3. **NO outcome** — Funds locked indefinitely until org resubmits. No timeout, no refund.
4. **Repeat contributions** — Each contribution mints a new NFT.
5. **Funding model** — Flexible per-milestone with auto-release of milestone 0.
6. **Stablecoin** — USDT only (bridged USDT on Morph).
7. **Voting period** — Configurable per project, default 7 days, range 3–30 days.
8. **Wallet support** — Reown AppKit (WalletConnect) with Bitget Wallet featured.
9. **Project approval** — Only orgs need verification; projects auto-go-live on publish.
10. **Custom reward curve** — Array of basis points summing to 10000.
11. **File storage** — Railway Volume in prod, MinIO in dev, S3-compatible abstraction.
12. **Super admin** — Single seeded super admin; additional super admins promoted via `/admin/users`.

---

## 21. Acceptance Criteria (v1)

The application is considered v1-complete when:

- A Super Admin can sign in with the seeded credentials, create an organization, assign an owner, and verify it.
- An Org Owner can sign in with Google, create a project with 4 linear milestones, publish it (one wallet tx for `createProject`), and see the escrow + NFT addresses appear in the UI within ~30s of the tx confirming.
- A Backer can sign in with Google, connect Bitget Wallet, contribute 100 USDT in two txs (approve + contribute), receive a position NFT visible in their wallet, and observe 25 USDT auto-released to the org wallet onchain.
- The Org Owner can submit milestone 1 for vote, the system emails all backers, the backer can vote YES, the indexer's scheduled job resolves the vote after `voteEndAt`, the org claims 25 USDT, and the backer receives the outcome + claimed emails.
- All actions appear in `/admin/audit-logs`.
- Foundry test suite passes with ≥ 90 % branch coverage on `ProjectEscrow`.
- E2E test (Playwright) covering the above flow against Morph Hoodi testnet passes in CI.
- Lighthouse on `/projects/[slug]` ≥ 90 on Performance, Accessibility, Best Practices.

---

*End of SPEC.md*
