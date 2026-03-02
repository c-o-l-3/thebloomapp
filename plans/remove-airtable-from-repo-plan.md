# Plan: Remove Airtable from TheBloomApp Repository

## Overview

This plan outlines how to remove all Airtable references from the codebase now that data has been migrated to PostgreSQL. The goal is to eliminate confusion for the team and simplify the codebase.

---

## Summary of Airtable References Found

### 1. Core Application Files (High Priority)

| File | Type | Action |
|------|------|--------|
| `apps/journey-visualizer/src/services/airtable.js` | Service | Delete |
| `apps/journey-visualizer/src/services/dataService.js` | Service | Remove Airtable cases |
| `apps/journey-visualizer/src/hooks/useJourneys.js` | Hook | Remove Airtable logic |
| `apps/journey-visualizer/src/hooks/useApprovals.js` | Hook | Remove Airtable logic |

### 2. Configuration Files

| File | Type | Action |
|------|------|--------|
| `apps/journey-visualizer/.env` | Config | Remove Airtable vars |
| `apps/journey-visualizer/.env.example` | Config | Remove Airtable vars |
| `apps/journey-visualizer/.env.production` | Config | Remove Airtable vars |
| `clients/cameron-estate/.env.example` | Config | Remove Airtable vars |

### 3. Sync Engine Scripts

| File | Type | Action |
|------|------|--------|
| `scripts/sync-engine/src/services/airtable.js` | Service | Delete |
| `scripts/sync-engine/src/services/deploy-pipeline.js` | Service | Remove Airtable calls |
| `scripts/sync-engine/src/services/journey-generator.js` | Service | Remove Airtable calls |
| `scripts/sync-engine/src/scripts/sync-journeys-to-airtable.js` | Script | Delete |
| `scripts/sync-engine/src/utils/conflict.js` | Utility | Remove Airtable refs |
| `scripts/sync-engine/src/cli.js` | CLI | Remove Airtable commands |
| `scripts/sync-engine/src/cli-onboarding.js` | CLI | Remove Airtable steps |

### 4. Environment & Package Files

| File | Type | Action |
|------|------|--------|
| `scripts/sync-engine/.env.example` | Config | Remove Airtable vars |
| `scripts/sync-engine/package.json` | Package | Remove airtable dependency |

### 5. Documentation Files

| File | Type | Action |
|------|------|--------|
| `docs/airtable-schema.md` | Docs | Archive/move to `docs/archived/` |
| `docs/ONBOARDING_GUIDE.md` | Docs | Update - remove Airtable mentions |
| `docs/PROGRAMMATIC_SETUP.md` | Docs | Archive/move to `docs/archived/` |
| `README.md` | Docs | Update - remove Airtable mentions |
| `DEPLOYMENT.md` | Docs | Update - remove Airtable mentions |

### 6. Migration Scripts (Archive)

| File | Type | Action |
|------|------|--------|
| `scripts/setup-airtable.js` | Script | Move to `scripts/archived/` |
| `scripts/setup-airtable-v2.js` | Script | Move to `scripts/archived/` |
| `scripts/export-airtable-data.js` | Script | Move to `scripts/archived/` |
| `scripts/migration/migrate-airtable-to-postgres.js` | Script | Move to `scripts/archived/` |
| `data/migration/airtable-export/` | Data | Move to `data/migration/archived-airtable-export/` |

### 7. Other References

| File | Type | Action |
|------|------|--------|
| `docs/PROJECT_HANDBOOK.md` | Docs | Update - remove Airtable section |
| `docs/TECHNICAL_SPECIFICATION.md` | Docs | Update - remove Airtable refs |
| `runbooks/incident-response.md` | Runbook | Update - remove Airtable checks |
| `plans/airtable-to-postgres-migration-plan.md` | Plan | Move to `plans/archived/` |

---

## Execution Plan

### Phase 1: Create Archive Directories

```bash
# Create archived directories
mkdir -p docs/archived
mkdir -p scripts/archived
mkdir -p data/migration/archived-airtable-export
mkdir -p plans/archived
```

### Phase 2: Move Files to Archives

```bash
# Move documentation
mv docs/airtable-schema.md docs/archived/
mv docs/PROGRAMMATIC_SETUP.md docs/archived/

# Move migration scripts
mv scripts/setup-airtable.js scripts/archived/
mv scripts/setup-airtable-v2.js scripts/archived/
mv scripts/export-airtable-data.js scripts/archived/
mv scripts/migration/migrate-airtable-to-postgres.js scripts/archived/

# Move migration data
mv data/migration/airtable-export/ data/migration/archived-airtable-export/

# Move plans
mv plans/airtable-to-postgres-migration-plan.md plans/archived/
```

### Phase 3: Update Core Application Files

1. **Delete airtable service**: `apps/journey-visualizer/src/services/airtable.js`
2. **Update dataService.js**: Remove all `DATA_SOURCES.AIRTABLE` cases
3. **Update useJourneys.js**: Remove Airtable client parameter and logic
4. **Update useApprovals.js**: Remove Airtable client parameter and logic

### Phase 4: Update Sync Engine

1. **Delete airtable service**: `scripts/sync-engine/src/services/airtable.js`
2. **Update deploy-pipeline.js**: Remove `updateAirtable()` method calls
3. **Update journey-generator.js**: Remove Airtable creation logic
4. **Delete sync-journeys-to-airtable.js**
5. **Update conflict.js**: Remove Airtable conflict detection
6. **Update cli.js**: Remove Airtable commands and options
7. **Update cli-onboarding.js**: Remove Airtable setup steps

### Phase 5: Update Environment Files

Remove these variables from all `.env*` files:
- `VITE_AIRTABLE_API_KEY`
- `VITE_AIRTABLE_BASE_ID`
- `VITE_AIRTABLE_API_URL`
- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`

### Phase 6: Update Documentation

1. **README.md**: Remove Airtable setup sections
2. **DEPLOYMENT.md**: Remove Airtable references
3. **ONBOARDING_GUIDE.md**: Update workflow diagram (remove Airtable)
4. **PROJECT_HANDBOOK.md**: Remove Airtable setup guide
5. **TECHNICAL_SPECIFICATION.md**: Remove Airtable references

### Phase 7: Remove npm Dependency

```bash
cd scripts/sync-engine
npm uninstall airtable
```

---

## Files That Can Be Deleted Entirely

| Path | Reason |
|------|--------|
| `apps/journey-visualizer/src/services/airtable.js` | Dedicated Airtable service |
| `scripts/sync-engine/src/services/airtable.js` | Dedicated Airtable service |
| `scripts/sync-engine/src/scripts/sync-journeys-to-airtable.js` | Airtable sync script |

---

## After Removal - Default Configuration

The app should default to `VITE_DATA_SOURCE=api` (PostgreSQL) or `VITE_DATA_SOURCE=local` (local JSON files).

Update default values:
- `apps/journey-visualizer/src/services/dataService.js`: Change default to `'api'`
- `apps/journey-visualizer/src/App.jsx`: Change default to `'api'`
- `apps/journey-visualizer/src/services/knowledgeHub.js`: Change default to `'api'`
- `apps/journey-visualizer/src/services/localJourneys.js`: Change default to `'local'`
- `apps/journey-visualizer/src/hooks/useJourneys.js`: Change default to `'api'`

---

## Verification Steps

After removal:

1. ✅ No `airtable` npm package in dependencies
2. ✅ No `AIRTABLE_` or `VITE_AIRTABLE_` env vars in configs
3. ✅ All services default to `api` or `local` data source
4. ✅ Documentation mentions only PostgreSQL and GoHighLevel
5. ✅ No Airtable-specific scripts in `scripts/` root
6. ✅ Team can run `npm install` and `npm run dev` without Airtable config
