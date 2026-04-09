#!/usr/bin/env node

/**
 * Export Updated Templates to GHL V2 API
 * 
 * Takes modified template JSON files and pushes them back to GoHighLevel.
 * Supports selective updates (update specific templates or all templates).
 * 
 * Usage:
 *   node scripts/export-ghl-templates.js [--all] [--template "name"] [--dry-run]
 * 
 * Environment variables:
 *   GHL_API_KEY - Your GoHighLevel API key (PIT token)
 *   GHL_LOCATION_ID - Your GoHighLevel location ID
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GHLEmailTemplatesV2 } from '../src/services/ghl-email-templates-v2.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../..');
const clientDir = path.join(repoRoot, 'clients', 'cameron-estate');
const inputDir = path.join(clientDir, 'ghl-imported-templates');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const updateAll = args.includes('--all');
const templateName = args.find(a => a.startsWith('--template='))?.split('=')[1];

const apiKey = process.env.GHL_API_KEY;
const locationId = process.env.GHL_LOCATION_ID;

if (!apiKey || !locationId) {
  console.error('Error: GHL_API_KEY and GHL_LOCATION_ID environment variables are required');
  process.exit(1);
}

async function main() {
  console.log('\n📤 Exporting Templates to GoHighLevel (V2 API)\n');
  console.log(`Location ID: ${locationId}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log('');
  
  if (!fs.existsSync(inputDir)) {
    console.error(`Error: Directory not found: ${inputDir}`);
    console.error('Run import script first: node scripts/import-ghl-templates.js');
    process.exit(1);
  }
  
  const manifestPath = path.join(inputDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`Error: manifest.json not found in ${inputDir}`);
    console.error('Run import script first: node scripts/import-ghl-templates.js');
    process.exit(1);
  }
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const client = new GHLEmailTemplatesV2(apiKey, locationId);
  
  let templatesToUpdate = [];
  
  if (templateName) {
    const filePath = path.join(inputDir, `${templateName.replace(/[^a-zA-Z0-9-_]/g, '_')}.json`);
    if (!fs.existsSync(filePath)) {
      console.error(`Error: Template file not found: ${templateName}`);
      process.exit(1);
    }
    const template = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    templatesToUpdate = [{ ...template, fileName: path.basename(filePath) }];
  } else if (updateAll) {
    // Read HTML from individual JSON files (source of truth), not manifest
    templatesToUpdate = manifest.templates.map(t => {
      const fileName = `${t.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.json`;
      const filePath = path.join(inputDir, fileName);
      if (fs.existsSync(filePath)) {
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return { ...t, ...fileData, fileName };
      }
      return { ...t, fileName };
    });
  } else {
    console.log('📋 Available templates to update:\n');
    manifest.templates.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.name}`);
    });
    console.log('\nUse --template="name" to update a specific template');
    console.log('Use --all to update all templates');
    console.log('Use --dry-run to preview changes without making them\n');
    return;
  }
  
  console.log(`\nTemplates to update (${templatesToUpdate.length}):\n`);
  for (const t of templatesToUpdate) {
    console.log(`  - ${t.name}`);
  }
  console.log('');
  
  const results = {
    total: templatesToUpdate.length,
    successful: 0,
    failed: 0,
    templates: []
  };
  
  for (const template of templatesToUpdate) {
    try {
      console.log(`\n🔄 Processing: ${template.name}`);
      console.log(`   Subject: ${template.subject}`);
      
      const ghlTemplate = await client.findTemplateByName(template.name);
      
      if (ghlTemplate) {
        if (dryRun) {
          console.log(`   [DRY RUN] Would UPDATE template ${ghlTemplate.id}`);
        } else {
          const result = await client.updateTemplate(ghlTemplate.id, {
            name: template.name,
            subject: template.subject,
            html: template.html,
            previewText: template.previewText
          });
          console.log(`   ✅ Updated template ${ghlTemplate.id}`);
          results.successful++;
          results.templates.push({
            name: template.name,
            id: ghlTemplate.id,
            action: 'updated'
          });
        }
      } else {
        if (dryRun) {
          console.log(`   [DRY RUN] Would CREATE new template`);
        } else {
          const result = await client.createTemplate({
            name: template.name,
            subject: template.subject,
            html: template.html,
            previewText: template.previewText
          });
          console.log(`   ✅ Created template ${result.id}`);
          results.successful++;
          results.templates.push({
            name: template.name,
            id: result.id,
            action: 'created'
          });
        }
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      results.failed++;
      results.templates.push({
        name: template.name,
        error: error.message
      });
    }
  }
  
  const summaryPath = path.join(inputDir, `export-summary-${Date.now()}.json`);
  fs.writeFileSync(summaryPath, JSON.stringify({
    exportedAt: new Date().toISOString(),
    locationId,
    dryRun,
    ...results
  }, null, 2));
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Export Summary');
  console.log('='.repeat(50));
  console.log(`Total: ${results.total}`);
  console.log(`Successful: ${results.successful}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Summary saved to: ${summaryPath}\n`);
  
  if (results.failed > 0) {
    process.exit(1);
  }
}

main();
