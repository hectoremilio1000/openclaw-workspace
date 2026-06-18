---
name: migrar-sr
description: Migra datos de SoftRestaurant (SQL Server) a GrowthSuite POS (PostgreSQL) de forma insert-only, atómica por turno y con rol de BD restringido — diseñado para que sea IMPOSIBLE borrar/sobrescribir datos existentes. Úsalo para traer turnos cerrados de SR a un restaurant_id de la nube (caso Llorona id=5), con dry-run + gate humano + commit. Reemplaza el sync_llorona.py viejo (cuyo --full era destructivo).
---

# migrar-sr — SoftRestaurant → GrowthSuite (insert-only, atómico, rol restringido)

La forma **segura** de traer turnos de SoftRestaurant a la nube. Nace para matar el pecado del migrador viejo (`sync_llorona.py --full` hacía delete+recreate → borró inventario una vez). Aquí borrar es **imposible por infraestructura**, no por confianza.

## Garantías no negociables (si una falla, NO se migra)
1. **Rol de BD restringido `migrador_llorona`** (SELECT + INSERT acotado a 10 tablas, NADA en `users`). El script se conecta con ESTE rol, nunca con superusuario. DELETE/UPDATE/TRUNCATE → la BD los rechaza. → `role_setup.sql`, probado: bloquea delete de orders/inventory/users.
2. **Compute-then-insert**: el script NO hace UPDATE (no puede). Computa stats/totales/expected_cash en Python e inserta el valor final.
3. **Atomicidad por turno**: un turno = una transacción `BEGIN…COMMIT`. Falla a media cascada → `ROLLBACK` → sin medio-turnos. (Fase de carga.)
4. **dry-run por defecto → GATE HUMANO §2.5 → commit**. El dry-run imprime el reporte de contenido (turnos, cheques, $, meseros match/no). NO se escribe a id=5 sin que Héctor revise ese reporte y dé OK explícito. Es revisión de CONTENIDO, no solo de que el código corra.
5. **Refs se resuelven, no se crean**: productos/usuarios/mesas/áreas/formas de pago se buscan en el restaurant_id destino existente. Mesero sin match → `waiter_id` NULL (NUNCA crear usuario; el rol no puede).
6. **Hora correcta**: SR es local America/Mexico_City (fijo -06:00). Se guarda con TZ correcto (NO el bug de 6h que tienen los datos `null` viejos de id=5).

## Reglas de negocio reusadas (del sync viejo, validadas)
- Idempotencia por folio cuando aplica; split pagos **SALE + TIP** (records separados); descuento a nivel cheque (`descuentoimporte`, fallback %); **IVA real** de `cheques.totalimpuesto1` (mejora: el viejo hardcodeaba 16%); mapeo `movtoscaja` (pagodepropina→TIP_PAYOUT, tipo=2→IN, resto→OUT); solo turnos cerrados; `cheqdet.foliodet` como join key. Detalle de mapeos en `references/` y en `MIGRACION_LLORONA_PLAN.md §5`.

## Uso
```bash
# 1. (una vez) crear el rol restringido — DDL aditivo, con OK. Password real por env.
psql -d <db> -v db=<db> -v pwd='<secreto>' -f role_setup.sql

# 2. DRY-RUN (default) — genera el reporte del gate. Cero escritura. Seguro contra prod.
SR_HOST=100.83.103.9 SR_USER='aidee\luz maria' SR_PASS='****' \
PGHOST=<h> PGUSER=migrador_llorona PGPASSWORD='<secreto>' PGDATABASE=<db> RESTAURANT_ID=5 \
  python3 migrar_sr.py --turnos 6254,6255

# 3. Héctor revisa el reporte → OK → COMMIT (escribe, atómico por turno)
#    (igual pero con --commit)  ← fase de carga, ver "Estado" abajo
```
**Recomendado: pasar `--turnos` explícito** (verificados ausentes en destino). El auto-detect por fecha es poco confiable cuando los datos existentes tienen el bug de TZ de 6h.

## Probar sin tocar prod (obligatorio antes de commit a prod)
`trolley_snap` = copia local de id=5 (restaurada del snapshot). Crear el rol ahí, migrar contra esa copia, verificar Corte X (totales, propinas≠0, sin duplicar), y SOLO entonces correr contra prod (trolley) con el rol restringido.

## Estado (2026-06-18)
- ✅ `role_setup.sql` — construido y PROBADO en trolley_snap (bloquea delete/update/truncate; permite select+insert acotado).
- ✅ `migrar_sr.py` dry-run + reporte del gate — PROBADO contra SR real + trolley_snap. Resuelve refs (1233 prod, 203 meseros), computa totales con IVA real. Gap Llorona = turnos **6254 + 6255** (95 cheques, ~$84.6k netos; mesero 232 sin match).
- ✅ **Fase de carga (`--commit`)**: CONSTRUIDA y VERIFICADA en trolley_snap (2026-06-18). Por turno BEGIN→cascada→COMMIT (atómico). Migró 6254 (49 orders/575 items) + 6255 (46/382). **Corte X cuadra**: orders.total = payments SALE exacto; SALE/TIP separados; declarations expected=SALE+TIP; expected_cash con fórmula completa (dif $3-10, por propinas tarjeta pagadas en efectivo); TZ correcta -06:00. + ledger JSON. Snapshot opcional via env MIGRAR_SNAPSHOT_DIR (OBLIGATORIO en prod).
- ✅✅ **EJECUTADO EN PROD (2026-06-18).** trolley = servicio Railway `posapp` (proyecto `bases_datos`, db `railway`, proxy trolley.proxy.rlwy.net:20722). Rol creado, garantías probadas en prod (no toca users/passwords, no borra), snapshot `~/proyectos/prod_snapshots/pre_migrar_sr_trolley_6254-6255.dump`, migrados 6254+6255 insert-only. Conciliación OK: id=5 105668→105763 (+95 exacto, sin duplicar). Password del rol en `/tmp/.migrador_pwd` (efímero).
- **Para conectar a prod sin exponer password:** `railway link --project bases_datos -e production` (en dir temporal) + `railway run --service posapp -- bash -c 'psql "$DATABASE_PUBLIC_URL" ...'` (inyecta la URL). Para el rol restringido: psql directo a trolley.proxy.rlwy.net:20722 db railway con PGUSER=migrador_llorona.
- ⏳ CORTE FINAL (cuando SR se apague): migrar turnos restantes + reconciliar. Mismo comando.
- ⏳ `references/` con los mapeos detallados (hoy en MIGRACION_LLORONA_PLAN.md §5/§5b).

## Relacionado
- `~/proyectos/MIGRACION_LLORONA_PLAN.md` — plan maestro (gate §2.5, mapeos, gap exacto).
- Skill `softrestaurant-sync` (viejo) — fuente de las reglas de negocio; su `--full` está PROHIBIDO.
