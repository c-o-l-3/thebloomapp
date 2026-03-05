#!/usr/bin/env node
/**
 * Airtable Data Export Script
 * 
 * Exports all Airtable tables to JSON files for migration preparation.
 * 
 * Usage:
 *   node scripts/export-airtable-data.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create require function to load modules from sync-engine
const require = createRequire(import.meta.url);
const syncEnginePath = path.join(__dirname, 'sync-engine');

// Load dotenv from sync-engine
const dotenv = require(path.join(syncEnginePath, 'node_modules', 'dotenv'));
const envPath = path.join(syncEnginePath, '.env');
dotenv.config({ path: envPath });

// Load Airtable from sync-engine
const Airtable = require(path.join(syncEnginePath, 'node_modules', 'airtable'));

// Configuration - output to project root data/migration directory
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'data', 'migration', 'airtable-export');
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

// Tables to export
const TABLES = [
  { name: 'Journeys', filename: 'journeys.json' },
  { name: 'Touchpoints', filename: 'touchpoints.json' },
  { name: 'Templates', filename: 'templates.json' },
  { name: 'Clients', filename: 'clients.json' },
  { name: 'Workflows', filename: 'workflows.json' },
  { name: 'SyncHistory', filename: 'sync-history.json' }
];

/**
 * Ensure output directory exists
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`[INFO] Created directory: ${dirPath}`);
  }
}

/**
 * Initialize Airtable connection
 */
function initializeAirtable() {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    throw new Error('Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID environment variables');
  }

  console.log(`[INFO] Using Base ID: ${AIRTABLE_BASE_ID.substring(0, 10)}...`);
  Airtable.configure({ apiKey: AIRTABLE_API_KEY });
  return Airtable.base(AIRTABLE_BASE_ID);
}

/**
 * Export a single table with pagination
 */
async function exportTable(base, tableName) {
  console.log(`[EXPORT] Starting export of ${tableName}...`);
  const records = [];
  const schema = {
    fields: [],
    fieldTypes: {}
  };

  try {
    // Get all records with pagination
    await base(tableName)
      .select({
        pageSize: 100 // Airtable's max page size
      })
      .eachPage((pageRecords, fetchNextPage) => {
        for (const record of pageRecords) {
          const recordData = {
            id: record.id,
            fields: {},
            createdTime: record._rawJson.createdTime
          };

          // Extract all fields
          for (const [fieldName, value] of Object.entries(record.fields)) {
            recordData.fields[fieldName] = value;

            // Capture schema info from first record
            if (records.length === 0) {
              schema.fields.push(fieldName);
              schema.fieldTypes[fieldName] = Array.isArray(value) 
                ? `array[${value.length > 0 ? typeof value[0] : 'unknown'}]`
                : typeof value;
            }
          }

          records.push(recordData);
        }
        fetchNextPage();
      });

    console.log(`[SUCCESS] Exported ${tableName}: ${records.length} records`);
    
    return {
      records,
      count: records.length,
      schema
    };
  } catch (error) {
    console.error(`[ERROR] Failed to export ${tableName}: ${error.message}`);
    throw error;
  }
}

/**
 * Export all tables
 */
async function exportAllTables(base) {
  const results = {};
  const tableMetadata = [];

  console.log('\n========================================');
  console.log('  Starting Airtable Export');
  console.log('========================================\n');
  console.log(`Output: ${OUTPUT_DIR}\n`);

  for (const table of TABLES) {
    try {
      const startTime = Date.now();
      const data = await exportTable(base, table.name);
      const duration = Date.now() - startTime;

      // Save individual table file
      const outputPath = path.join(OUTPUT_DIR, table.filename);
      fs.writeFileSync(outputPath, JSON.stringify(data.records, null, 2));
      console.log(`[SAVE] Written to ${table.filename}`);

      results[table.name] = data;
      tableMetadata.push({
        name: table.name,
        filename: table.filename,
        recordCount: data.count,
        duration: `${duration}ms`,
        exportedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(`\n[ERROR] Failed to export ${table.name}:`, error.message);
      tableMetadata.push({
        name: table.name,
        filename: table.filename,
        recordCount: 0,
        error: error.message,
        exportedAt: new Date().toISOString()
      });
    }
  }

  return { results, tableMetadata };
}

/**
 * Generate metadata file
 */
function generateMetadata(tableMetadata) {
  const metadata = {
    exportInfo: {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      exportedBy: process.env.USER || 'unknown',
      baseId: AIRTABLE_BASE_ID,
      totalTables: TABLES.length,
      successfulExports: tableMetadata.filter(t => !t.error).length,
      failedExports: tableMetadata.filter(t => t.error).length
    },
    tables: tableMetadata,
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    }
  };

  const metadataPath = path.join(OUTPUT_DIR, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`\n[SUCCESS] Metadata saved to: metadata.json`);

  return metadata;
}

/**
 * Generate README file
 */
function generateReadme(metadata) {
  const readme = `# Airtable Data Export

## Export Summary

- **Export Date:** ${metadata.exportInfo.exportedAt}
- **Base ID:** ${metadata.exportInfo.baseId}
- **Total Tables:** ${metadata.exportInfo.totalTables}
- **Successful:** ${metadata.exportInfo.successfulExports}
- **Failed:** ${metadata.exportInfo.failedExports}

## Exported Tables

| Table | Records | File | Status |
|-------|---------|------|--------|
${metadata.tables.map(t => 
  `| ${t.name} | ${t.recordCount} | ${t.filename} | ${t.error ? '❌ Failed' : '✅ Success'} |`
).join('\n')}

## File Structure

\`\`\`
data/migration/airtable-export/
├── metadata.json      # Export metadata and statistics
├── journeys.json      # Journey definitions
├── touchpoints.json   # Touchpoint configurations
├── templates.json     # Message templates
├── clients.json       # Client configurations
├── workflows.json     # Workflow definitions
├── sync-history.json  # Sync history records
└── README.md          # This file
\`\`\`

## Usage

### Load Exported Data

\`\`\`javascript
const fs = require('fs');
const metadata = JSON.parse(fs.readFileSync('metadata.json', 'utf8'));
const journeys = JSON.parse(fs.readFileSync('journeys.json', 'utf8'));
// ... load other tables
\`\`\`

### Data Format

Each table is exported as an array of records:

\`\`\`json
[
  {
    "id": "recXXXXXXXXXXXXXX",
    "fields": { ... },
    "createdTime": "2024-01-01T00:00:00.000Z"
  }
]
\`\`\`

## Migration Notes

- All record IDs are preserved from Airtable
- Linked fields maintain their reference IDs
- Attachments are preserved as URL references
- Created time is preserved for audit purposes

## Next Steps

1. Review exported data for completeness
2. Validate record counts match Airtable
3. Run migration to PostgreSQL using:
   \`\`\`bash
   node scripts/migration/migrate-airtable-to-postgres.js
   \`\`\`

---
*Generated by export-airtable-data.js*
`;

  const readmePath = path.join(OUTPUT_DIR, 'README.md');
  fs.writeFileSync(readmePath, readme);
  console.log(`[SUCCESS] README saved to: README.md`);
}

/**
 * Print summary to console
 */
function printSummary(metadata) {
  console.log('\n========================================');
  console.log('  Export Summary');
  console.log('========================================\n');
  console.log(`Exported at: ${metadata.exportInfo.exportedAt}`);
  console.log(`Total tables: ${metadata.exportInfo.totalTables}`);
  console.log(`Successful: ${metadata.exportInfo.successfulExports}`);
  
  if (metadata.exportInfo.failedExports > 0) {
    console.log(`Failed: ${metadata.exportInfo.failedExports}`);
  }

  console.log('\nOutput Files:');
  metadata.tables.forEach(table => {
    const status = table.error ? '✗' : '✓';
    console.log(`  ${status} ${table.filename} (${table.recordCount} records)`);
  });

  console.log(`\nOutput directory: ${OUTPUT_DIR}\n`);
}

/**
 * Main export function
 */
async function main() {
  console.log('========================================');
  console.log('  Airtable Data Export Tool');
  console.log('========================================');

  try {
    // Ensure output directory exists
    ensureDirectoryExists(OUTPUT_DIR);

    // Initialize Airtable
    console.log('[INFO] Connecting to Airtable...');
    const base = initializeAirtable();
    console.log('[SUCCESS] Connected to Airtable');

    // Export all tables
    const { tableMetadata } = await exportAllTables(base);

    // Generate metadata and README
    const metadata = generateMetadata(tableMetadata);
    generateReadme(metadata);

    // Print summary
    printSummary(metadata);

    console.log('[DONE] Export completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n[FAIL] Export failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === fileURLToPath(import.meta.url)) {
  main();
}

export { exportAllTables, generateMetadata };
