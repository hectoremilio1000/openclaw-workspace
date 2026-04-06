# HEARTBEAT.md

## WhatsApp Health Check (PRIORITY — run EVERY heartbeat)
- Send a real test message to verify WhatsApp is alive: `message action=send channel=whatsapp target=+525521293811 message="🔌" silent=true`
- If the send FAILS or errors, restart the gateway immediately: `gateway action=restart reason="WhatsApp reconnect"`
- After restart, wait 20s then retry the test message once more.
- This is especially important on the FIRST heartbeat of the day — user expects WhatsApp connected as soon as the machine is on.
- Only attempt reconnect once per heartbeat. If it fails after restart, log it and alert user via webchat.

## GrowthSuite POS Health Check (rotate: run 2-3x per day)
Check TOOLS.md for all URLs and credentials. Run these checks:

### 1. Backend health (curl each endpoint from TOOLS.md)
```
pos-auth-api-production.up.railway.app/health
pos-order-api-production.up.railway.app/health
pos-cash-api-production.up.railway.app/api/health
pos-bot-api-production.up.railway.app/
pos-inventory-api-production-bba3.up.railway.app/api/measurement-units
pos-centro-control-api-production.up.railway.app/api/plans
posreservacionesapi-production.up.railway.app/health
poswebsiteapi-production.up.railway.app/health
impulsobotwhats-production.up.railway.app/
```
All should return HTTP 200. If any fails, alert user.

### 2. Database connectivity
Connect to PostgreSQL (see TOOLS.md) and run `SELECT count(*) FROM orders WHERE created_at > now() - interval '24 hours'` to verify DB is alive.

### 3. Frontend smoke test (browser, less frequent — 1x per day max)
Open each Vercel front and verify login page loads:
- pos-front-admin.vercel.app → login with cafetacuba@r0.pos / secret123 → verify dashboard loads
- pos-front-comandero.vercel.app → verify pairing screen loads
- pos-front-cash.vercel.app → verify pairing screen loads
- pos-front-monitor.vercel.app → verify pairing screen loads

### When to alert
- Any backend returning non-200
- Database connection failure
- Frontend not loading or showing errors in console
- Alert via current session (webchat) or WhatsApp if available
