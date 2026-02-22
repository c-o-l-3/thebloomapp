# Zeabur Deployment Guide

## Quick Start

### Step 1: Create Zeabur Project
1. Go to [Zeabur Dashboard](https://dash.zeabur.com)
2. Click "Create Project"
3. Select "Deploy from GitHub"
4. Choose the `thebloomapp` repository

### Step 2: Deploy PostgreSQL (Required)
1. In your Zeabur project, click "Add Service"
2. Select "Marketplace" → "PostgreSQL"
3. Wait for PostgreSQL to be ready (green status)
4. Note the connection string (will be auto-injected as DATABASE_URL)

### Step 3: Deploy Journey API
1. Click "Add Service" → "Deploy from GitHub"
2. Select the repository
3. Configure:
   - **Service Type:** Docker (already set in zeabur.yaml)
   - **Root Directory:** `apps/journey-api`
4. Add Environment Variables (see below)
5. Bind PostgreSQL service to this service

### Step 4: Deploy Journey Visualizer
1. Click "Add Service" → "Deploy from GitHub"
2. Select the repository
3. Configure:
   - **Service Type:** Docker (already set in zeabur.yaml)
   - **Root Directory:** `apps/journey-visualizer`
4. Add Environment Variables (see below)

---

## Required Environment Variables

### Journey API (`apps/journey-api`)

```bash
PORT=3001
NODE_ENV=production
CORS_ORIGIN=*
GHL_API_KEY=YOUR_GHL_API_KEY_HERE
GHL_BASE_URL=https://services.leadconnectorhq.com
DATABASE_URL=${POSTGRES_CONNECTION_STRING}
JWT_SECRET=YOUR_JWT_SECRET_HERE
JWT_EXPIRES_IN=24h
```

### Journey Visualizer (`apps/journey-visualizer`)

```bash
# Update with your actual API URL after deployment
VITE_API_URL=https://journey-api-xxx.zeabur.app/api
VITE_DATA_SOURCE=api

# Optional: GHL for client-side features
VITE_GHL_API_KEY=your_ghl_api_key
```

---

## Generating Secure Secrets

Run this script to generate a secure JWT secret:

```bash
node scripts/generate-secrets.js
```

---

## Post-Deployment Steps

### 1. Update CORS_ORIGIN
After the visualizer deploys, get its URL and update the API's `CORS_ORIGIN` variable.

### 2. Update VITE_API_URL
After the API deploys, get its URL and update the visualizer's `VITE_API_URL` variable.

### 3. Run Database Migrations
```bash
# In Zeabur console for journey-api service
npx prisma migrate deploy
```

### 4. Verify Health Endpoints
- API: `https://journey-api-xxx.zeabur.app/health`
- Visualizer: `https://journey-visualizer-xxx.zeabur.app/health`

---

## Troubleshooting

### Build Failures
- Check that both services use **Docker** type (not Node.js)
- Verify Dockerfile exists in each app's root

### Database Connection Issues
- Ensure PostgreSQL service is bound to journey-api
- Check DATABASE_URL is auto-injected

### CORS Errors
- Update CORS_ORIGIN with the exact frontend URL (including https://)
- Redeploy API after changing CORS_ORIGIN

### 404 Errors on Routes
- Verify nginx.conf is correctly configured (already fixed)
- Check that `try_files $uri $uri/ /index.html;` is present

---

## Custom Domain (Optional)

1. In Zeabur dashboard, go to your visualizer service
2. Click "Domains" → "Add Domain"
3. Follow DNS configuration instructions
4. Update CORS_ORIGIN with your custom domain
