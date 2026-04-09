#!/usr/bin/env node
/**
 * Push Cameron Estate email templates to Bloom (GHL).
 *
 * Full workflow in one command:
 *   1. Sync HTML files → individual JSON files
 *   2. Export all templates to GHL via the V2 API
 *
 * Usage:
 *   node scripts/push-to-bloom.js
 *   node scripts/push-to-bloom.js --dry-run
 *
 * Reads credentials from apps/journey-api/.env or environment variables:
 *   GHL_API_KEY      - PIT token
 *   GHL_LOCATION_ID  - Location ID
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { GHLEmailTemplatesV2 } from '../src/services/ghl-email-templates-v2.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../..');
const templateDir = path.join(repoRoot, 'clients', 'cameron-estate', 'ghl-imported-templates');
const dryRun = process.argv.includes('--dry-run');

// Load .env from journey-api if env vars not already set
if (!process.env.GHL_API_KEY) {
  const envPath = path.join(repoRoot, 'apps', 'journey-api', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^([^#=]+)=["']?([^"'\n]*)["']?/);
      if (match) process.env[match[1].trim()] = match[2].trim();
    }
  }
}

const apiKey = process.env.GHL_API_KEY;
const locationId = process.env.GHL_LOCATION_ID;

if (!apiKey || !locationId) {
  console.error('Error: GHL_API_KEY and GHL_LOCATION_ID not found.');
  console.error('Set them in apps/journey-api/.env or as environment variables.');
  process.exit(1);
}

// ─── Step 1: Sync HTML files → individual JSON files ─────────────────────────

console.log('\n📄 Step 1: Syncing HTML files into JSON...\n');

const htmlFiles = fs.readdirSync(templateDir)
  .filter(f => f.match(/^001_E_Day_.*\.html$/));

let synced = 0;
for (const htmlFile of htmlFiles) {
  const name = htmlFile.replace('.html', '');
  const jsonPath = path.join(templateDir, `${name}.json`);
  if (!fs.existsSync(jsonPath)) continue;

  const html = fs.readFileSync(path.join(templateDir, htmlFile), 'utf8');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  data.html = html;
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  console.log(`  ✓ ${name}`);
  synced++;
}

// Also sync manifest.json
const manifestPath = path.join(templateDir, 'manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const t of manifest.templates) {
    const safeName = t.name.replace(/[^a-zA-Z0-9-_]/g, '_');
    const jsonPath = path.join(templateDir, `${safeName}.json`);
    if (fs.existsSync(jsonPath)) {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      t.html = data.html;
    }
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

console.log(`\n  ${synced} HTML files synced.\n`);

// ─── Step 2: Push to GHL ──────────────────────────────────────────────────────

console.log(`📤 Step 2: Pushing to Bloom (GHL)${dryRun ? ' [DRY RUN]' : ''}...\n`);

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const client = new GHLEmailTemplatesV2(apiKey, locationId);

let successful = 0;
let failed = 0;

for (const t of manifest.templates) {
  // Read from individual JSON file (source of truth)
  const safeName = t.name.replace(/[^a-zA-Z0-9-_]/g, '_');
  const jsonPath = path.join(templateDir, `${safeName}.json`);
  const templateData = fs.existsSync(jsonPath)
    ? JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
    : t;

  try {
    const existing = await client.findTemplateByName(t.name);

    if (existing) {
      if (dryRun) {
        console.log(`  [DRY RUN] Would update: ${t.name} (${existing.id})`);
      } else {
        await client.updateTemplate(existing.id, templateData);
        console.log(`  ✅ ${t.name}`);
        successful++;
      }
    } else {
      if (dryRun) {
        console.log(`  [DRY RUN] Would create: ${t.name}`);
      } else {
        const result = await client.createTemplate(templateData);
        console.log(`  ✅ ${t.name} (created)`);
        successful++;
      }
    }
  } catch (err) {
    console.log(`  ❌ ${t.name}: ${err.message}`);
    failed++;
  }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${manifest.templates.length} | Success: ${successful} | Failed: ${failed}`);
console.log('='.repeat(50) + '\n');

if (failed > 0) process.exit(1);
