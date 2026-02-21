#!/usr/bin/env node

/**
 * Publish SMS Templates to GoHighLevel
 * 
 * Usage:
 *   node scripts/publish-sms.js
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import ghlPublisher from '../src/services/ghl-publisher.js';
import publishState from '../src/utils/publish-state.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const SMS_TEMPLATES_PATH = path.resolve(__dirname, '../../sms/sms-templates.json');

async function main() {
  console.log('📱 Publishing SMS Templates to GoHighLevel');
  console.log('=========================================\n');

  // Check for credentials
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!apiKey || !locationId || apiKey.includes('your-ghl-pit-token-here')) {
    console.error('❌ GHL_API_KEY and GHL_LOCATION_ID required in .env');
    console.error('   Please add your Private Integration Token and Location ID.');
    process.exit(1);
  }

  // Connect to GHL
  ghlPublisher.connect(apiKey, locationId);
  console.log('✓ Connected to GoHighLevel');

  // Read SMS templates
  if (!fs.existsSync(SMS_TEMPLATES_PATH)) {
    console.error(`❌ SMS templates file not found at: ${SMS_TEMPLATES_PATH}`);
    process.exit(1);
  }

  const smsTemplates = JSON.parse(fs.readFileSync(SMS_TEMPLATES_PATH, 'utf-8'));
  console.log(`✓ Loaded ${smsTemplates.length} SMS templates`);

  // Push templates
  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  // Check for force flag
  const forcePush = process.argv.includes('--force');

  for (const template of smsTemplates) {
    // Check if content changed
    const content = template.content;
    const hasChanged = publishState.shouldPublish(template.id, content);

    if (hasChanged || forcePush) {
      console.log(`\nProcessing: ${template.name}${forcePush ? ' (forced)' : ''}`);
      const result = await ghlPublisher.pushSms(template);

      if (result.success) {
        console.log(`   ✓ ${result.action.toUpperCase()} (ID: ${result.templateId})`);
        publishState.updateState(template.id, content, 'sms', template.name);
        successCount++;
      } else {
        if (result.error && result.error.includes('not yet supported by the IAM Service')) {
            console.log(`   ⚠️  API Limitation: SMS Template creation is not supported with this token type.`);
            console.log(`   Please create this template manually in GHL > Conversations > Templates (or Snippets).`);
            console.log(`   ---------------------------------------------------------------`);
            console.log(`   Name:    ${template.name}`);
            console.log(`   Content: ${template.content}`);
            console.log(`   ---------------------------------------------------------------`);
            failCount++; // Count as fail but handled
        } else {
            console.log(`   ✗ FAILED: ${result.error}`);
            failCount++;
        }
      }
    } else {
      console.log(`\nProcessing: ${template.name}`);
      console.log(`   ⏭️  Skipped (content unchanged)`);
      skippedCount++;
    }
  }

  console.log('\n=========================================');
  console.log(`Summary: ${successCount} successful, ${failCount} failed, ${skippedCount} skipped`);
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
