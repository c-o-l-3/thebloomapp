# Airtable to PostgreSQL Migration Guide

This directory contains scripts and tools for migrating data from Airtable to PostgreSQL.

## Prerequisites

1. PostgreSQL running (via Docker Compose)
2. Prisma migrations applied
3. Airtable API key with access to the base

## Migration Steps

### 1. Start PostgreSQL

```bash
cd /path/to/project
docker-compose up -d postgres
```

### 2. Install API Dependencies

```bash
cd apps/journey-api
npm install
```

### 3. Apply Database Migrations

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Set Environment Variables

Ensure your `.env` file has:

```env
DATABASE_URL="postgresql://bloom:bloom_password@localhost:5432/journey_builder"
AIRTABLE_API_KEY="your_airtable_api_key"
AIRTABLE_BASE_ID="app66pKRuzhlUzy3j"
```

### 5. Run Migration

```bash
node scripts/migration/migrate-airtable-to-postgres.js
```

This will:
- Fetch all data from Airtable
- Transform and map data to PostgreSQL schema
- Insert data maintaining referential integrity
- Create initial versions for journeys
- Log migration results

### 6. Verify Migration

Check the database:

```bash
cd apps/journey-api
npx prisma studio
```

Or query directly:

```bash
psql postgresql://bloom:bloom_password@localhost:5432/journey_builder
```

### 7. Start the API

```bash
cd apps/journey-api
npm run dev
```

Test the health endpoint:

```bash
curl http://localhost:3001/health
```

## Rollback

If you need to rollback the migration:

```bash
cd apps/journey-api
npx prisma migrate reset --force
```

## Troubleshooting

### Connection Issues

Ensure PostgreSQL is running:
```bash
docker-compose ps
```

### Missing Airtable Data

Check Airtable API permissions and base ID.

### Foreign Key Errors

The migration script maintains ID mappings. If you see FK errors, it may be due to:
- Missing linked records in Airtable
- Circular references
- Data inconsistencies

## Post-Migration

After successful migration:

1. Update frontend to use the new API
2. Test all CRUD operations
3. Update sync engine configuration
4. Archive Airtable base (read-only)
5. Remove Airtable API keys from active codebase