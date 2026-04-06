#!/bin/bash
# verify_deploy.sh — Check if Vercel and Railway deployments succeeded after a merge to main.
# Usage: verify_deploy.sh [--repo front|back|both] [--timeout 120]

set -euo pipefail

REPO="${1:-both}"
TIMEOUT="${2:-120}"
INTERVAL=10
ELAPSED=0

# ── Vercel (pos-front) ──
check_vercel() {
  echo "🔍 Checking Vercel deployments..."
  local apps=("pos-front-admin" "pos-front-cash" "pos-front-comandero" "pos-front-monitor")
  local all_ok=true

  for app in "${apps[@]}"; do
    local url="https://${app}.vercel.app"
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    if [ "$status" = "200" ]; then
      echo "  ✅ $app: HTTP $status"
    else
      echo "  ❌ $app: HTTP $status"
      all_ok=false
    fi
  done

  if $all_ok; then
    echo "✅ All Vercel apps responding OK"
  else
    echo "⚠️  Some Vercel apps not responding"
  fi
  $all_ok
}

# ── Railway (pos-app backends) ──
check_railway() {
  echo "🔍 Checking Railway deployments..."
  local all_ok=true
  local names="pos-auth-api pos-order-api pos-cash-api pos-bot-api pos-inventory-api pos-centro-control-api pos-reservaciones-api pos-website-api impulsobotwhats"
  local urls="https://pos-auth-api-production.up.railway.app/health https://pos-order-api-production.up.railway.app/health https://pos-cash-api-production.up.railway.app/api/health https://pos-bot-api-production.up.railway.app/ https://pos-inventory-api-production-bba3.up.railway.app/api/measurement-units https://pos-centro-control-api-production.up.railway.app/api/plans https://posreservacionesapi-production.up.railway.app/health https://poswebsiteapi-production.up.railway.app/health https://impulsobotwhats-production.up.railway.app/"

  local name_arr=($names)
  local url_arr=($urls)

  for i in "${!name_arr[@]}"; do
    local name="${name_arr[$i]}"
    local url="${url_arr[$i]}"
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    if [ "$status" = "200" ]; then
      echo "  ✅ $name: HTTP $status"
    else
      echo "  ❌ $name: HTTP $status"
      all_ok=false
    fi
  done

  if $all_ok; then
    echo "✅ All Railway services responding OK"
  else
    echo "⚠️  Some Railway services not responding"
  fi
  $all_ok
}

# ── Bundle hash check (Vercel) — detect if new bundle deployed ──
check_vercel_bundle() {
  echo "🔍 Checking Vercel bundle hash..."
  local bundle
  bundle=$(curl -s "https://pos-front-admin.vercel.app" 2>/dev/null | grep -o 'assets/index-[^"]*\.js' | head -1)
  if [ -n "$bundle" ]; then
    echo "  📦 Current bundle: $bundle"
  else
    echo "  ⚠️  Could not detect bundle hash"
  fi
}

# ── Main ──
echo "═══════════════════════════════════════"
echo "  Deploy Verification — $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════"
echo ""

VERCEL_OK=true
RAILWAY_OK=true

if [ "$REPO" = "front" ] || [ "$REPO" = "both" ]; then
  check_vercel || VERCEL_OK=false
  check_vercel_bundle
  echo ""
fi

if [ "$REPO" = "back" ] || [ "$REPO" = "both" ]; then
  check_railway || RAILWAY_OK=false
  echo ""
fi

echo "═══════════════════════════════════════"
if $VERCEL_OK && $RAILWAY_OK; then
  echo "  ✅ ALL DEPLOYMENTS OK"
else
  echo "  ⚠️  SOME DEPLOYMENTS FAILED"
fi
echo "═══════════════════════════════════════"
