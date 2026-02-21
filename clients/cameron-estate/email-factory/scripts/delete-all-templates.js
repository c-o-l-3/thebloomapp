#!/usr/bin/env node

/**
 * Delete all email templates from GHL
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ghlPublisher from '../src/services/ghl-publisher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
  console.log('Deleting all email templates from GHL...');

  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!apiKey || !locationId) {
    console.error('❌ Missing GHL credentials');
    process.exit(1);
  }

  ghlPublisher.connect(apiKey, locationId);
  
  const templates = await ghlPublisher.getEmailTemplates();
  console.log(`Found ${templates.length} templates to delete`);
  
  let deleted = 0;
  let failed = 0;
  
  for (const tmpl of templates) {
    try {
      await ghlPublisher.deleteEmailTemplate(tmpl.id);
      console.log(`✓ Deleted: ${tmpl.name} (${tmpl.id})`);
      deleted++;
    } catch (error) {
      console.error(`✗ Failed to delete ${tmpl.name}: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\nSummary: ${deleted} deleted, ${failed} failed`);
}

main().catch(console.error);
