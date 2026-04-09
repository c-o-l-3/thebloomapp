#!/usr/bin/env node
/**
 * Push email templates to Bloom (GHL) for any client.
 *
 * Usage:
 *   node scripts/ghl-push.js --client=cameron-estate
 *   node scripts/ghl-push.js --client=maravilla-gardens
 *   node scripts/ghl-push.js --client=cameron-estate --dry-run
 *
 * Credentials are read (in order of priority) from:
 *   1. Environment variables: GHL_API_KEY, GHL_LOCATION_ID
 *   2. clients/{client}/.env
 *   3. apps/journey-api/.env  (fallback)
 *
 * Workflow:
 *   1. Sync HTML files → individual JSON files (HTML is source of truth)
 *   2. Push all templates to GHL via the V2 API
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const clientArg = args.find(a => a.startsWith('--client='))?.split('=')[1];

if (!clientArg) {
  console.error('Error: --client=<slug> is required.');
  console.error('Example: node scripts/ghl-push.js --client=cameron-estate');
  console.error('\nAvailable clients:');
  const clientsDir = path.join(repoRoot, 'clients');
  fs.readdirSync(clientsDir)
    .filter(f => fs.statSync(path.join(clientsDir, f)).isDirectory())
    .forEach(c => console.error(`  - ${c}`));
  process.exit(1);
}

// ─── Load credentials ─────────────────────────────────────────────────────────

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^([^#=\s]+)\s*=\s*["']?([^"'\n]*)["']?/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

// Load client-specific .env first, then fall back to journey-api .env
loadEnvFile(path.join(repoRoot, 'clients', clientArg, '.env'));
loadEnvFile(path.join(repoRoot, 'apps', 'journey-api', '.env'));

// Also check location-config.json for locationId
if (!process.env.GHL_LOCATION_ID) {
  const configPath = path.join(repoRoot, 'clients', clientArg, 'location-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.locationId) process.env.GHL_LOCATION_ID = config.locationId;
  }
}

const apiKey = process.env.GHL_API_KEY;
const locationId = process.env.GHL_LOCATION_ID;

if (!apiKey || !locationId) {
  console.error(`\nError: Missing credentials for client "${clientArg}".`);
  console.error('Need both GHL_API_KEY and GHL_LOCATION_ID. Set them in:');
  console.error(`  clients/${clientArg}/.env`);
  console.error(`  OR clients/${clientArg}/location-config.json (for locationId)`);
  process.exit(1);
}

// ─── Set up paths ─────────────────────────────────────────────────────────────

const templateDir = path.join(repoRoot, 'clients', clientArg, 'ghl-imported-templates');

if (!fs.existsSync(templateDir)) {
  console.error(`\nError: No imported templates found at ${templateDir}`);
  console.error(`Run import first: node scripts/ghl-import.js --client=${clientArg}`);
  process.exit(1);
}

const manifestPath = path.join(templateDir, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error(`Error: manifest.json not found. Run import first.`);
  process.exit(1);
}

// Lazy import after env is set up
const { GHLEmailTemplatesV2 } = await import(
  path.join(repoRoot, 'clients', 'cameron-estate', 'email-factory', 'src', 'services', 'ghl-email-templates-v2.js')
);

console.log(`\n🌸 Pushing "${clientArg}" to Bloom (GHL)${dryRun ? ' [DRY RUN]' : ''}`);
console.log(`   Location ID: ${locationId}\n`);

// ─── Step 1: Sync HTML → JSON ─────────────────────────────────────────────────

console.log('📄 Step 1: Syncing HTML files into JSON...\n');

const htmlFiles = fs.readdirSync(templateDir).filter(f => f.endsWith('.html') && !f.startsWith('all-') && !f.startsWith('preview-'));
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

// Sync manifest
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
for (const t of manifest.templates) {
  const safeName = t.name.replace(/[^a-zA-Z0-9-_]/g, '_');
  const jsonPath = path.join(templateDir, `${safeName}.json`);
  if (fs.existsSync(jsonPath)) {
    t.html = JSON.parse(fs.readFileSync(jsonPath, 'utf8')).html;
  }
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`\n  ${synced} HTML files synced.\n`);

// ─── Step 2: Push to GHL ──────────────────────────────────────────────────────

console.log(`📤 Step 2: Pushing to GHL...\n`);

const client = new GHLEmailTemplatesV2(apiKey, locationId);
let successful = 0;
let failed = 0;

for (const t of manifest.templates) {
  const safeName = t.name.replace(/[^a-zA-Z0-9-_]/g, '_');
  const jsonPath = path.join(templateDir, `${safeName}.json`);
  const templateData = fs.existsSync(jsonPath)
    ? JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
    : t;

  try {
    const existing = await client.findTemplateByName(t.name);
    if (existing) {
      if (!dryRun) await client.updateTemplate(existing.id, templateData);
      console.log(`  ${dryRun ? '[DRY RUN] ' : ''}✅ ${t.name}`);
    } else {
      if (!dryRun) await client.createTemplate(templateData);
      console.log(`  ${dryRun ? '[DRY RUN] ' : ''}✅ ${t.name} (created)`);
    }
    successful++;
  } catch (err) {
    console.log(`  ❌ ${t.name}: ${err.message}`);
    failed++;
  }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Client: ${clientArg} | Total: ${manifest.templates.length} | Success: ${successful} | Failed: ${failed}`);
console.log('='.repeat(50) + '\n');

if (failed > 0) process.exit(1);
