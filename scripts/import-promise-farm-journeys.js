#!/usr/bin/env node
/**
 * Import Promise Farm journeys to production database
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://user:pass@host/db'
    }
  }
});

const CLIENT_ID = 'client_promise_farm';
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

// Map status to valid enum values
function mapStatus(status) {
  const map = {
    'Draft': 'draft',
    'Active': 'published',
    'Archived': 'archived'
  };
  return map[status] || 'draft';
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

async function importJourney(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const journey = JSON.parse(content);

  console.log(`  Importing: ${journey.name} (${journey.id})`);

  try {
    // Check if journey already exists
    const existing = await prisma.journey.findUnique({
      where: { id: journey.id }
    });

    if (existing) {
      console.log(`    ⚠️ Journey ${journey.id} already exists, skipping`);
      return { status: 'skipped', id: journey.id };
    }

    // Create journey
    const createdJourney = await prisma.journey.create({
      data: {
        id: journey.id,
        clientId: CLIENT_ID,
        name: journey.name,
        slug: journey.id.replace(/_/g, '-'),
        description: journey.description || null,
        category: mapCategory(journey.category),
        status: mapStatus(journey.status),
        version: 1,
        triggerConfig: journey.trigger || null,
        goal: journey.goal || null,
        metadata: {
          source: 'local-file-import',
          originalId: journey.id
        }
      }
    });

    // Create initial version
    await prisma.journeyVersion.create({
      data: {
        journeyId: journey.id,
        version: 1,
        snapshot: {},
        changeLog: 'Imported from local file'
      }
    });

    // Create touchpoints
    if (journey.touchpoints && journey.touchpoints.length > 0) {
      for (const tp of journey.touchpoints) {
        const content = tp.content || {};
        
        await prisma.touchpoint.create({
          data: {
            journeyId: journey.id,
            name: tp.name,
            type: mapTouchpointType(tp.type),
            orderIndex: tp.order - 1, // Convert 1-based to 0-based
            content: typeof content === 'string' ? { body: content } : content,
            config: {
              delay: tp.delay || 0,
              delayUnit: tp.delayUnit || 'hours',
              templateType: content.templateType || null
            },
            status: 'draft'
          }
        });
      }
      console.log(`    ✓ Created ${journey.touchpoints.length} touchpoints`);
    }

    console.log(`    ✓ Journey created successfully`);
    return { status: 'created', id: journey.id };

  } catch (error) {
    console.error(`    ✗ Failed to import journey:`, error.message);
    return { status: 'error', id: journey.id, error: error.message };
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Import Promise Farm Journeys                          ║');
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

  return { created, skipped, errors };
}

main()
  .then(async (result) => {
    await prisma.$disconnect();
    process.exit(result.errors > 0 ? 1 : 0);
  })
  .catch(async (error) => {
    console.error('Import failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
