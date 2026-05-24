# Ember — Operations Runbook

## Database Restore

### Railway Postgres Backup

Railway Postgres takes daily snapshots with 7-day retention automatically.

**To restore from backup:**
1. In Railway dashboard → select the Postgres plugin → click **Backups**.
2. Choose the snapshot to restore from.
3. Click **Restore** — Railway spins up a new Postgres instance from the snapshot.
4. Update `DATABASE_URL` on `web` and `indexer` services to point to the restored instance.
5. Redeploy both services.

**Verify restore:**
```bash
curl https://<your-domain>/api/ready
# → {"status":"ok"}
```

Spot-check one row per critical table:
```sql
SELECT id, email FROM "User" LIMIT 1;
SELECT id, name, status FROM "Organization" LIMIT 1;
SELECT id, title, status FROM "Project" LIMIT 1;
SELECT id, "txHash" FROM "Contribution" LIMIT 1;
```

Retention: 7 days. If the incident is older than 7 days, restore from the most recent available.

---

## Keeper Key Rotation

The `KEEPER_PRIVATE_KEY` is used by the indexer to call `resolveMilestone()` on the escrow contract. It has no special on-chain authority; it only needs ETH for gas. **Rotate quarterly.**

**Rotation procedure:**
1. Generate a new EOA key:
   ```bash
   cast wallet new
   ```
   Record the address and private key securely.

2. Fund the new key with ~0.1 ETH on Morph L2 for gas.

3. Update the Railway environment variable:
   - Railway dashboard → `indexer` service → Variables → `KEEPER_PRIVATE_KEY` → update value.
   
4. Redeploy the `indexer` service. Verify it starts and processes events normally.

5. Confirm the old key has no remaining ETH (sweep if needed), then delete from any secrets manager.

**Verification:**
- Check Railway logs for `[keeper] resolved milestone` entries within the next voting window.
- No errors in indexer logs.

---

## Triggering Keeper Manually (stuck milestone)

If a milestone's `voteEndAt` has passed but it hasn't been resolved (indexer down, etc.):

```bash
# Set these in your env
export MORPH_RPC_URL=https://rpc.morphl2.io
export KEEPER_PRIVATE_KEY=0x...
export ESCROW_ADDRESS=0x...  # the specific ProjectEscrow
export MILESTONE_INDEX=0     # 0-based

# Using cast (Foundry)
cast send \
  --rpc-url $MORPH_RPC_URL \
  --private-key $KEEPER_PRIVATE_KEY \
  $ESCROW_ADDRESS \
  "resolveMilestone(uint256)" \
  $MILESTONE_INDEX
```

`resolveMilestone` is permissionless — any address can call it once `voteEndAt` has passed.

---

## Incident Response

### Rate limit false-positive (legitimate user blocked)

1. Identify the user's IP from Railway logs.
2. Rate limit keys expire after the window (60 seconds). Wait for the window to pass.
3. If needed, connect to Redis and delete the key:
   ```bash
   redis-cli -u $REDIS_URL DEL "ratelimit:auth:<ip>"
   ```

### Email stuck in QUEUED state

1. In Railway → `web` service logs → search for `[email-worker]` errors.
2. Use admin panel: `/admin/emails` → find the failed email → Retry.
3. Or via API:
   ```bash
   curl -X POST https://<domain>/api/admin/emails/<id>/retry \
     -H "Cookie: <admin-session-cookie>"
   ```

### Redis down

Rate limiting and BullMQ job queue are both affected. The app fails open for rate limiting (all requests pass through). BullMQ will queue jobs in-memory temporarily.

1. Check Railway → Redis plugin status.
2. If the plugin is healthy, restart the `web` and `indexer` services.
3. If the plugin is degraded, Railway's SLA covers restoration; escalate via Railway support.

---

## Security

See [docs/SECURITY.md](docs/SECURITY.md) for the full security checklist and status.
