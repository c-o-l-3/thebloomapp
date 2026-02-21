# Deployment Guide - Zeabur

This guide covers deploying the Bloom Builder platform to Zeabur.

## Architecture

The application consists of two services:
1. **Journey Visualizer** (Frontend) - React/Vite static site
2. **Journey API** (Backend) - Express.js API with PostgreSQL

## Prerequisites

- Zeabur account
- Airtable API key (for initial migration)
- GoHighLevel API key

## Deployment Steps

### Option 1: Deploy from Root (Recommended)

Deploy both frontend and backend together:

1. **Push code to GitHub**
   ```bash
   git push origin main
   ```

2. **Create project in Zeabur**
   - Go to [Zeabur Dashboard](https://dash.zeabur.com)
   - Create new project
   - Connect your GitHub repository
   - Select the root directory

3. **Add PostgreSQL service**
   - In your Zeabur project, click "Add Service"
   - Select "Marketplace" → "PostgreSQL"
   - The `DATABASE_URL` will be automatically injected

4. **Configure environment variables**
   
   For **journey-api** service:
   | Variable | Description | Example |
   |----------|-------------|---------|
   | `JWT_SECRET` | Secret for JWT signing | `your-super-secret-key` |
   | `JWT_EXPIRES_IN` | Token expiration | `24h` |
   | `GHL_API_KEY` | GoHighLevel API key | `your-ghl-key` |
   | `GHL_BASE_URL` | GHL API base URL | `https://services.leadconnectorhq.com` |

   For **journey-visualizer** service:
   | Variable | Description | Example |
   |----------|-------------|---------|
   | `VITE_DATA_SOURCE` | Data source type | `api` |
   | `VITE_API_URL` | API base URL | `https://journey-api.zeabur.app/api` |

5. **Deploy**
   - Zeabur will automatically build and deploy both services
   - Wait for health checks to pass

### Option 2: Deploy Services Separately

Deploy frontend and backend as separate projects:

#### Deploy API First

1. **Create API project**
   ```bash
   cd apps/journey-api
   ```

2. **Deploy to Zeabur**
   - Create new project in Zeabur
   - Select `apps/journey-api` directory
   - Add PostgreSQL service
   - Set environment variables
   - Deploy

3. **Note the API URL**
   - After deployment, Zeabur provides a URL like `https://journey-api.zeabur.app`

#### Deploy Frontend

1. **Update environment**
   ```bash
   cd apps/journey-visualizer
   ```
   
   Set `VITE_API_URL` to the API URL from step above

2. **Deploy to Zeabur**
   - Create new project in Zeabur
   - Select `apps/journey-visualizer` directory
   - Set environment variables
   - Deploy

## Database Migration

After initial deployment, migrate data from Airtable:

1. **Set migration environment variables** in Zeabur dashboard for journey-api:
   - `AIRTABLE_API_KEY` - Your Airtable key
   - `AIRTABLE_BASE_ID` - Your Airtable base ID

2. **Run migration** via Zeabur's terminal or locally:
   ```bash
   # Locally with production database
   DATABASE_URL="your-zeabur-db-url" \
   AIRTABLE_API_KEY="your-key" \
   node scripts/migration/migrate-airtable-to-postgres.js
   ```

3. **Verify data** via API endpoints:
   ```bash
   curl https://journey-api.zeabur.app/api/clients
   ```

## Environment Variables Reference

### Journey API

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `JWT_SECRET` | Yes | - | JWT signing secret |
| `JWT_EXPIRES_IN` | No | `24h` | Token expiration |
| `CORS_ORIGIN` | Yes | - | Frontend URL |
| `GHL_API_KEY` | Yes | - | GoHighLevel API key |
| `GHL_BASE_URL` | No | `https://services.leadconnectorhq.com` | GHL API URL |
| `PORT` | No | `3001` | Server port |
| `NODE_ENV` | No | `production` | Environment |

### Journey Visualizer

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_DATA_SOURCE` | No | `api` | Data source: `api`, `airtable`, `local` |
| `VITE_API_URL` | Yes* | - | API base URL (required if source=api) |
| `VITE_AIRTABLE_API_KEY` | No | - | Airtable key (legacy) |
| `VITE_AIRTABLE_BASE_ID` | No | - | Airtable base (legacy) |

## Troubleshooting

### Database Connection Issues

Check that PostgreSQL service is bound to the API service in Zeabur dashboard.

### CORS Errors

Ensure `CORS_ORIGIN` in API matches the frontend URL exactly (including https://).

### Migration Failures

Run migration with verbose logging:
```bash
DEBUG=true node scripts/migration/migrate-airtable-to-postgres.js
```

### API Health Check Fails

Check logs in Zeabur dashboard for startup errors.

## Rollback

If issues occur:

1. Set `VITE_DATA_SOURCE=airtable` in frontend to revert to Airtable
2. Or set `VITE_DATA_SOURCE=local` for local development mode
3. Redeploy frontend

## Updates

To update deployment:

1. Push changes to GitHub
2. Zeabur automatically rebuilds and redeploys
3. For database schema changes, run migrations:
   ```bash
   npx prisma migrate deploy