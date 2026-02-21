# Zeabur Deployment - Step by Step Guide

## Prerequisites
- Zeabur account (https://zeabur.com)
- GitHub repo pushed: https://github.com/c-o-l-3/thebloomapp
- Airtable API key (for data migration)
- GoHighLevel API key

---

## Step 1: Create Zeabur Project

1. Go to https://dash.zeabur.com
2. Click "Create Project"
3. Name it `bloom-builder`
4. Select region (US East recommended)

---

## Step 2: Add PostgreSQL Database

1. In your project, click **"Add Service"**
2. Select **"Marketplace"**
3. Find and click **"PostgreSQL"**
4. Wait for it to provision (green checkmark)
5. Note: `DATABASE_URL` will auto-inject into other services

---

## Step 3: Deploy Journey API (Backend)

1. Click **"Add Service"**
2. Select **"Git"**
3. Connect your GitHub account
4. Select repo: `c-o-l-3/thebloomapp`
5. Configure:
   - **Root Directory**: `apps/journey-api`
   - **Service Name**: `journey-api`
   
6. **Environment Variables** (click "Add Variable" for each):

| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | Will auto-fill from PostgreSQL | Auto |
| `JWT_SECRET` | Generate: `openssl rand -base64 32` | Yes |
| `JWT_EXPIRES_IN` | `24h` | Yes |
| `CORS_ORIGIN` | `*` (temporary, will update later) | Yes |
| `GHL_API_KEY` | Your GHL API key | Yes |
| `GHL_BASE_URL` | `https://services.leadconnectorhq.com` | Yes |
| `NODE_ENV` | `production` | Yes |
| `PORT` | `3001` | Yes |

7. Click **"Deploy"**
8. Wait for build to complete (check logs)
9. Once deployed, copy the service URL (e.g., `https://journey-api-xxx.zeabur.app`)

---

## Step 4: Deploy Journey Visualizer (Frontend)

1. Click **"Add Service"**
2. Select **"Git"**
3. Select repo: `c-o-l-3/thebloomapp`
4. Configure:
   - **Root Directory**: `apps/journey-visualizer`
   - **Service Name**: `journey-visualizer`
   
5. **Environment Variables**:

| Variable | Value | Required |
|----------|-------|----------|
| `VITE_DATA_SOURCE` | `api` | Yes |
| `VITE_API_URL` | Your API URL + `/api` (from Step 3) | Yes |

Example: `https://journey-api-xxx.zeabur.app/api`

6. Click **"Deploy"**
7. Wait for build
8. Copy the frontend URL (e.g., `https://journey-visualizer-xxx.zeabur.app`)

---

## Step 5: Update CORS_ORIGIN

1. Go back to **journey-api** service
2. Click **"Environment Variables"**
3. Find `CORS_ORIGIN` and change from `*` to your frontend URL
4. Click **"Redeploy"**

---

## Step 6: Run Database Migration

### Option A: Via Zeabur Terminal
1. Go to **journey-api** service
2. Click **"Terminal"** tab
3. Run:
```bash
npx prisma migrate deploy
```

### Option B: Run Migration Script (if you have Airtable data)
1. Set temporary env vars in journey-api:
   - `AIRTABLE_API_KEY` - Your Airtable key
   - `AIRTABLE_BASE_ID` - Your Airtable base ID

2. In Zeabur Terminal, run:
```bash
node scripts/migration/migrate-airtable-to-postgres.js
```

---

## Step 7: Verify Deployment

### Test API Health
```bash
curl https://your-api-url.zeabur.app/health
```
Should return: `{"status":"healthy","database":"connected"}`

### Test API Endpoints
```bash
curl https://your-api-url.zeabur.app/api/clients
```
Should return: `[]` (empty array initially)

### Open Frontend
Visit your frontend URL in browser. Should load without errors.

---

## Troubleshooting

### Build Fails
- Check build logs in Zeabur dashboard
- Verify all environment variables are set
- Ensure `package.json` has correct scripts

### Database Connection Error
- Verify `DATABASE_URL` is auto-filled
- Check PostgreSQL service is running
- Try redeploying API service

### CORS Errors
- Ensure `CORS_ORIGIN` matches frontend URL exactly
- Include `https://` protocol
- No trailing slash

### Migration Fails
- Check Airtable credentials are correct
- Verify Airtable base has data
- Run `npx prisma migrate deploy` first to create tables

---

## Post-Deployment

### Add Custom Domain (Optional)
1. Go to frontend service
2. Click **"Domain"**
3. Add your custom domain
4. Update DNS records as instructed

### Monitor Logs
- Zeabur dashboard shows real-time logs
- Set up alerts for errors

### Backup Database
- Zeabur PostgreSQL includes automated backups
- Can also export manually via pg_dump

---

## Quick Reference: Service URLs

After deployment, your services will be at:
- **Frontend**: `https://journey-visualizer-xxx.zeabur.app`
- **API**: `https://journey-api-xxx.zeabur.app`
- **API Health**: `https://journey-api-xxx.zeabur.app/health`
- **Database**: Internal only (via `DATABASE_URL`)

---

## Support

- Zeabur Docs: https://zeabur.com/docs
- Prisma Docs: https://prisma.io/docs
- Your repo: https://github.com/c-o-l-3/thebloomapp