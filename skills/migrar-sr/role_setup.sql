-- role_setup.sql — Rol restringido `migrador_llorona`
-- ─────────────────────────────────────────────────────────────────────────
-- Capa 2 de "NUNCA borrar" (la clave): los scripts de migración se conectan
-- con ESTE rol, NUNCA con el superusuario. Solo SELECT (lectura) + INSERT
-- acotado a las 10 tablas de la cascada. Sin DELETE/UPDATE/TRUNCATE en
-- ninguna tabla. Sin INSERT en `users` (fuerza "mesero sin match = saltar").
-- Si el migrador intenta borrar/actualizar → la BD lo rechaza y aborta.
--
-- Uso:
--   psql -d <db> -v db=<db> -v pwd='<password>' -f role_setup.sql
-- Ejemplo (sandbox local):
--   psql -d trolley_snap -v db=trolley_snap -v pwd='test_migrador' -f role_setup.sql
-- ─────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on

-- 1. Rol con login (idempotente: no falla si ya existe)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'migrador_llorona') THEN
    CREATE ROLE migrador_llorona LOGIN;
  END IF;
END$$;
ALTER ROLE migrador_llorona WITH LOGIN PASSWORD :'pwd';

-- 2. Conexión + uso del esquema (mínimo para operar)
GRANT CONNECT ON DATABASE :"db" TO migrador_llorona;
GRANT USAGE ON SCHEMA public TO migrador_llorona;

-- 3. LECTURA amplia: necesita SELECT para resolver refs (restaurants, users,
--    payment_methods, areas, cash_stations, products…) e idempotencia.
--    Solo lectura — cero riesgo.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO migrador_llorona;

-- 4. INSERT SOLO en las 10 tablas de la cascada. NADA en `users`.
GRANT INSERT ON
  public.shifts,
  public.cash_sessions,
  public.orders,
  public.order_items,
  public.payments,
  public.cash_movements,
  public.shift_declarations,
  public.shift_totals,
  public.shift_total_categories,
  public.shift_total_services
  TO migrador_llorona;

-- 5. USAGE en las secuencias de las 7 tablas con `id` serial (para que el
--    INSERT pueda obtener el id). Las otras 3 (shift_total*) tienen PK
--    compuesta → no necesitan secuencia.
GRANT USAGE, SELECT ON SEQUENCE
  public.shifts_id_seq,
  public.cash_sessions_id_seq,
  public.orders_id_seq,
  public.order_items_id_seq,
  public.payments_id_seq,
  public.cash_movements_id_seq,
  public.shift_declarations_id_seq
  TO migrador_llorona;

-- 6. CINTURÓN Y TIRANTES: revocar explícitamente lo destructivo por si algún
--    default lo otorgó. (SELECT en users se conserva — se necesita para
--    matchear meseros por nombre; lo prohibido es escribir users.)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.users FROM migrador_llorona;
REVOKE UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM migrador_llorona;

-- 7. Verificación rápida (informativa)
SELECT 'rol creado: migrador_llorona' AS status;
