#!/usr/bin/env node
/**
 * Airtable to PostgreSQL Migration Script
 * 
 * This script migrates all data from Airtable to PostgreSQL.
 * Run with: node scripts/migration/migrate-airtable-to-postgres.js
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from root and api
const rootEnvPath = join(__dirname, '../../.env');
const apiEnvPath = join(__dirname, '../../apps/journey-api/.env');
dotenv.config({ path: rootEnvPath });
dotenv.config({ path: apiEnvPath, override: true });

const prisma = new PrismaClient();

// Airtable API Configuration
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'app66pKRuzhlUzy3j';
const AIRTABLE_BASE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

// ID mappings for referential integrity
const mappings = {
  clients: new Map(),      // airtableId -> uuid
  journeys: new Map(),     // airtableId -> uuid
  touchpoints: new Map(),  // airtableId -> uuid
  templates: new Map(),    // airtableId -> uuid
  pipelines: new Map()     // airtableId -> uuid
};

// Helper to fetch from Airtable
async function fetchFromAirtable(tableName, options = {}) {
  const url = new URL(`${AIRTABLE_BASE_URL}/${tableName}`);
  
  if (options.filterByFormula) {
    url.searchParams.append('filterByFormula', options.filterByFormula);
  }
  if (options.maxRecords) {
    url.searchParams.append('maxRecords', options.maxRecords.toString());
  }
  if (options.view) {
    url.searchParams.append('view', options.view);
  }

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.records || [];
}

// Generate slug from name
function generateSlug(name) {
  if (!name) return `untitled-${Date.now()}`;
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 100);
}

// Map Airtable status to PostgreSQL status
function mapStatus(airtableStatus, entityType) {
  const mappings = {
    client: {
      'Active': 'active',
      'Inactive': 'inactive',
      'Onboarding': 'onboarding',
      'Archived': 'archived'
    },
    journey: {
      'Draft': 'draft',
      'In Review': 'client_review',
      'Active': 'published',
      'Paused': 'archived',
      'Approved': 'approved',
      'Rejected': 'rejected'
    },
    touchpoint: {
      'Draft': 'draft',
      'Approved': 'approved',
      'Published': 'published'
    }
  };
  return mappings[entityType]?.[airtableStatus] || 'draft';
}

// Map category/type
function mapCategory(airtableType) {
  const map = {
    'Wedding': 'wedding',
    'Corporate': 'corporate',
    'Event': 'event',
    'Inquiry': 'inquiry',
    'Nurture': 'nurture'
  };
  return map[airtableType] || 'nurture';
}

function mapTouchpointType(type) {
  const map = {
    'Email': 'email',
    'SMS': 'sms',
    'Task': 'task',
    'Wait': 'wait',
    'Condition': 'condition',
    'Trigger': 'trigger'
  };
  return map[type] || 'email';
}

// Parse JSON content safely
function parseContent(content) {
  if (!content) return {};
  try {
    return typeof content === 'string' ? JSON.parse(content) : content;
  } catch {
    return { body: content };
  }
}

// Parse stages from Airtable
function parseStages(stagesField) {
  if (!stagesField) return [];
  try {
    return typeof stagesField === 'string' ? JSON.parse(stagesField) : stagesField;
  } catch {
    return [];
  }
}

// Migration functions
async function migrateClients() {
  console.log('📦 Migrating Clients...');
  
  const records = await fetchFromAirtable('Clients');
  console.log(`  Found ${records.length} clients in Airtable`);

  for (const record of records) {
    const fields = record.fields;
    
    try {
      const client = await prisma.client.create({
        data: {
          slug: generateSlug(fields.Name),
          name: fields.Name || 'Unnamed Client',
          locationId: fields['Location ID'] || null,
          ghlLocationId: fields['PIT Token'] || null,
          industry: fields.Industry || null,
          website: fields.Website || null,
          status: mapStatus(fields.Status, 'client'),
          settings: {},
          config: {
            notes: fields.Notes || '',
            airtableId: record.id
          }
        }
      });
      
      mappings.clients.set(record.id, client.id);
      console.log(`  ✓ ${client.name}`);
    } catch (error) {
      console.error(`  ✗ Failed to migrate client ${fields.Name}:`, error.message);
    }
  }
  
  console.log(`  Migrated ${mappings.clients.size} clients\n`);
}

async function migratePipelines() {
  console.log('🔄 Migrating Pipelines...');
  
  const records = await fetchFromAirtable('Pipelines');
  console.log(`  Found ${records.length} pipelines in Airtable`);

  for (const record of records) {
    const fields = record.fields;
    
    // Find linked client
    const clientAirtableId = fields.Clients?.[0];
    const clientId = clientAirtableId ? mappings.clients.get(clientAirtableId) : null;
    
    if (!clientId) {
      console.warn(`  ⚠️  Skipping pipeline ${fields['Pipeline Name']} - no client mapping`);
      continue;
    }

    try {
      const pipeline = await prisma.pipeline.create({
        data: {
          clientId: clientId,
          name: fields['Pipeline Name'] || 'Unnamed Pipeline',
          pipelineId: fields['Pipeline ID'] || null,
          stages: parseStages(fields.Stages),
          isDefault: fields['Is Default'] || false
        }
      });
      
      mappings.pipelines.set(record.id, pipeline.id);
      console.log(`  ✓ ${pipeline.name}`);
    } catch (error) {
      console.error(`  ✗ Failed to migrate pipeline ${fields['Pipeline Name']}:`, error.message);
    }
  }
  
  console.log(`  Migrated ${mappings.pipelines.size} pipelines\n`);
}

async function migrateJourneys() {
  console.log('🗺️  Migrating Journeys...');
  
  const records = await fetchFromAirtable('Journeys');
  console.log(`  Found ${records.length} journeys in Airtable`);

  for (const record of records) {
    const fields = record.fields;
    
    // Find linked client
    const clientAirtableId = fields.Client?.[0];
    const clientId = clientAirtableId ? mappings.clients.get(clientAirtableId) : null;
    
    if (!clientId) {
      console.warn(`  ⚠️  Skipping journey ${fields['Journey Name']} - no client mapping`);
      continue;
    }

    // Find linked pipeline
    const pipelineAirtableId = fields.Pipeline?.[0];
    const pipelineId = pipelineAirtableId ? mappings.pipelines.get(pipelineAirtableId) : null;

    try {
      const journey = await prisma.journey.create({
        data: {
          clientId: clientId,
          pipelineId: pipelineId,
          name: fields['Journey Name'] || 'Unnamed Journey',
          slug: generateSlug(fields['Journey Name']),
          description: fields.Description || null,
          category: mapCategory(fields.Type),
          status: mapStatus(fields.Status, 'journey'),
          version: 1,
          triggerConfig: fields['Trigger Config'] ? parseContent(fields['Trigger Config']) : null,
          goal: fields.Goal || null,
          metadata: {
            tags: fields.Tags || [],
            airtableId: record.id
          }
        }
      });
      
      mappings.journeys.set(record.id, journey.id);
      
      // Create initial version
      await prisma.journeyVersion.create({
        data: {
          journeyId: journey.id,
          version: 1,
          snapshot: {},
          changeLog: 'Migrated from Airtable'
        }
      });
      
      console.log(`  ✓ ${journey.name}`);
    } catch (error) {
      console.error(`  ✗ Failed to migrate journey ${fields['Journey Name']}:`, error.message);
    }
  }
  
  console.log(`  Migrated ${mappings.journeys.size} journeys\n`);
}

async function migrateTouchpoints() {
  console.log('📍 Migrating Touchpoints...');
  
  const records = await fetchFromAirtable('Touchpoints');
  console.log(`  Found ${records.length} touchpoints in Airtable`);

  for (const record of records) {
    const fields = record.fields;
    
    // Find linked journey
    const journeyAirtableId = fields.Journey?.[0];
    const journeyId = journeyAirtableId ? mappings.journeys.get(journeyAirtableId) : null;
    
    if (!journeyId) {
      console.warn(`  ⚠️  Skipping touchpoint ${fields['Internal Name']} - no journey mapping`);
      continue;
    }

    const content = parseContent(fields['Body Content']);

    try {
      const touchpoint = await prisma.touchpoint.create({
        data: {
          journeyId: journeyId,
          name: fields['Internal Name'] || 'Unnamed Touchpoint',
          type: mapTouchpointType(fields.Type),
          orderIndex: fields.Day || fields.Order || 0,
          content: {
            subject: fields.Subject || '',
            ...content
          },
          config: fields.Config ? parseContent(fields.Config) : {},
          position: fields.Position ? parseContent(fields.Position) : null,
          ghlTemplateId: fields['GHL Template ID'] || null,
          status: mapStatus(fields.Status, 'touchpoint'),
          nextTouchpointId: fields['Next Touchpoint']?.[0] 
            ? mappings.touchpoints.get(fields['Next Touchpoint'][0]) 
            : null
        }
      });
      
      mappings.touchpoints.set(record.id, touchpoint.id);
    } catch (error) {
      console.error(`  ✗ Failed to migrate touchpoint ${fields['Internal Name']}:`, error.message);
    }
  }
  
  console.log(`  Migrated ${mappings.touchpoints.size} touchpoints\n`);
}

async function migrateTemplates() {
  console.log('📄 Migrating Templates...');
  
  const records = await fetchFromAirtable('Templates');
  console.log(`  Found ${records.length} templates in Airtable`);

  for (const record of records) {
    const fields = record.fields;
    
    // Find linked client (optional)
    const clientAirtableId = fields.Client?.[0];
    const clientId = clientAirtableId ? mappings.clients.get(clientAirtableId) : null;

    try {
      const template = await prisma.template.create({
        data: {
          clientId: clientId,
          name: fields['Template Name'] || 'Unnamed Template',
          type: (fields['Template Type']?.toLowerCase() === 'sms') ? 'sms' : 'email',
          ghlTemplateId: fields['GHL Template ID'] || null,
          content: fields.Content ? parseContent(fields.Content) : {},
          variables: fields.Variables || [],
          status: fields.Status?.toLowerCase() || 'draft',
          syncStatus: fields['Sync Status'] || null,
          lastSynced: fields['Last Synced'] ? new Date(fields['Last Synced']) : null
        }
      });
      
      mappings.templates.set(record.id, template.id);
      console.log(`  ✓ ${template.name}`);
    } catch (error) {
      console.error(`  ✗ Failed to migrate template ${fields['Template Name']}:`, error.message);
    }
  }
  
  console.log(`  Migrated ${mappings.templates.size} templates\n`);
}

async function migrateWorkflows() {
  console.log('⚙️  Migrating Workflows...');
  
  const records = await fetchFromAirtable('Workflows');
  console.log(`  Found ${records.length} workflows in Airtable`);

  for (const record of records) {
    const fields = record.fields;
    
    // Find linked client
    const clientAirtableId = fields.Client?.[0];
    const clientId = clientAirtableId ? mappings.clients.get(clientAirtableId) : null;
    
    if (!clientId) {
      console.warn(`  ⚠️  Skipping workflow ${fields['Workflow Name']} - no client mapping`);
      continue;
    }

    try {
      await prisma.workflow.create({
        data: {
          clientId: clientId,
          name: fields['Workflow Name'] || 'Unnamed Workflow',
          workflowId: fields['Workflow ID'] || null,
          status: fields.Status?.toLowerCase() || 'active',
          trigger: fields.Trigger ? parseContent(fields.Trigger) : {},
          actions: fields.Actions ? parseContent(fields.Actions) : [],
          notes: fields.Notes ? parseContent(fields.Notes) : null
        }
      });
      
      console.log(`  ✓ ${fields['Workflow Name']}`);
    } catch (error) {
      console.error(`  ✗ Failed to migrate workflow ${fields['Workflow Name']}:`, error.message);
    }
  }
  
  console.log(`  Migrated workflows\n`);
}

async function migrateSyncHistory() {
  console.log('📊 Migrating Sync History...');
  
  const records = await fetchFromAirtable('Sync History');
  console.log(`  Found ${records.length} sync history records in Airtable`);

  for (const record of records) {
    const fields = record.fields;
    
    // Find linked client
    const clientAirtableId = fields.Client?.[0];
    const clientId = clientAirtableId ? mappings.clients.get(clientAirtableId) : null;

    try {
      await prisma.syncHistory.create({
        data: {
          clientId: clientId,
          operation: fields.Operation || 'unknown',
          status: fields.Status || 'unknown',
          itemsSynced: fields['Items Synced'] || 0,
          errors: fields.Errors || null,
          metadata: {
            airtableId: record.id
          },
          createdAt: fields['Created'] ? new Date(fields['Created']) : new Date()
        }
      });
    } catch (error) {
      console.error(`  ✗ Failed to migrate sync history record:`, error.message);
    }
  }
  
  console.log(`  Migrated sync history\n`);
}

async function logMigration() {
  await prisma.migrationLog.create({
    data: {
      operation: 'MIGRATE_AIRTABLE_TO_POSTGRES',
      status: 'completed',
      details: {
        clients: mappings.clients.size,
        journeys: mappings.journeys.size,
        touchpoints: mappings.touchpoints.size,
        templates: mappings.templates.size,
        pipelines: mappings.pipelines.size,
        timestamp: new Date().toISOString()
      }
    }
  });
}

async function verifyMigration() {
  console.log('🔍 Verifying Migration...\n');
  
  const counts = await Promise.all([
    prisma.client.count(),
    prisma.pipeline.count(),
    prisma.journey.count(),
    prisma.touchpoint.count(),
    prisma.template.count(),
    prisma.workflow.count()
  ]);
  
  console.log('  Database counts:');
  console.log(`    Clients:     ${counts[0]}`);
  console.log(`    Pipelines:   ${counts[1]}`);
  console.log(`    Journeys:    ${counts[2]}`);
  console.log(`    Touchpoints: ${counts[3]}`);
  console.log(`    Templates:   ${counts[4]}`);
  console.log(`    Workflows:   ${counts[5]}`);
  
  return {
    clients: counts[0],
    pipelines: counts[1],
    journeys: counts[2],
    touchpoints: counts[3],
    templates: counts[4],
    workflows: counts[5]
  };
}

// Main migration function
async function migrate() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Airtable to PostgreSQL Migration                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  if (!AIRTABLE_API_KEY) {
    console.error('❌ Error: AIRTABLE_API_KEY environment variable is required');
    process.exit(1);
  }

  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Connected to PostgreSQL\n');

    // Run migrations in order
    await migrateClients();
    await migratePipelines();
    await migrateJourneys();
    await migrateTouchpoints();
    await migrateTemplates();
    await migrateWorkflows();
    await migrateSyncHistory();
    
    // Log migration
    await logMigration();
    
    // Verify
    const counts = await verifyMigration();
    
    console.log('\n✅ Migration completed successfully!');
    console.log(`\nTotal records migrated:`);
    console.log(`  Clients:     ${counts.clients}`);
    console.log(`  Pipelines:   ${counts.pipelines}`);
    console.log(`  Journeys:    ${counts.journeys}`);
    console.log(`  Touchpoints: ${counts.touchpoints}`);
    console.log(`  Templates:   ${counts.templates}`);
    console.log(`  Workflows:   ${counts.workflows}`);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate();
}

export { migrate };