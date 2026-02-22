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

### Journey Visualizer (Frontend)

The visualizer needs the API URL to connect to the backend:

```bash
VITE_API_URL=https://journey-api-xxx.zeabur.app/api
VITE_DATA_SOURCE=api
```

**Note:** After deploying the **journey-api** first, copy its URL and set it as `VITE_API_URL` in the visualizer service.

---

## Which URL Do Users Access?

**Users access the `journey-visualizer` (frontend) URL in their browser.**

The `journey-api` is only the backend - users never visit it directly. It only handles API requests from the frontend.

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   User Browser  │────────▶│ journey-visualizer│────────▶│   journey-api   │
│                 │  visits │   (frontend)      │  API    │   (backend)     │
│                 │         │   URL you share   │ calls   │   Internal only │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

## URL Configuration Flow

1. **Deploy journey-api first** - it gets an internal URL like `https://journey-api-abc123.zeabur.app`
   - Users never see this URL
   - It's only for the frontend to make API calls

2. **Copy that URL** and add `/api` to it: `https://journey-api-abc123.zeabur.app/api`

3. **Set VITE_API_URL** in journey-visualizer service to that URL

4. **Deploy journey-visualizer** - it gets the public URL like `https://journey-visualizer-xyz789.zeabur.app`
   - **This is the URL you share with users**
   - **This is what you bookmark**
   - **This is your app's frontend**

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
