# Deployment Runbook

Step-by-step guide for deploying services to production.

---

## Quick Reference

| Service | Platform | Deploy Command | Health Check |
|---------|----------|----------------|--------------|
| journey-api | Zeabur | `git push zeabur main` | `GET /health` |
| journey-visualizer | Zeabur | `git push zeabur main` | Visual smoke test |
| sync-engine | Manual / Scheduled | `./scripts/sync.sh` | Log verification |

---

## Pre-Deployment Checklist

### For All Deployments

- [ ] **Tests passing** - Run `npm test` (or equivalent) locally
- [ ] **Linting clean** - No ESLint/Prettier errors
- [ ] **Version bumped** - Update version in `package.json` if applicable
- [ ] **Changelog updated** - Document changes in `CHANGELOG.md`
- [ ] **Database migrations reviewed** - Check for destructive changes
- [ ] **Environment variables checked** - New env vars added to Zeabur?
- [ ] **Feature flags configured** - If using flags, verify states

### PR Requirements

- [ ] Code reviewed and approved
- [ ] No merge conflicts
- [ ] CI checks passing
- [ ] Squash commits if requested

### Database Deployments (Additional)

- [ ] Migration file generated: `npx prisma migrate dev --name <name>`
- [ ] Migration tested locally
- [ ] Backup plan for rollback
- [ ] Migration run in correct order (before code deploy)

---

## Deployment Procedures

### journey-api (Zeabur)

```bash
# 1. Verify you're on the correct branch
git branch  # should show main
git status  # should be clean

# 2. Pull latest changes
git pull origin main

# 3. Run tests
npm test

# 4. Verify environment variables
# Check Zeabur dashboard: https://dash.zeabur.com
# Ensure DATABASE_URL, GHL_API_KEY, etc. are set

# 5. Deploy to Zeabur
git push zeabur main

# 6. Monitor deployment
# Watch Zeabur dashboard for build status
```

**Zeabur Dashboard Checks:**
- Build logs show no errors
- Container starts successfully
- Health check endpoint responds: `https://journey-api.zeabur.app/health`

**Post-Deploy Verification:**
```bash
# Test health endpoint
curl https://journey-api.zeabur.app/health

# Test key endpoints
curl https://journey-api.zeabur.app/api/clients
curl https://journey-api.zeabur.app/api/journeys
```

---

### journey-visualizer (Zeabur)

```bash
# 1. Build locally first to catch errors
cd apps/journey-visualizer
npm run build

# 2. Verify production build works
npm run preview

# 3. Deploy to Zeabur
git push zeabur main
```

**Post-Deploy Verification:**
- [ ] Visualizer loads at `https://journey-visualizer.zeabur.app`
- [ ] Journey diagram renders correctly
- [ ] No console errors in browser dev tools
- [ ] Mobile view works

---

### sync-engine (Manual/Scheduled Tasks)

The sync-engine is deployed differently since it runs as scheduled tasks and CLI scripts.

#### Deploying sync-engine Code

```bash
# 1. Navigate to sync-engine directory
cd scripts/sync-engine

# 2. Run tests
npm test

# 3. Deploy (scp/rsync to server, or git pull if on same repo)
# If using same repo:
git pull origin main

# 4. Install dependencies
npm ci

# 5. Verify .env file is correct
cat .env
```

#### Running Manual Sync

```bash
# Full sync for a client
cd scripts/sync-engine
node src/cli.js sync --client <client-slug>

# Example:
node src/cli.js sync --client maison-albion

# Sync with verbose logging
node src/cli.js sync --client maison-albion --verbose

# Dry run (no changes)
node src/cli.js sync --client maison-albion --dry-run
```

#### Scheduled Tasks

Current scheduled tasks (add your cron jobs here):

```bash
# Check existing cron jobs
crontab -l

# Edit cron jobs
crontab -e

# Example: Run sync every hour
0 * * * * cd /path/to/scripts/sync-engine && node src/cli.js sync --client maison-albion >> logs/cron.log 2>&1
```

---

## Rollback Procedures

### Zeabur Services (journey-api, journey-visualizer)

```bash
# 1. Find the previous working commit
git log --oneline -10

# 2. Create rollback branch
git checkout -b rollback-$(date +%Y%m%d)

# 3. Revert to previous commit
git revert HEAD --no-edit

# 4. Force push to zeabur (emergency only)
git push zeabur rollback-$(date +%Y%m%d):main --force

# OR: Use Zeabur dashboard to rollback to previous deployment
```

**⚠️ Emergency Rollback (Zeabur Dashboard):**
1. Go to https://dash.zeabur.com
2. Select your service
3. Go to "Deployments" tab
4. Click on previous working deployment
5. Click "Redeploy"

### Database Rollback

```bash
# 1. Identify the migration to rollback
npx prisma migrate status

# 2. Rollback one migration
npx prisma migrate resolve --rolled-back <migration_name>

# 3. If data loss occurred, restore from backup
# (See backup restore procedure)
```

### sync-engine Rollback

```bash
# 1. Checkout previous version
git checkout <previous-commit>

# 2. Restart any running processes
pm2 restart sync-engine  # if using pm2
# or
kill <pid> && node src/cli.js  # manual restart
```

---

## Post-Deployment Verification

### API Verification (journey-api)

```bash
# Run verification script
./scripts/verify-deployment.sh

# Or manually test:

# 1. Health check
curl -f https://journey-api.zeabur.app/health || echo "HEALTH CHECK FAILED"

# 2. API endpoints
curl -f https://journey-api.zeabur.app/api/clients
curl -f https://journey-api.zeabur.app/api/journeys

# 3. Database connectivity
# (Health check should include DB status)
```

### Visualizer Verification (journey-visualizer)

- [ ] Load main page
- [ ] Navigate through different journeys
- [ ] Check browser console for errors
- [ ] Test on mobile viewport

### sync-engine Verification

```bash
# Check recent logs
tail -100 logs/sync-$(date +%Y-%m-%d).log

# Run a test sync
node src/cli.js sync --client <client> --dry-run

# Check scheduled task is running
ps aux | grep sync-engine
```

---

## Common Deployment Issues

### Issue: Build Fails on Zeabur

**Symptoms:** Deployment shows red X, build logs show errors

**Diagnosis:**
```bash
# Check Zeabur build logs
# Look for:
# - Missing dependencies
# - TypeScript errors
# - Environment variable issues
```

**Solutions:**
1. **Missing dependency:** Add to `package.json`, commit, redeploy
2. **TypeScript error:** Fix locally, commit, redeploy
3. **Out of memory:** Contact @devops-lead to increase container resources

### Issue: Service Deploys but 500 Errors

**Symptoms:** Health check passes but API returns 500s

**Diagnosis:**
```bash
# Check Zeabur runtime logs
# Look for:
# - Database connection errors
# - Missing environment variables
# - Unhandled exceptions
```

**Solutions:**
1. **Database connection:** Verify `DATABASE_URL` env var
2. **Missing env var:** Add to Zeabur dashboard, redeploy
3. **Prisma error:** Run `npx prisma generate`, commit, redeploy

### Issue: Database Migration Fails

**Symptoms:** API won't start, logs show migration errors

**Diagnosis:**
```bash
# Check migration status
npx prisma migrate status

# View migration logs
npx prisma migrate deploy 2>&1
```

**Solutions:**
1. **Migration already applied:** `npx prisma migrate resolve --applied <name>`
2. **Migration conflict:** Resolve manually, create new migration
3. **Destructive change:** Restore from backup, modify migration to be safe

### Issue: sync-engine Sync Failures

**Symptoms:** Sync logs show errors, data not updating

**Diagnosis:**
```bash
# Check latest logs
tail -n 200 logs/sync-$(date +%Y-%m-%d).log | grep -i error

# Check specific client
node src/cli.js sync --client <client> --verbose
```

**Solutions:**
1. **GHL API error:** Check API key, rate limits
2. **Airtable error:** Verify base ID, API key
3. **Data validation error:** Check client config, fix data manually

### Issue: Deployment Takes Too Long

**Symptoms:** Zeabur build hangs or times out

**Solutions:**
1. Check for large files being included in build
2. Verify `.dockerignore` / `.gitignore` excludes node_modules
3. Contact @devops-lead if consistently slow

---

## Deployment Decision Tree

```
Starting deployment?
│
├─→ Database changes?
│   ├─→ YES → Run migrations FIRST
│   │           ↓
│   │         Deploy code
│   │
│   └─→ NO → Deploy code directly
│
└─→ Deployment failed?
    ├─→ Build error? → Fix code, redeploy
    ├─→ Runtime error? → Check env vars, logs
    ├─→ Migration error? → See "Database Rollback"
    └─→ Critical issue? → See "Rollback Procedures"
```

---

## Emergency Contacts

| Issue | Contact |
|-------|---------|
| Zeabur deployment failure | @devops-lead |
| Database issues | @backend-lead |
| API errors | @backend-lead |
| Visualizer UI issues | @frontend-dev |
| sync-engine failures | @backend-lead |
| Can't resolve after 30 min | @eng-manager |

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-02-21 | @backend-lead | Initial deployment runbook |
