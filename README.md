# Ember

A milestone-based, onchain crowdfunding dApp on Morph L2.

Backers contribute USDT to escrow contracts. Funds release to organizations only when backers approve each milestone.

## Architecture

- **`apps/web`** — Next.js 16 frontend + API (App Router, Turbopack)
- **`apps/indexer`** — Standalone Node.js service for indexing onchain events
- **`packages/shared`** — Shared TypeScript types, ABIs, and constants
- **`packages/ui`** — Shared UI component library
- **`contracts/`** — Foundry smart contracts (Solidity ^0.8.28)

## Getting Started

### Prerequisites

- Node.js 22.x LTS
- pnpm 10.x (`corepack enable && corepack prepare pnpm@latest --activate`)
- Docker (for local Postgres + Redis)

### Install

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

### Lint & Typecheck

```bash
pnpm lint
pnpm typecheck
```

## Documentation

- [`SPEC.md`](./SPEC.md) — Full product specification
- [`AGENT.md`](./AGENT.md) — Coding standards and architecture guide
