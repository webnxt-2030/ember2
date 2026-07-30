# Flare Network port

Status: **assessment only — no application or contract code has changed.**

The full plan — verdict (currently *recommend against a wholesale port*),
current-state analysis, the trust-assumption table, which Flare primitives do
and do **not** fit (FAssets / FDC / FCC / FTSO all evaluated), workstreams with
acceptance criteria, open decisions, and EVM transition costs — lives in the
tracking epic:

- **Epic:** [#180 — Flare Network port](https://github.com/webnxt-2030/ember2/issues/180)

## TL;DR

This repo is already an EVM stack (Morph L2, chain id `2910`, Solidity
`^0.8.28` / Foundry). A Flare move is therefore an **EVM→EVM chain-config
redeploy**, not a rewrite. None of Flare's distinctive primitives fit the
current design, so the port adds no Flare-native advantage to offset the loss
of Morph's ecosystem positioning. See the epic before starting any work.

Working branch: `feat/flare`.
