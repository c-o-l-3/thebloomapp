#!/usr/bin/env node
/**
 * Import email templates from GHL (Bloom) for any client.
 *
 * Usage:
 *   node scripts/ghl-import.js --client=maravilla-gardens
 *   node scripts/ghl-import.js --client=cameron-estate
 *
 * Credentials are read from (in priority order):
 *   1. Environment variables: GHL_API_KEY, GHL_LOCATION_ID
 *   2. clients/{client}/.env
 *   3. clients/{client}/location-config.json  (for locationId)
 *
 * Output: clients/{client}/ghl-imported-templates/
 *   - {TemplateName}.json   — template data including HTML
 *   - {TemplateName}.html   — HTML extracted for easy editing
 *   - manifest.json         — index of all templates
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const args = process.argv.slice(2);
const clientArg = args.find(a => a.startsWith('--client='))?.split('=')[1];

if (!clientArg) {
  console.error('Error: --client=<slug> is required.');
  console.error('Example: node scripts/ghl-import.js --client=maravilla-gardens');
  process.exit(1);
}

// ─── Load credentials ─────────────────────────────────────────────────────────

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^([^#=\s]+)\s*=\s*["']?([^"'\n]*)["']?/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

loadEnvFile(path.join(repoRoot, 'clients', clientArg, '.env'));
loadEnvFile(path.join(repoRoot, 'apps', 'journey-api', '.env'));

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
  console.error(`\nError: Missing credentials for "${clientArg}".`);
  console.error(`Create clients/${clientArg}/.env with:`);
  console.error(`  GHL_API_KEY=pit-xxxx`);
  console.error(`  GHL_LOCATION_ID=xxxx`);
  console.error(`Or add locationId to clients/${clientArg}/location-config.json`);
  process.exit(1);
}

const { GHLEmailTemplatesV2 } = await import(
  path.join(repoRoot, 'clients', 'cameron-estate', 'email-factory', 'src', 'services', 'ghl-email-templates-v2.js')
);

const outputDir = path.join(repoRoot, 'clients', clientArg, 'ghl-imported-templates');
fs.mkdirSync(outputDir, { recursive: true });

console.log(`\n📥 Importing templates for "${clientArg}" from GHL\n`);
console.log(`   Location ID: ${locationId}`);
console.log(`   Output: ${outputDir}\n`);

const ghl = new GHLEmailTemplatesV2(apiKey, locationId);
const templates = await ghl.listAllTemplates();
console.log(`Found ${templates.length} templates\n`);

const manifest = {
  importedAt: new Date().toISOString(),
  client: clientArg,
  locationId,
  totalTemplates: templates.length,
  templates: []
};

for (const template of templates) {
  let html = '';
  if (template.previewUrl) {
    try {
      const resp = await axios.get(template.previewUrl, { timeout: 15000 });
      html = resp.data;
    } catch (e) {
      console.log(`  Warning: Could not fetch HTML for ${template.name}: ${e.message}`);
    }
  }

  const safeName = template.name.replace(/[^a-zA-Z0-9-_]/g, '_');
  const data = {
    id: template.id,
    name: template.name,
    subject: '',
    previewText: '',
    html,
    previewUrl: template.previewUrl || '',
    folderId: template.parentFolderId || null,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt
  };

  // Save JSON
  fs.writeFileSync(path.join(outputDir, `${safeName}.json`), JSON.stringify(data, null, 2));
  // Save HTML separately for easy editing
  if (html) fs.writeFileSync(path.join(outputDir, `${safeName}.html`), html);

  manifest.templates.push(data);
  console.log(`  ✓ ${template.name} (${html.length} chars)`);
}

fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

console.log(`\n✅ Done. ${templates.length} templates saved to:`);
console.log(`   ${outputDir}\n`);
console.log('Next steps:');
console.log(`  1. Edit HTML files in ${outputDir}/`);
console.log(`  2. node scripts/ghl-push.js --client=${clientArg}`);
