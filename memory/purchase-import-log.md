# Purchase Import Log

**Run:** 2026-03-02 ~21:30 CST

## Summary (restaurant_id=13)

| Metric | Count |
|--------|-------|
| Total purchase_runs (migration) | 4 |
| Total purchase_orders (migration) | 1,309 |
| Total purchase_order_items (migration) | 642 |

## PT Sheets Processed (from compras_rutas.xlsx)

27 PT sheets identified. Results:
- **4 new runs created:** PT_11_01_26, PT-10-08-25, PT-17-08-25, PT-24-08-25
- **12 skipped (already existed):** PT_04_01_26, 14-12-25, PT_30_11_25, PT_06_11_25, PT_07_09_25, PT_31_08_25, PT_14_09_25, PT_21_09_25, PT_28_09_25, PT_05_10_25, PT_12_10_25, PT_19_10_25, PT_26_10_25, PT_28_12_25, PT_19_01_26
- **7 skipped (no data):** 03-01-26, 28-12-25, PT_24_01_26, PT_31_01_26, PT_07_02_26, pt_14_02_26, pt_22_02_26, pt_01_03_26

## Central Compras Diarias (from central_compras.xlsx)

- 419 date+supplier groups found
- **385 orders created** (status='received')
- **34 skipped** (already existed)
- **0 unmatched suppliers** — all concepts matched to existing suppliers or fell back to CENTRAL DE ABASTOS

## Notes
- Sequences (purchase_orders_id_seq, purchase_order_items_id_seq, purchase_runs_id_seq) were reset after a PK collision
- created_by='migration' on all records
- Central orders have no line items (just totals) since the spreadsheet only has aggregate amounts
- PT orders have line items matched by UPPER(PRODUCTO) to inventory_presentations
- Some PT items may not have matched (unmatched items were skipped silently in batch)
