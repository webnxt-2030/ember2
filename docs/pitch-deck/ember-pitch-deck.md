---
marp: true
paginate: true
size: 16:9
footer: "Ember · Secured by Morph L2"
---

<style>
:root {
  --ember: #b72301;
  --ember-bright: #ff5733;
  --ember-soft: #ffdad3;
  --green: #006c4b;
  --green-bright: #00a574;
  --ink: #191c1d;
  --muted: #5b403a;
  --bg: #f8f9fa;
  --surface: #ffffff;
  --line: #e4beb6;
}

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');

section {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--ink);
  font-size: 24px;
  line-height: 1.45;
  padding: 56px 70px;
  letter-spacing: -0.005em;
}

h1 { font-size: 52px; font-weight: 700; letter-spacing: -0.02em; color: var(--ink); margin: 0 0 12px; }
h2 { font-size: 34px; font-weight: 600; letter-spacing: -0.01em; color: var(--ink); margin: 0 0 18px; }
h3 { font-size: 22px; font-weight: 600; color: var(--ink); margin: 0 0 6px; }
strong { color: var(--ember); font-weight: 600; }
a { color: var(--ember); }
em { color: var(--muted); font-style: normal; }

/* eyebrow label */
section > h2 + p.eyebrow, p.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 14px;
  font-weight: 600;
  color: var(--ember);
  margin: 0 0 6px;
}

ul, ol { margin-top: 8px; }
li { margin: 8px 0; }

code {
  font-family: 'JetBrains Mono', monospace;
  background: #edeeef;
  color: var(--ink);
  padding: 1px 7px;
  border-radius: 5px;
  font-size: 0.82em;
}

table { font-size: 21px; border-collapse: collapse; width: 100%; }
th { background: #edeeef; color: var(--ink); text-align: left; padding: 10px 14px; font-weight: 600; }
td { padding: 10px 14px; border-bottom: 1px solid #e1e3e4; }

footer { color: var(--muted); font-size: 13px; }
section::after { color: var(--muted); font-size: 13px; } /* pagination */

/* ---------- Cover ---------- */
section.cover {
  background: radial-gradient(120% 120% at 80% -10%, #2a0c05 0%, #191c1d 55%);
  color: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
section.cover h1 { color: #ffffff; font-size: 76px; margin-bottom: 4px; }
section.cover .spark { color: var(--ember-bright); }
section.cover .lead { font-size: 30px; font-weight: 500; color: #ffd9d0; margin: 8px 0 28px; }
section.cover .meta { font-size: 19px; color: #c8b7b2; letter-spacing: 0.01em; }
section.cover footer, section.cover::after { color: #8c7a75; }

/* ---------- Section divider ---------- */
section.divider {
  background: var(--ember);
  color: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
section.divider h1 { color: #ffffff; font-size: 60px; }
section.divider p { color: #ffe1da; font-size: 26px; }
section.divider strong { color: #ffffff; }
section.cover strong { color: #ffffff; }
section.divider footer, section.divider::after { color: #ffc9bd; }

/* ---------- Stat / highlight helpers ---------- */
.cols { display: flex; gap: 36px; }
.col { flex: 1; }
.card {
  background: var(--surface);
  border: 1px solid #e1e3e4;
  border-radius: 14px;
  padding: 22px 24px;
}
.stat { font-size: 46px; font-weight: 700; color: var(--ember); letter-spacing: -0.02em; line-height: 1.05; }
.stat.green { color: var(--green); }
.statlabel { font-size: 17px; color: var(--muted); margin-top: 4px; }
.pill { display: inline-block; background: var(--ember-soft); color: #8c1800; font-size: 15px; font-weight: 600; padding: 3px 12px; border-radius: 999px; }
.pill.green { background: #c8f7e4; color: #003120; }
.big { font-size: 30px; line-height: 1.4; }
.muted { color: var(--muted); }
</style>

<!-- _class: cover -->
<!-- _paginate: false -->

<p class="meta">BUILD IN! PAYMENTS · MORPH L2</p>

# Ember<span class="spark">.</span>

<p class="lead">Fund the future, one milestone at a time.</p>

<p class="meta">Milestone-based onchain crowdfunding · Built on Morph L2</p>

---

## Crowdfunding is broken — and backers pay for it

<p class="eyebrow">The problem</p>

Platforms like Kickstarter hand creators **100% of the funds upfront** — before a single promise is kept.

When the project stalls, **the backer eats the loss.** No recourse, no refund, no leverage.

<div class="cols">
<div class="col card">

### Today
- Funds released on day one
- Trust sits with a platform
- Disputes settled by support tickets

</div>
<div class="col card">

### The cost
- Broken promises, no accountability
- High fees on every transaction
- Worst in emerging markets that need it most

</div>
</div>

---

## In Southeast Asia, the gap is widest

<p class="eyebrow">Why here, why now</p>

<div class="cols">
<div class="col">

- The **Philippines** is among the world's leaders in **crypto-wallet adoption**.
- Millions already hold and move **USDT** for remittances and savings.
- A fast-growing **creator economy** and **SME** base — underserved by banks.
- Small businesses lack the **escrow, controls, and capital access** big institutions take for granted.

</div>
<div class="col card">

<p class="big">The infrastructure to fix this already exists onchain.</p>

What's missing is a product that puts it in the hands of everyday creators and small businesses.

</div>
</div>

---

<!-- _class: divider -->
<!-- _paginate: false -->

# Ember

Onchain crowdfunding where funds release **as creators deliver — not before.**

---

## What Ember does

<p class="eyebrow">The solution</p>

Backers contribute **USDT** into a project's own **escrow smart contract** and receive an **ERC-721 position NFT** as proof of stake.

Funds release to the creator **only when backers vote to approve each milestone.**

<div class="cols">
<div class="col card">

### Trust-first
Cryptographic guarantees, not platform promises. **Non-custodial** — Ember never holds your funds.

</div>
<div class="col card">

### Algorithmic
**Code** decides fund release. No human discretion, no customer-service-as-justice.

</div>
<div class="col card">

### Stablecoin-native
**USDT on Morph L2.** No volatile tokens on a pledge. Low fees, fast settlement.

</div>
</div>

---

## How it works

<p class="eyebrow">Four steps, fully onchain</p>

| Step | What happens | Onchain |
|---|---|---|
| **1 · Create** | A verified org publishes a project with milestones | `ProjectFactory` deploys a dedicated escrow + NFT |
| **2 · Back** | Backers contribute USDT, mint a position NFT | `ProjectEscrow.contribute()` |
| **3 · Vote** | Each milestone is approved by **weighted backer vote** | `vote()` → `resolveMilestone()` |
| **4 · Release** | Funds release **only** for passed milestones | `claimMilestone()` → USDT to creator |

A permissionless **keeper** resolves milestones when the voting window closes — no one can stall a payout.

---

## Built and working — on Morph

<p class="eyebrow">Demo · what's live today</p>

<div class="cols">
<div class="col">

- **Full flow deployed** to Morph Hoodi testnet
- Create → publish → back → vote → release, end to end
- Backer & org **dashboards**, in-app + email notifications
- **Admin panel**: org verification, audit logs, reports
- Project metadata + **NFT positions** served live

</div>
<div class="col card">

<p class="pill green">Live on testnet</p>

<p class="big">A working product, not a whitepaper.</p>

Web app, event indexer, and immutable contracts — all running together.

</div>
</div>

---

## Under the hood

<p class="eyebrow">Technical execution</p>

<div class="cols">
<div class="col card">

### Contracts (Solidity + OZ v5)
- `ProjectFactory` — one **immutable** escrow + NFT per project
- `ProjectEscrow` — USDT custody, weighted voting, milestone release
- `PositionNFT` — transferable ERC-721 proof of stake
- **No upgrade key** — the rules can't change after deploy

</div>
<div class="col card">

### Platform
- **Next.js 16** web app + REST API
- Standalone **indexer** mirrors every onchain event into Postgres
- **Keeper** auto-resolves milestones; **BullMQ** drives notifications
- Chain is the source of truth — UI reconciles to it

</div>
</div>

---

## The track: tools big banks take for granted

<p class="eyebrow">Build In! Payments — SME track</p>

Escrow. Programmatic fund control. Milestone-based disbursement. Auditable money flows.

<p class="big">These are the financial controls <strong>large institutions</strong> rely on. Ember puts them in the hands of a <strong>small creator or SME</strong> — with nothing but a wallet.</p>

A baker, a hardware startup, a community project can now raise capital with the **same accountability guarantees** a bank gives a corporate client.

---

## Why Ember wins

<p class="eyebrow">Differentiation</p>

| | Funds held until delivery | Non-custodial | Onchain proof | Stablecoin |
|---|:---:|:---:|:---:|:---:|
| **Kickstarter / GoGetFunding** | ❌ | ❌ | ❌ | ❌ |
| **Traditional escrow / banks** | ✅ | ❌ | ❌ | ❌ |
| **Generic crypto crowdfunding** | ⚠️ | ✅ | ✅ | ⚠️ |
| **Ember** | ✅ | ✅ | ✅ | ✅ |

Milestone escrow **+** weighted on-chain voting **+** position NFTs — accountability that neither Web2 platforms nor token launchpads offer.

---

## The opportunity

<p class="eyebrow">Market</p>

<div class="cols">
<div class="col card">
<p class="stat">$30B+</p>
<p class="statlabel">Annual remittances into the Philippines — a population already fluent in moving stablecoins</p>
</div>
<div class="col card">
<p class="stat green">Top-ranked</p>
<p class="statlabel">Philippines among global leaders in crypto-wallet adoption</p>
</div>
<div class="col card">
<p class="stat">Millions</p>
<p class="statlabel">SMEs and creators across SEA underserved by traditional capital and escrow</p>
</div>
</div>

<p class="muted">Figures are directional, drawn from widely reported public data — sized to the wedge, not the world.</p>

---

## How Ember makes money

<p class="eyebrow">Business model</p>

<div class="cols">
<div class="col">

- A **small platform fee** on each **milestone release** — we earn only when creators actually deliver.
- Revenue is **aligned with backers**: no delivery, no fee.
- **No token. No sale. No custody.** Pledges are utility, not securities.

</div>
<div class="col card">

### Why it scales
Every project deploys its own escrow. Cost to serve is near-zero on **Morph L2**, so the model works at a **$50 pledge** as well as a **$50,000** one.

</div>
</div>

---

## Roadmap

<p class="eyebrow">What's next</p>

<div class="cols">
<div class="col card">

### Now
- Working demo on **Morph testnet**
- Core flow, dashboards, admin

</div>
<div class="col card">

### Next
- **Mainnet** launch on Morph
- Fiat ↔ USDT **on-ramp** for non-crypto backers
- Org reputation & repeat-creator track record

</div>
<div class="col card">

### Later
- Secondary market for **position NFTs**
- A **money layer for agentic AI** disbursement
- Cross-border SME financing rails

</div>
</div>

---

## Build-in-public

<p class="eyebrow">How we built it</p>

- Shipped **end to end during the hackathon** — contracts, indexer, web app, admin.
- Documented architecture: **C4 diagrams** and **sequence flows** for every onchain interaction.
- Open, reviewable codebase with CI: lint, typecheck, tests, and a security checklist.
- Operations **runbook** for keeper rotation, backups, and incident response.

<p class="big">We didn't just demo a feature. We built something a real org could run.</p>

---

<!-- _class: cover -->
<!-- _paginate: false -->

<p class="meta">EMBER · SECURED BY MORPH L2</p>

# Fund the future,<br>one milestone at a time<span class="spark">.</span>

<p class="lead">Crowdfunding that delivers.</p>

<p class="meta">Thank you — questions welcome.</p>
