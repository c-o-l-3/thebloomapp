#!/usr/bin/env node
/**
 * Import Promise Farm journeys via API
 * Uses auto-generated UUIDs since the API requires them
 */

import { readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_BASE = 'https://bloom-backend.zeabur.app';
const CLIENT_ID = 'c8f4e2a1-9b3d-4c7e-a5f8-2e6d8c1b4a3f'; // UUID for Promise Farm
const JOURNEY_DIR = join(__dirname, '../clients/promise-farm/journeys');

// Map category to valid enum values
function mapCategory(category) {
  const map = {
    'nurture': 'nurture',
    'confirmation': 'nurture',
    'onboarding': 'nurture',
    'follow-up': 'inquiry',
    'inquiry': 'inquiry'
  };
  return map[category] || 'nurture';
}

// Map touchpoint type to valid enum values
function mapTouchpointType(type) {
  const map = {
    'Email': 'email',
    'SMS': 'sms',
    'Task': 'task',
    'Wait': 'wait',
    'Condition': 'condition',
    'Trigger': 'trigger',
    'Form': 'form',
    'Call': 'call',
    'Note': 'note'
  };
  return map[type] || 'email';
}

async function createJourney(journey) {
  const response = await fetch(`${API_BASE}/api/journeys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: CLIENT_ID,
      name: journey.name,
      slug: journey.id.replace(/_/g, '-'),
      description: journey.description || null,
      category: mapCategory(journey.category),
      status: 'draft',
      triggerConfig: journey.trigger || {},
      goal: journey.goal || '',
      metadata: {
        originalId: journey.id,
        source: 'local-file-import'
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create journey: ${JSON.stringify(error)}`);
  }

  return response.json();
}

async function createTouchpoint(journeyId, touchpoint, orderIndex) {
  const content = touchpoint.content || {};
  
  const response = await fetch(`${API_BASE}/api/touchpoints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      journeyId: journeyId,
      name: touchpoint.name,
      type: mapTouchpointType(touchpoint.type),
      orderIndex: orderIndex,
      content: typeof content === 'string' ? { body: content } : content,
      config: {
        delay: touchpoint.delay || 0,
        delayUnit: touchpoint.delayUnit || 'hours',
        trigger: touchpoint.trigger || null
      },
      status: 'draft'
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create touchpoint: ${JSON.stringify(error)}`);
  }

  return response.json();
}

async function importJourney(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const journey = JSON.parse(content);

  console.log(`  Importing: ${journey.name} (${journey.id})`);

  try {
    // Check if journey already exists (by checking if name exists)
    const existingResponse = await fetch(`${API_BASE}/api/journeys?client=promise-farm`);
    const existingJourneys = await existingResponse.json();
    const existing = existingJourneys.find(j => j.name === journey.name);

    if (existing) {
      console.log(`    ⚠️ Journey "${journey.name}" already exists (ID: ${existing.id}), skipping`);
      return { status: 'skipped', name: journey.name, id: existing.id };
    }

    // Create journey
    const createdJourney = await createJourney(journey);
    console.log(`    ✓ Created journey: ${createdJourney.id}`);

    // Create touchpoints
    if (journey.touchpoints && journey.touchpoints.length > 0) {
      for (let i = 0; i < journey.touchpoints.length; i++) {
        const tp = journey.touchpoints[i];
        await createTouchpoint(createdJourney.id, tp, i);
      }
      console.log(`    ✓ Created ${journey.touchpoints.length} touchpoints`);
    }

    console.log(`    ✓ Journey imported successfully`);
    return { 
      status: 'created', 
      name: journey.name, 
      originalId: journey.id,
      newId: createdJourney.id 
    };

  } catch (error) {
    console.error(`    ✗ Failed to import journey:`, error.message);
    return { status: 'error', name: journey.name, error: error.message };
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Import Promise Farm Journeys via API                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Get all journey files
  const files = readdirSync(JOURNEY_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => join(JOURNEY_DIR, f));

  console.log(`Found ${files.length} journey files\n`);

  const results = [];
  for (const file of files) {
    const result = await importJourney(file);
    results.push(result);
    console.log();
  }

  // Summary
  const created = results.filter(r => r.status === 'created').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const errors = results.filter(r => r.status === 'error').length;

  console.log('\n═════════════════════════════════════════════════════════════');
  console.log('Import Summary:');
  console.log(`  Created: ${created}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors:  ${errors}`);
  console.log('═════════════════════════════════════════════════════════════\n');

  // Print ID mappings
  const createdJourneys = results.filter(r => r.status === 'created');
  if (createdJourneys.length > 0) {
    console.log('ID Mappings (save these for reference):');
    createdJourneys.forEach(j => {
      console.log(`  ${j.originalId} -> ${j.newId} (${j.name})`);
    });
    console.log();
  }

  return { created, skipped, errors };
}

main()
  .then((result) => {
    process.exit(result.errors > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });
