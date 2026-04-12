---
name: railway-manage
description: Manage Railway services for GrowthSuite — check status, view logs, restart/redeploy services, check variables, debug crashes. Use when any Railway service is down, returning errors, needs restarting, or when you need to inspect deployment state or environment variables. Triggers on "railway", "service caído", "service down", "restart", "redeploy", "logs de railway", "check railway", "railway status", "revisar railway".
---

# Railway Service Manager

Manage all GrowthSuite microservices on Railway directly from Claude Code.

## Prerequisites

- Railway CLI v4.30+ installed: `/Users/hectorvelasquez/.npm-global/bin/railway`
- Logged in as: `hectoremiliocompras@gmail.com`
- Project: `microservicios_POS_growthsuite`
- Default linked environment: `dev` (linked service: `pos bot api`)

## Project Structure

### Environments
| Environment | Purpose |
|---|---|
| `dev` | Development (Railway DEV) |
| `production` | Production (Railway PROD) |

### Services (exact names for CLI)

Use these exact names with `-s` flag. Some accept spaces, some hyphens — verified names below:

| CLI Name | Public Domain (DEV) | Public Domain (PROD) | Port |
|---|---|---|---|
| `pos bot api` | pos-bot-api-dev.up.railway.app | pos-bot-api-production.up.railway.app | 3357 |
| `pos auth api` | pos-auth-api-dev.up.railway.app | pos-auth-api-production.up.railway.app | 3340 |
| `pos order api` | pos-order-api-dev.up.railway.app | pos-order-api-production.up.railway.app | 3341 |
| `pos cash api` | pos-cash-api-dev.up.railway.app | pos-cash-api-production.up.railway.app | 3342 |
| `pos centro control api` | pos-centro-control-api-dev.up.railway.app | pos-centro-control-api-production.up.railway.app | 3343 |
| `pos-inventory-api` | pos-inventory-api-dev.up.railway.app | pos-inventory-api-production-bba3.up.railway.app | 3344 |

**Note:** `pos-inventory-api` uses hyphens. Most others use spaces. Always verify with `railway service status -s "<name>"` if unsure.

### Services NOT confirmed in dev (may have different names or not exist in dev env):
- pos-delivery-api (prod: posdeliveryapi-production.up.railway.app, port 3346)
- pos-reservation-api (prod: posreservacionesapi-production.up.railway.app, port 3347)
- pos-website-api (prod: poswebsiteapi-production.up.railway.app, port 3348)
- impulsobotwhats (WhatsApp bridge, Express)

## Common Operations

### 1. Check service status
```bash
railway service status -s "pos bot api"
railway service status -s "pos-inventory-api"
```

### 2. Check ALL key services at once
```bash
for svc in "pos bot api" "pos auth api" "pos order api" "pos cash api" "pos centro control api" "pos-inventory-api"; do
  echo "=== $svc ===";
  railway service status -s "$svc" 2>&1;
done
```

### 3. View recent logs (last N lines, no streaming)
```bash
railway logs -s "pos bot api" -n 50
railway logs -s "pos-inventory-api" -n 30
```

### 4. View logs from last X minutes
```bash
railway logs -s "pos bot api" --since 30m -n 100
```

### 5. Filter logs by level
```bash
railway logs -s "pos bot api" -n 50 --filter "@level:error"
railway logs -s "pos bot api" -n 50 --filter "@level:warn"
```

### 6. View build logs (for deploy failures)
```bash
railway logs -s "pos bot api" --build --latest
```

### 7. Restart a service (no rebuild, fast)
```bash
railway service restart -s "pos bot api"
railway service restart -s "pos-inventory-api"
```

### 8. Redeploy a service (full rebuild)
```bash
railway service redeploy -s "pos bot api"
railway service redeploy -s "pos-inventory-api"
```

### 9. List recent deployments
```bash
railway deployment list -s "pos bot api"
```

### 10. Check environment variables
```bash
railway variable -s "pos bot api"
railway variable -s "pos-inventory-api" --json 2>&1 | python3 -c "import sys,json; [print(f'{k}={v}') for k,v in sorted(json.load(sys.stdin).items())]"
```

### 11. Health check via curl
```bash
# DEV
curl -s "https://pos-inventory-api-dev.up.railway.app/" 2>&1
curl -s "https://pos-bot-api-dev.up.railway.app/api/health" 2>&1

# PROD
curl -s "https://pos-inventory-api-production-bba3.up.railway.app/" 2>&1
curl -s "https://pos-bot-api-production.up.railway.app/api/health" 2>&1
```

### 12. Switch environment context
```bash
# The CLI is linked to dev by default. To target production:
railway logs -s "pos bot api" -e production -n 30
railway service status -s "pos bot api" -e production
```

## Troubleshooting

### "Application not found" from curl but service shows SUCCESS
- **Wrong domain.** DEV and PROD have different domain suffixes.
  - PROD inventory: `pos-inventory-api-production-bba3.up.railway.app`
  - DEV inventory: `pos-inventory-api-dev.up.railway.app`
- Check actual domain: `railway variable -s "<service>" --json | python3 -c "import sys,json; print(json.load(sys.stdin).get('RAILWAY_PUBLIC_DOMAIN',''))"`

### Service crashed / won't start
1. Check build logs: `railway logs -s "<service>" --build --latest`
2. Check deploy logs: `railway logs -s "<service>" --latest -n 50`
3. Check if it's a dependency issue: `railway logs -s "<service>" -n 20 --filter "error"`
4. Restart: `railway service restart -s "<service>"`
5. If restart doesn't fix, redeploy: `railway service redeploy -s "<service>"`

### Multiple databases in the same project
The Railway DEV project has MULTIPLE PostgreSQL instances. Each service may connect to a different DB:
- **pos-inventory-api** → `centerbeam.proxy.rlwy.net:38630` (DB_HOST/DB_PORT from its env)
- Other services may use `trolley.proxy.rlwy.net:20722` or other hosts

**CRITICAL:** Always read the DB credentials FROM THE SPECIFIC SERVICE's env vars before running seeds or direct SQL:
```bash
railway variable -s "<service-name>" --json 2>&1 | python3 -c "
import sys,json; d=json.load(sys.stdin)
for k in ['DB_HOST','DB_PORT','DB_USER','DB_PASSWORD','DB_DATABASE']:
    print(f'{k}={d.get(k,\"?\")}')
"
```
Never assume all services share the same database.

### CORS errors from frontend
Usually NOT a CORS config issue. More likely:
1. Service is down (returns no CORS headers)
2. Frontend pointing to wrong domain (e.g., `-bba3` suffix confusion)
3. Service throwing 500 before CORS middleware runs

Check with: `curl -v -H "Origin: https://your-frontend.vercel.app" "https://service-url/api/endpoint" 2>&1 | grep -i "access-control"`

## Safety Rules
- **NEVER** modify environment variables without Hector's explicit approval
- **NEVER** delete services or deployments
- **Restart** is safe (no rebuild, just process restart)
- **Redeploy** triggers a full build — confirm with user first for production
- **Always check dev first**, then production if needed
- Prefer `restart` over `redeploy` for quick fixes
