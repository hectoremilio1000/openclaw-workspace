---
name: softrestaurant-sync
description: Sync data from SoftRestaurant (SQL Server on Windows/WinRM) to GrowthSuite POS (PostgreSQL). Use when running migration, daily sync, debugging sync discrepancies, reconciling Corte X reports, or troubleshooting the SoftRestaurant→GrowthSuite pipeline. Covers orders, shifts, payments, products, users, areas, tables, and inventory.
---

# SoftRestaurant → GrowthSuite Sync

## Architecture

- **Source**: SoftRestaurant SQL Server on Windows, accessed via Tailscale + WinRM (NTLM auth)
- **Transport**: PowerShell → `sqlcmd` on remote machine, pipe-delimited results
- **Destination**: Local PostgreSQL (GrowthSuite POS schema)
- **Script**: `sync_llorona.py` (workspace root)
- **State**: `sync_llorona_state.json` (workspace root)
- **Schedule**: Cron job daily at 06:00 America/Mexico_City, isolated session, reports to WhatsApp

## Entities Synced

Orders (cheques + cheqdet), shifts (turnos), payments (chequespagos), products (productos + productosdetalle), users (meseros), areas (areasrestaurant), tables (mesas), cash sessions, cash movements (retiros/propinas pagadas), shift totals, inventory (insumos), suppliers (proveedores).

## ⚠️ Critical Business Rules

These are non-negotiable. Violating any one will cause Corte X mismatches.

### 1. Discounts are CHECK-LEVEL, not item-level

**SoftRestaurant stores discounts on `cheques`, NOT on `cheqdet`!**

- `cheqdet.descuento` → **ALWAYS 0** — do not use for calculations
- `cheques.descuento` → discount percentage (0, 15, 30, 50, 100)
- `cheques.descuentoimporte` → discount amount in pesos (pre-tax) — **USE THIS**
- `cheques.idtipodescuento` → FK to `tipodescuento` table (01=Vecinos 15%, 02=Empleados 30%, 03=Cortesías 100%, 04=Promos 2x1, 05=Promos 50%)

```
discount_amount = cheques.descuentoimporte  # absolute pesos, pre-tax
```

### 2. Tax applies to NET amount (after discount)

```
subtotal       = Σ(preciosinimpuestos × cantidad)  # all items
discount       = cheques.descuentoimporte           # check-level
net            = subtotal - discount
tax            = net × 0.16                         # standard IVA
total          = net + tax
```

### 3. Corte X reconciliation formula

Every order must satisfy:

| Field | Source |
|---|---|
| `subtotal` | Σ(preciosinimpuestos × qty) for all items — pre-tax, pre-discount |
| `discount_amount` | `cheques.descuentoimporte` |
| `tax` | (subtotal − discount) × 0.16 |
| `total` | subtotal − discount + tax |

### 4. Payments vs Tips — SEPARATE RECORDS

**This is the #1 cause of broken Corte X reports.**

For each `chequespagos` row, create TWO payment records:
- `kind='SALE'`, `amount=importe` (the sale payment)
- `kind='TIP'`, `amount=propina` (only if propina > 0)

```python
# SALE payment
INSERT INTO payments (..., amount, kind) VALUES (..., importe, 'SALE')
# TIP payment (separate record!)
if propina > 0:
    INSERT INTO payments (..., amount, kind) VALUES (..., propina, 'TIP')
```

**NEVER** add propina to the SALE amount. The GrowthSuite Corte X reads tips via `payments WHERE kind='TIP'` grouped by payment method.

### 5. Prices — use `preciosinimpuestos`

- `preciosinimpuestos` = base price without tax → use for `base_price`, `unit_price`
- `precio` = tax-inclusive → **NEVER** use for base price calculations

### 6. Courtesy orders

When `cheques.descuento >= 100` → set `is_courtesy = true` on the order.

### 7. Shift auxiliary tables

The Corte X backend reads from FIVE tables. ALL must be populated:

| Table | What goes there | Source |
|---|---|---|
| `shifts` | Turno open/close times, `tips_amount` | `turnos` table + computed from orders |
| `cash_sessions` | `opening_cash` (fondo), `expected_cash`, `closing_cash` | `turnos.fondo` + computed |
| `cash_movements` | Depósitos (IN), retiros (OUT), propinas pagadas (PAYOUT) | `movtoscaja` table |
| `shift_totals` | Sales + tips by payment method per shift | Computed from `payments` table |
| `shift_declarations` | Cashier declarations | `declaracioncajero` table (idturno, idformadepago, importedeclarado) |

### 8. shifts.tips_amount must be populated

After migrating orders, update:
```sql
UPDATE shifts s SET tips_amount = COALESCE(
    (SELECT SUM(o.tip) FROM orders o WHERE o.shift_id = s.id AND o.status = 'closed'), 0
) WHERE s.restaurant_id = ?;
```

### 9. expected_cash calculation

```sql
expected_cash = opening_cash 
    + cash_sales (from shift_totals WHERE is_cash)
    + cash_tips (from TIP payments WHERE is_cash)
    - withdrawals (cash_movements type='OUT')
    - tips_paid (cash_movements type='TIP_PAYOUT')
```

### 10. Cash movements — movtoscaja.tipo mapping

SoftRestaurant's `movtoscaja` table stores all cash register movements:
- `tipo=1` + `pagodepropina=0` → **withdrawal** (retiro) → GrowthSuite `type='OUT'`
- `tipo=1` + `pagodepropina=1` → **tip payout** (propina pagada) → GrowthSuite `type='PAYOUT'`
- `tipo=2` → **deposit** (depósito/reposición) → GrowthSuite `type='IN'`

**NEVER** treat all movements as withdrawals. The `tipo` field determines direction.

Note: Sometimes fondo (opening cash) is $0 in `turnos.fondo` and arrives as a mid-shift deposit (`tipo=2`). This is valid — the cash session will show `opening_cash=0` and the deposit appears in `cash_movements type='IN'`.

### 11. Owner user preservation

The `--full` migration recreates users from SR's `meseros` table. The GrowthSuite owner user does NOT exist in SR. **Always preserve or recreate the owner user** after a full migration:

```sql
INSERT INTO users (restaurant_id, full_name, email, password_hash, role_id, status, created_at)
VALUES (?, 'Owner', 'owner@...', ?, (SELECT id FROM roles WHERE code='owner'), 'active', NOW())
ON CONFLICT (email) DO UPDATE SET status='active';
```

## ⚠️ Critical Rule 12: Shifts — only track CLOSED turnos

**Bug found 2026-02-28**: `last_turno_sr` was set to `MAX(idturno)` which includes OPEN turnos. When a turno opens on day A and closes on day B, the next sync skips it because its ID is already < `last_turno_sr`.

**Fix**:
- `migrate_shifts()` uses `min_turno - 5` safety margin and only fetches `WHERE cierre IS NOT NULL`
- `last_turno_sr` saved as `MAX(idturno) FROM turnos WHERE cierre IS NOT NULL`
- Orphan repair step: after migrating shifts, update orders with `shift_id IS NULL` by matching `opened_at` within shift time range
- Mirror script (`mirror_to_llorona2.py`) always runs shift mirroring + orphan repair, even when no new folios exist
- Unique index `shifts_restaurant_opened_unique ON shifts (restaurant_id, opened_at)` prevents duplicate shifts

**Verification**: Every sync must verify that SR's latest closed turno order count matches r5 AND r13. If mismatch → retry up to 3 times.

## Common Pitfalls

| Issue | Solution |
|---|---|
| Unicode U+202F (narrow no-break space) in macOS screenshot filenames | Use glob patterns instead of exact paths |
| WinRM session timeouts on large batches | Add retry with backoff (3 retries) |
| Pipe `\|` in product names breaks `sqlcmd -s"\|"` parsing | Replace pipes in names during import |
| `/Date(1234567890000)/` from PowerShell | Parse: `re.search(r'/Date\((-?\d+)', val)` → `datetime.fromtimestamp(ms/1000)` |
| Duplicate orders on re-run | `ON CONFLICT DO NOTHING` with folio as idempotency key |
| Timezone drift | SR dates are local `America/Mexico_City`; store with timezone |
| Discounts showing $0 | Check rule #1 — discounts are on `cheques`, not `cheqdet` |
| Propinas $0 in Corte X | Check rule #4 — need separate `kind='TIP'` payment records |
| Owner user disappears after --full | Check rule #10 — owner doesn't exist in SR |
| Orders synced but shift_id=NULL | Turno was open when last_turno_sr was saved. See rule #12 |
| Mirror says "nothing new" but shift missing in r13 | Mirror exited before shift check. Fixed: shifts always mirrored now |
| Duplicate shifts created | Missing unique index. Added: `shifts_restaurant_opened_unique` |

## Running the Sync

### Full migration (destructive — deletes and recreates)
```bash
cd /Users/hectorvelasquez/.openclaw/workspace
python3 sync_llorona.py --full
```

### Incremental (daily)
```bash
python3 sync_llorona.py --sync
```

### Check status
```bash
python3 sync_llorona.py --status
```

### Cron job
Daily at 6 AM CST, isolated session, delivers summary to WhatsApp:
```
cron add: schedule="0 6 * * *" tz=America/Mexico_City sessionTarget=isolated
payload: agentTurn "Run sync and report results"
delivery: mode=announce channel=whatsapp to=+525521293811
```

## Verify Sync Checklist

Run after every full migration. Compare against a known Corte X from SoftRestaurant.

```sql
-- 1. Order count for a specific date
SELECT COUNT(*) FROM orders WHERE restaurant_id=? AND opened_at::date='YYYY-MM-DD';

-- 2. Financial totals (must match Corte X)
SELECT SUM(subtotal) as subtotal, SUM(discount_amount) as descuentos, 
       SUM(tax) as iva, SUM(total) as total, SUM(tip) as propinas
FROM orders WHERE restaurant_id=? AND opened_at::date='YYYY-MM-DD';

-- 3. Payments by method (SALE only — must match Corte X "Forma de Pago Ventas")
SELECT pm.name, SUM(p.amount) FROM payments p 
JOIN orders o ON p.order_id=o.id JOIN payment_methods pm ON p.payment_method_id=pm.id
WHERE o.restaurant_id=? AND o.opened_at::date='YYYY-MM-DD' AND p.kind='SALE'
GROUP BY pm.name;

-- 4. Tips by method (must match Corte X "Forma de Pago Propina")
SELECT pm.name, SUM(p.amount) FROM payments p
JOIN orders o ON p.order_id=o.id JOIN payment_methods pm ON p.payment_method_id=pm.id
WHERE o.restaurant_id=? AND o.opened_at::date='YYYY-MM-DD' AND p.kind='TIP'
GROUP BY pm.name;

-- 5. Cash session (fondo, expected)
SELECT opening_cash, expected_cash FROM cash_sessions 
WHERE shift_id IN (SELECT id FROM shifts WHERE restaurant_id=? AND opened_at::date='YYYY-MM-DD');

-- 6. Cash movements (retiros, propinas pagadas)
SELECT type, SUM(amount) FROM cash_movements 
WHERE shift_id IN (SELECT id FROM shifts WHERE restaurant_id=? AND opened_at::date='YYYY-MM-DD')
GROUP BY type;

-- 7. Shift tips
SELECT tips_amount FROM shifts WHERE restaurant_id=? AND opened_at::date='YYYY-MM-DD';
```

## Troubleshooting

**Corte X shows $0.00 for formas de pago propina**: Tips not split into separate `kind='TIP'` payments. See rule #4.

**Corte X shows $0.00 for everything in CAJA section**: `cash_sessions` not populated. See rule #7.

**Descuentos = $0**: Using `cheqdet.descuento` instead of `cheques.descuentoimporte`. See rule #1.

**Total inflated (too high)**: Propina added to payment amount. See rule #4.

**IVA doesn't match**: Tax calculated on gross instead of net (after discount). See rule #2.

**Owner can't login after full migration**: Owner user deleted. See rule #10.

**Sync fails with WinRM auth error**: Check Tailscale is connected. Verify credentials in sync script.

**Corte X totals off by pennies ($0.01-$0.02)**: Float→decimal rounding across many items. Acceptable.
