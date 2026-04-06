---
name: deploy-verify
description: Verify GrowthSuite POS deployments on Vercel and Railway after merging to main. Use after any merge/push to main in pos-app (backend) or pos-front (frontend). Triggers on "verify deploy", "check deploy", "did it deploy", "deploy status", "check vercel", "check railway", or automatically after merging PRs.
---

# Deploy Verification

After merging a PR to main, run the verification script to confirm deployments succeeded.

## Usage

Run the bash script to check all services:

```bash
bash scripts/verify_deploy.sh both    # Check Vercel + Railway
bash scripts/verify_deploy.sh front   # Check Vercel only
bash scripts/verify_deploy.sh back    # Check Railway only
```

## Post-Merge Workflow (MANDATORY — run after EVERY merge to main)

**Always verify deployments after merging PRs. No exceptions.**

1. Wait 60-90 seconds after merge for builds to complete
2. Run `bash <skill-dir>/scripts/verify_deploy.sh both`
3. If any service fails:
   - Vercel: Check build logs at `https://vercel.com/dashboard`
   - Railway: Service may be restarting — wait 30s and retry once
4. Report results to user
5. If anything broke, alert immediately — do NOT wait for user to ask

## Vercel Apps (Frontend)

| App | URL |
|---|---|
| Admin | pos-front-admin.vercel.app |
| Cash | pos-front-cash.vercel.app |
| Comandero | pos-front-comandero.vercel.app |
| Monitor | pos-front-monitor.vercel.app |

## Railway Services (Backend)

| Service | Health Endpoint |
|---|---|
| pos-auth-api | /health |
| pos-order-api | /health |
| pos-cash-api | /api/health |
| pos-bot-api | / |
| pos-inventory-api | /api/measurement-units |
| pos-centro-control-api | /api/plans |
| pos-reservaciones-api | /health |
| pos-website-api | /health |
| impulsobotwhats | / |

## Bundle Hash Check

For Vercel, the script extracts the JS bundle filename (e.g., `index-cfahcbAM.js`). Compare with the previous hash to confirm a new build was deployed. If the hash hasn't changed after 2 minutes, the build may have failed.
