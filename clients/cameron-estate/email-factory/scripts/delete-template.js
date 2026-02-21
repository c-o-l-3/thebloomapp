#!/usr/bin/env node

/**
 * Delete a specific template from GHL
 * 
 * Usage:
 *   node scripts/delete-template.js <template-id>
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ghlPublisher from '../src/services/ghl-publisher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
  const templateId = process.argv[2];
  
  if (!templateId) {
    console.error('Usage: node scripts/delete-template.js <template-id>');
    process.exit(1);
  }

  console.log(`Deleting template: ${templateId}`);

  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!apiKey || !locationId) {
    console.error('❌ Missing GHL credentials');
    process.exit(1);
  }

  ghlPublisher.connect(apiKey, locationId);
  
  try {
    await ghlPublisher.deleteEmailTemplate(templateId);
    console.log(`✓ Deleted template ${templateId}`);
  } catch (error) {
    console.error(`✗ Failed to delete: ${error.message}`);
    process.exit(1);
  }
}

main().catch(console.error);
