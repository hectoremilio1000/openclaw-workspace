#!/usr/bin/env bash
# Run a single test case against the POS bot API
# Usage: ./run-bot-test.sh <restaurant_id> <phone> <text> [provider_message_id]
#
# Environment:
#   BOT_API_URL    — base URL (default: https://pos-bot-api-production.up.railway.app)
#   BOT_SECRET     — x-bot-secret header
#   BOT_PROVIDER   — provider name (default: test-harness)

set -euo pipefail

BOT_API_URL="${BOT_API_URL:-https://pos-bot-api-production.up.railway.app}"
BOT_SECRET="${BOT_SECRET:-super_secreto_del_bot_123}"
BOT_PROVIDER="${BOT_PROVIDER:-test-harness}"

RESTAURANT_ID="$1"
PHONE="$2"
TEXT="$3"
PROVIDER_MSG_ID="${4:-test-$(date +%s)-$RANDOM}"

START_MS=$(python3 -c 'import time; print(int(time.time()*1000))')

# Use python3 to build JSON safely (handles unicode, quotes, etc.)
JSON_BODY=$(python3 -c "
import json, sys
print(json.dumps({
    'phone': sys.argv[1],
    'text': sys.argv[2],
    'restaurantId': int(sys.argv[3]),
    'provider': sys.argv[4],
    'providerMessageId': sys.argv[5]
}))
" "$PHONE" "$TEXT" "$RESTAURANT_ID" "$BOT_PROVIDER" "$PROVIDER_MSG_ID")

HTTP_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BOT_API_URL}/api/bot/message" \
  -H "Content-Type: application/json" \
  -H "x-bot-secret: ${BOT_SECRET}" \
  -H "x-bot-provider: ${BOT_PROVIDER}" \
  -H "x-provider-message-id: ${PROVIDER_MSG_ID}" \
  -d "$JSON_BODY")

END_MS=$(python3 -c 'import time; print(int(time.time()*1000))')
LATENCY_MS=$(( END_MS - START_MS ))

HTTP_CODE=$(echo "$HTTP_RESPONSE" | tail -1)
BODY=$(echo "$HTTP_RESPONSE" | sed '$d')

# Output clean JSON
python3 -c "
import json, sys
try:
    body = json.loads(sys.argv[1])
except:
    body = {'raw': sys.argv[1]}
print(json.dumps({'http_code': int(sys.argv[2]), 'latency_ms': int(sys.argv[3]), 'response': body}))
" "$BODY" "$HTTP_CODE" "$LATENCY_MS"
