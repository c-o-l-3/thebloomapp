# Airtable to PostgreSQL Migration Scripts

This directory contains migration scripts for moving data from Airtable to PostgreSQL.

## Files

- `migrate-airtable-to-postgres.js` - Original script that uses Airtable API (requires AIRTABLE_API_KEY)
- The active migration script is now located at `apps/journey-api/src/migrate-airtable-to-postgres.js`

## Quick Start

### Prerequisites

1. **Database Setup**: Ensure PostgreSQL is running and migrations are applied
   ```bash
   cd apps/journey-api
   npm run db:migrate
   ```

2. **Environment Variables**: Ensure `DATABASE_URL` is set in `apps/journey-api/.env`

3. **CSV Data**: Ensure CSV files are in `data/migration/airtable-export/`

### Running the Migration

```bash
# From project root
cd apps/journey-api && node src/migrate-airtable-to-postgres.js

# Or with npm (if script is added to package.json)
npm run db:migrate-airtable
```

## CSV File Requirements

The migration script reads from these CSV files in `data/migration/airtable-export/`:

| File | Required | Description |
|------|----------|-------------|
| `Clients-Grid view.csv` | Yes | Client records |
| `Journeys-Grid view.csv` | Yes | Journey definitions |
| `Touchpoints-Grid view.csv` | Yes | Touchpoint content |

### CSV Column Mappings

#### Clients CSV
| CSV Column | Prisma Field | Notes |
|------------|--------------|-------|
| Name | name | Required |
| Location ID | locationId | GHL Location ID |
| PIT Token | ghlLocationId | GHL API Token |
| Website | website | URL |
| Status | status | Maps: Active→active, Inactive→inactive |
| Notes | config.notes | Stored in config JSON |

#### Journeys CSV
| CSV Column | Prisma Field | Notes |
|------------|--------------|-------|
| Journey Name | name | Required |
| Type | category | Maps: Wedding→wedding, etc. |
| Status | status | Maps: Draft→draft, Active→published |
| Description | description | Text |
| Tags | metadata.tags | Comma-separated |
| Client | clientId | Linked by name matching |

#### Touchpoints CSV
| CSV Column | Prisma Field | Notes |
|------------|--------------|-------|
| Internal Name | name | Required |
| Type | type | Maps: Email→email, SMS→sms |
| Day | orderIndex | Numeric day |
| Order | orderIndex | Fallback if Day missing |
| Subject | content.subject | Email subject |
| Body Content | content.body | Email body |
| GHL Template ID | ghlTemplateId | GHL template reference |
| Status | status | Maps: Draft→draft, etc. |

## Data Linking Strategy

Since CSV exports don't include Airtable record IDs, the script uses intelligent matching:

1. **Clients**: Created first, stored in name→ID map
2. **Journeys**: Linked to clients by:
   - Direct name match in Client field
   - Fuzzy match: Journey name contains client name
3. **Touchpoints**: Linked to clients by:
   - Content analysis: Detects venue names in subject/body
   - Signature detection: "Lisa from Cameron Estate"
   - Then assigned to client's journey

## Known Data Gaps

Based on the current CSV export:

1. **Missing Clients**: CSV shows 2 clients, metadata shows 4
   - Only "Maison Albion" and "Cameron Estate Inn" in export
   - Missing: "Maui Pineapple Chapel", "Maravilla Gardens"

2. **Unlinked Journeys**: "New Lead 14-Day Nurture Sequence" has no client
   - Needs manual assignment or additional client data

3. **Unlinked Touchpoints**: Some touchpoints don't mention venue names
   - SMS touchpoints with generic content can't be auto-linked
   - Requires manual review

## Troubleshooting

### "Cannot find package '@prisma/client'"
Run the script from the `apps/journey-api` directory:
```bash
cd apps/journey-api && node src/migrate-airtable-to-postgres.js
```

### "CSV file not found"
Check that CSV files exist in `data/migration/airtable-export/`:
```bash
ls -la data/migration/airtable-export/
```

### "DATABASE_URL not set"
Ensure the `.env` file exists:
```bash
cat apps/journey-api/.env | grep DATABASE_URL
```

## Post-Migration Steps

1. **Verify Data**: Check record counts match expectations
2. **Fix Broken Links**: Review issues report and manually fix unlinked records
3. **Update Slugs**: Ensure URL-safe slugs are unique
4. **Test API**: Verify data is accessible via the API

## Migration Report

The script outputs a detailed report including:
- Records migrated per entity
- Broken links (records that couldn't be linked)
- Data transforms (inferred relationships)
- Skipped records (missing required fields)

Example:
```
📊 Summary:
  Clients:     2 migrated
  Journeys:    1 migrated
  Touchpoints: 3 migrated

⚠️  Note: Some records had issues. Review the report above.
```
