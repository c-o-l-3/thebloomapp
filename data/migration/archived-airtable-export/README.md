# Airtable Data Export

## Export Summary

- **Export Date:** 2026-02-22T00:47:00.000Z
- **Base ID:** app0SDQtlRtScHkpC
- **Total Tables:** 7
- **Successful:** 7
- **Failed:** 0
- **Export Method:** Manual CSV Export from Airtable Web UI

## Exported Tables

| Table | Records | File | Status |
|-------|---------|------|--------|
| Approvals | 0 | Approvals-Grid view.csv | ✅ Success |
| Clients | 4 | Clients-Grid view.csv | ✅ Success |
| Journeys | 6 | Journeys-Grid view.csv | ✅ Success |
| Pipelines | 0 | Pipelines-Grid view.csv | ✅ Success |
| Table 1 | 1 | Table 1-Grid view.csv | ✅ Success |
| Touchpoints | 89 | Touchpoints-Grid view.csv | ✅ Success |
| Versions | 1 | Versions-Grid view.csv | ✅ Success |

## File Structure

```
data/migration/airtable-export/
├── metadata.json              # Export metadata and statistics
├── README.md                  # This file
├── Approvals-Grid view.csv    # Approval records
├── Clients-Grid view.csv      # Client configurations
├── Journeys-Grid view.csv     # Journey definitions
├── Pipelines-Grid view.csv    # Pipeline configurations
├── Table 1-Grid view.csv      # Table 1 data
├── Touchpoints-Grid view.csv  # Touchpoint configurations (89 records)
└── Versions-Grid view.csv     # Version history
```

## Data Summary

### High-Value Tables

- **Touchpoints (89 records):** Contains all touchpoint configurations across journeys
- **Journeys (6 records):** Core journey definitions
- **Clients (4 records):** Client/workspace configurations

### Empty/Minimal Tables

- **Approvals (0 records):** No approval records
- **Pipelines (0 records):** No pipeline configurations in Airtable
- **Table 1 (1 record):** Appears to be test/legacy data
- **Versions (1 record):** Minimal version history

## Usage

### Load CSV Data

```javascript
const fs = require('fs');
const csv = require('csv-parse/sync');

// Parse CSV files
const journeysCsv = fs.readFileSync('Journeys-Grid view.csv', 'utf8');
const journeys = csv.parse(journeysCsv, { columns: true });
console.log(`Loaded ${journeys.length} journeys`);
```

### Convert to JSON

```bash
# Using csvtojson (npm install -g csvtojson)
csvtojson Journeys-Grid\ view.csv > journeys.json
```

## Migration Notes

- **Record IDs:** Preserved in CSV as `Record ID` column (where available)
- **Linked Fields:** Maintained as comma-separated record IDs
- **Attachments:** Stored as URLs in CSV
- **Created/Modified Times:** Preserved in ISO 8601 format

## Known Data Gaps

1. **Templates table:** Not found in this export - may exist in a different base
2. **Workflows table:** Not found in this export - may exist in a different base
3. **SyncHistory table:** Not found in this export

## Recommended Actions

1. ✅ **Immediate:** This CSV export provides backup of current Airtable state
2. 🔧 **Next:** Run API-based export for JSON format: `node scripts/sync-engine/export-airtable-data.js`
3. 📊 **Validation:** Compare record counts with Airtable UI before migration
4. 🔄 **Migration:** Use `scripts/migration/migrate-airtable-to-postgres.js` after validation

## Next Steps

1. Review exported data for completeness
2. Validate record counts match Airtable (especially Touchpoints: 89 records)
3. Run API-based JSON export for programmatic migration
4. Execute PostgreSQL migration

---
*Generated for Airtable-to-Postgres Migration*
*Base: The Bloom App - Journey Builder*
