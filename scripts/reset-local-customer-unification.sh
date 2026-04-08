#!/usr/bin/env bash
set -euo pipefail

POS_APP_DIR="$HOME/proyectos/growthsuite/pos-app"
ORDER_ENV="$POS_APP_DIR/pos_order_api/.env"
RES_ENV="$POS_APP_DIR/pos_reservation_api/.env"

abort() {
  echo "❌ $1" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || abort "Missing required command: $1"
}

need_cmd psql
need_cmd git
need_cmd grep

[ -f "$ORDER_ENV" ] || abort "Missing $ORDER_ENV"
[ -f "$RES_ENV" ] || abort "Missing $RES_ENV"

ORDER_DB_HOST=$(grep '^DB_HOST=' "$ORDER_ENV" | cut -d= -f2- || true)
ORDER_DB_PORT=$(grep '^DB_PORT=' "$ORDER_ENV" | cut -d= -f2- || true)
ORDER_DB_USER=$(grep '^DB_USER=' "$ORDER_ENV" | cut -d= -f2- || true)
ORDER_DB_NAME=$(grep '^DB_DATABASE=' "$ORDER_ENV" | cut -d= -f2- || true)

RES_DB_HOST=$(grep '^DB_HOST=' "$RES_ENV" | cut -d= -f2- || true)
RES_DB_PORT=$(grep '^DB_PORT=' "$RES_ENV" | cut -d= -f2- || true)
RES_DB_USER=$(grep '^DB_USER=' "$RES_ENV" | cut -d= -f2- || true)
RES_DB_NAME=$(grep '^DB_DATABASE=' "$RES_ENV" | cut -d= -f2- || true)

[ "$ORDER_DB_HOST" = "127.0.0.1" ] || [ "$ORDER_DB_HOST" = "localhost" ] || abort "pos_order_api DB_HOST is not local ($ORDER_DB_HOST). Aborting."
[ "$RES_DB_HOST" = "127.0.0.1" ] || [ "$RES_DB_HOST" = "localhost" ] || abort "pos_reservation_api DB_HOST is not local ($RES_DB_HOST). Aborting."
[ "$ORDER_DB_NAME" = "$RES_DB_NAME" ] || abort "DB names differ between services: $ORDER_DB_NAME vs $RES_DB_NAME"
[ "$ORDER_DB_PORT" = "$RES_DB_PORT" ] || abort "DB ports differ between services: $ORDER_DB_PORT vs $RES_DB_PORT"
[ "$ORDER_DB_USER" = "$RES_DB_USER" ] || echo "⚠️ Different DB users between services: $ORDER_DB_USER vs $RES_DB_USER"

DB_HOST="$ORDER_DB_HOST"
DB_PORT="$ORDER_DB_PORT"
DB_USER="$ORDER_DB_USER"
DB_NAME="$ORDER_DB_NAME"

echo "═══════════════════════════════════════════════════════════════"
echo "Local DB reset for customer unification"
echo "═══════════════════════════════════════════════════════════════"
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "User: $DB_USER"
echo "DB:   $DB_NAME"
echo

echo "Safety checks passed: local PostgreSQL confirmed."
echo
read -r -p "Type EXACTLY the local DB name ($DB_NAME) to continue: " CONFIRM_DB
[ "$CONFIRM_DB" = "$DB_NAME" ] || abort "Confirmation did not match DB name."

echo
read -r -p "Optional backup before destructive reset? [y/N]: " DO_BACKUP
if [[ "$DO_BACKUP" =~ ^[Yy]$ ]]; then
  BACKUP_FILE="$HOME/${DB_NAME}-customer-unification-backup-$(date +%Y%m%d-%H%M%S).sql"
  echo "📦 Creating backup at $BACKUP_FILE"
  pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"
  echo "✅ Backup created"
fi

echo
echo "⚠️ About to DROP local tables / columns related to customer unification."
read -r -p "Proceed with destructive local reset? [yes/NO]: " PROCEED
[ "$PROCEED" = "yes" ] || abort "Cancelled by user."

SQL=$(cat <<'SQL'
DROP TABLE IF EXISTS coupon_redemptions CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS restaurant_invoices CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
ALTER TABLE orders DROP COLUMN IF EXISTS customer_id;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS reservation_guests CASCADE;
DROP TABLE IF EXISTS restaurant_invoice_customers CASCADE;

DELETE FROM adonis_schema
WHERE name LIKE '%customers%'
   OR name LIKE '%coupons%'
   OR name LIKE '%coupon_redemptions%'
   OR name LIKE '%customer_id_to_orders%'
   OR name LIKE '%restaurant_invoice%';

DELETE FROM reservation_schema
WHERE name LIKE '%create_reservations%'
   OR name LIKE '%reservation_guests%';
SQL
)

echo "🧹 Resetting local schema pieces..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c "$SQL"

echo "✅ Cleanup complete"

echo
echo "🔄 Pulling latest dev branches"
git -C "$POS_APP_DIR" checkout dev
git -C "$POS_APP_DIR" pull origin dev

echo
echo "🏗️ Running order migrations"
(
  cd "$POS_APP_DIR/pos_order_api"
  node ace migration:run
)

echo
echo "🏗️ Running reservation migrations"
(
  cd "$POS_APP_DIR/pos_reservation_api"
  node ace migration:run
)

echo
echo "📋 Migration status — pos_order_api"
(
  cd "$POS_APP_DIR/pos_order_api"
  node ace migration:status
)

echo
echo "📋 Migration status — pos_reservation_api"
(
  cd "$POS_APP_DIR/pos_reservation_api"
  node ace migration:status
)

echo
echo "✅ Local customer-unification reset complete."
echo "Next recommended smoke tests:"
echo "  1. Crear reservación"
echo "  2. CRUD clientes"
echo "  3. CRUD cupones"
echo "  4. Crear factura desde order"
