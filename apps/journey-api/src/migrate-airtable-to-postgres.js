#!/usr/bin/env node
/**
 * Airtable CSV to PostgreSQL Migration Script
 * 
 * This script migrates data from exported Airtable CSV files to PostgreSQL.
 * Run with: node apps/journey-api/src/migrate-airtable-to-postgres.js
 * 
 * Prerequisites:
 * - CSV files in data/migration/airtable-export/
 * - PostgreSQL database with Prisma schema migrated
 * - DATABASE_URL environment variable set
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from api directory
const apiEnvPath = join(__dirname, '../.env');
dotenv.config({ path: apiEnvPath });

const prisma = new PrismaClient();

// CSV file paths (relative to project root)
const CSV_DIR = join(__dirname, '../../../data/migration/airtable-export');
const CSV_FILES = {
  clients: join(CSV_DIR, 'Clients-Grid view.csv'),
  journeys: join(CSV_DIR, 'Journeys-Grid view.csv'),
  touchpoints: join(CSV_DIR, 'Touchpoints-Grid view.csv'),
  pipelines: join(CSV_DIR, 'Pipelines-Grid view.csv'),
  approvals: join(CSV_DIR, 'Approvals-Grid view.csv'),
  versions: join(CSV_DIR, 'Versions-Grid view.csv')
};

// ID mappings for referential integrity
const mappings = {
  clients: new Map(),      // name -> uuid
  journeys: new Map(),     // name -> uuid
  touchpoints: new Map(),  // name -> uuid
  pipelines: new Map()     // name -> uuid
};

// Track issues for reporting
const issues = {
  missingFields: [],
  brokenLinks: [],
  dataTransforms: [],
  skipped: []
};

/**
 * Simple CSV parser that handles:
 * - Quoted fields with commas
 * - BOM character at start of file
 * - Different line endings
 */
function parseCSV(content) {
  // Remove BOM if present
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return [];
  
  // Parse header
  const headers = parseCSVLine(lines[0]);
  
  // Parse rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index];
      });
      rows.push(row);
    }
  }
  
  return rows;
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  result.push(current.trim());
  
  return result;
}

/**
 * Read and parse a CSV file
 */
function readCSV(filename) {
  const filepath = CSV_FILES[filename];
  
  if (!existsSync(filepath)) {
    console.warn(`  ⚠️  CSV file not found: ${filepath}`);
    return [];
  }
  
  const content = readFileSync(filepath, 'utf-8');
  return parseCSV(content);
}

/**
 * Generate a URL-safe slug from a name
 */
function generateSlug(name) {
  if (!name) return `untitled-${Date.now()}`;
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 100);
}

/**
 * Map Airtable status to PostgreSQL status for clients
 */
function mapClientStatus(airtableStatus) {
  const statusMap = {
    'Active': 'active',
    'Inactive': 'inactive',
    'Onboarding': 'onboarding',
    'Archived': 'archived'
  };
  return statusMap[airtableStatus] || 'active';
}

/**
 * Map Airtable status to PostgreSQL status for journeys
 */
function mapJourneyStatus(airtableStatus) {
  const statusMap = {
    'Draft': 'draft',
    'In Review': 'client_review',
    'Active': 'published',
    'Paused': 'archived',
    'Approved': 'approved',
    'Rejected': 'rejected'
  };
  return statusMap[airtableStatus] || 'draft';
}

/**
 * Map Airtable status to PostgreSQL status for touchpoints
 */
function mapTouchpointStatus(airtableStatus) {
  const statusMap = {
    'Draft': 'draft',
    'Approved': 'approved',
    'Published': 'published'
  };
  return statusMap[airtableStatus] || 'draft';
}

/**
 * Map journey type/category
 */
function mapCategory(airtableType) {
  const categoryMap = {
    'Wedding': 'wedding',
    'Corporate': 'corporate',
    'Event': 'event',
    'Inquiry': 'inquiry',
    'Nurture': 'nurture'
  };
  return categoryMap[airtableType] || 'nurture';
}

/**
 * Map touchpoint type
 */
function mapTouchpointType(type) {
  const typeMap = {
    'Email': 'email',
    'SMS': 'sms',
    'Task': 'task',
    'Wait': 'wait',
    'Condition': 'condition',
    'Trigger': 'trigger'
  };
  return typeMap[type] || 'email';
}

/**
 * Find client by name pattern matching
 */
function findClientByName(clientName) {
  if (!clientName) return null;
  
  // Direct match
  if (mappings.clients.has(clientName)) {
    return mappings.clients.get(clientName);
  }
  
  // Try to find by partial match
  for (const [name, id] of mappings.clients) {
    if (clientName.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(clientName.toLowerCase())) {
      return id;
    }
  }
  
  return null;
}

/**
 * Find journey by name pattern matching
 */
function findJourneyByName(journeyName) {
  if (!journeyName) return null;
  
  // Direct match
  if (mappings.journeys.has(journeyName)) {
    return mappings.journeys.get(journeyName);
  }
  
  // Try to find by partial match
  for (const [name, id] of mappings.journeys) {
    if (journeyName.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(journeyName.toLowerCase())) {
      return id;
    }
  }
  
  return null;
}

/**
 * Detect which client a touchpoint belongs to based on content
 */
function detectClientFromTouchpoint(row) {
  const name = row['Internal Name'] || '';
  const subject = row['Subject'] || '';
  const body = row['Body Content'] || '';
  const combined = `${name} ${subject} ${body}`.toLowerCase();
  
  // Check for known client patterns
  for (const [clientName, clientId] of mappings.clients) {
    const searchName = clientName.toLowerCase();
    // Check for venue name mentions
    if (combined.includes(searchName) || 
        combined.includes(searchName.replace(/\s+/g, '-')) ||
        combined.includes(searchName.replace(/\s+/g, ''))) {
      return clientId;
    }
  }
  
  // Fallback: Check for signature patterns (e.g., "Lisa from Cameron Estate")
  if (combined.includes('cameron estate') || (combined.includes('lisa') && combined.includes('estate'))) {
    const cameronClient = mappings.clients.get('Cameron Estate Inn');
    if (cameronClient) return cameronClient;
  }
  
  if (combined.includes('maison albion')) {
    const maisonClient = mappings.clients.get('Maison Albion');
    if (maisonClient) return maisonClient;
  }
  
  // Check for Promise Farm patterns
  if (combined.includes('promise farm') || combined.includes('promisefarm')) {
    const pfClient = mappings.clients.get('Promise Farm');
    if (pfClient) return pfClient;
  }
  
  return null;
}

/**
 * Detect which journey a touchpoint belongs to based on patterns
 */
function detectJourneyFromTouchpoint(row, clientId) {
  const name = row['Internal Name'] || '';
  const day = row['Day'];
  
  // Try to match by day pattern in journey name
  for (const [journeyName, journeyId] of mappings.journeys) {
    // Check if this touchpoint's day pattern matches journey naming
    if (name.toLowerCase().includes('day') && day) {
      // Day-based touchpoint likely belongs to a nurture journey
      if (journeyName.toLowerCase().includes('nurture') || 
          journeyName.toLowerCase().includes('sequence')) {
        return journeyId;
      }
    }
  }
  
  // If we have a client, try to find their journey
  if (clientId) {
    for (const [journeyName, journeyId] of mappings.journeys) {
      // For now, return the first journey for this client
      // This is a heuristic that may need adjustment
      return journeyId;
    }
  }
  
  return null;
}

/**
 * Migrate Clients from CSV
 */
async function migrateClients() {
  console.log('📦 Migrating Clients from CSV...');
  
  const rows = readCSV('clients');
  console.log(`  Found ${rows.length} clients in CSV`);
  
  for (const row of rows) {
    const name = row['Name'];
    if (!name) {
      issues.skipped.push({ type: 'client', reason: 'Missing name', row });
      continue;
    }
    
    try {
      const client = await prisma.client.create({
        data: {
          slug: generateSlug(name),
          name: name,
          locationId: row['Location ID'] || null,
          ghlLocationId: row['PIT Token'] || null,
          website: row['Website'] || null,
          status: mapClientStatus(row['Status']),
          settings: {},
          config: {
            notes: row['Notes'] || '',
            industry: '',
            migratedFrom: 'airtable-csv'
          }
        }
      });
      
      mappings.clients.set(name, client.id);
      console.log(`  ✓ ${client.name}`);
    } catch (error) {
      if (error.code === 'P2002') {
        // Unique constraint violation - try to find existing
        const existing = await prisma.client.findFirst({
          where: { name: name }
        });
        if (existing) {
          mappings.clients.set(name, existing.id);
          console.log(`  ⟳ ${name} (already exists)`);
        }
      } else {
        console.error(`  ✗ Failed to migrate client ${name}:`, error.message);
        issues.brokenLinks.push({ type: 'client', name, error: error.message });
      }
    }
  }
  
  console.log(`  Migrated ${mappings.clients.size} clients\n`);
}

/**
 * Migrate Journeys from CSV
 * Enhanced to handle orphan journeys by analyzing touchpoint content
 */
async function migrateJourneys() {
  console.log('🗺️  Migrating Journeys from CSV...');
  
  const rows = readCSV('journeys');
  console.log(`  Found ${rows.length} journeys in CSV`);
  
  // First pass: process journeys with explicit client links
  for (const row of rows) {
    const name = row['Journey Name'];
    if (!name) {
      issues.skipped.push({ type: 'journey', reason: 'Missing name', row });
      continue;
    }
    
    // Try to find linked client
    let clientId = null;
    const clientField = row['Client'];
    
    if (clientField) {
      clientId = findClientByName(clientField);
    }
    
    // If no client found, try to infer from journey name
    if (!clientId) {
      for (const [clientName, id] of mappings.clients) {
        if (name.toLowerCase().includes(clientName.toLowerCase())) {
          clientId = id;
          issues.dataTransforms.push({
            type: 'journey-client-link',
            journey: name,
            inferredClient: clientName,
            method: 'name-match'
          });
          break;
        }
      }
    }
    
    // If still no client, create as orphan (will try to fix later with touchpoint analysis)
    if (!clientId) {
      console.warn(`  ⚠️  Journey "${name}" has no client link - will try to infer from touchpoints`);
      issues.brokenLinks.push({ 
        type: 'journey', 
        name, 
        reason: 'No client found - will analyze touchpoints for inference' 
      });
      // Store for later analysis
      mappings.pendingJourneys = mappings.pendingJourneys || [];
      mappings.pendingJourneys.push({ name, row });
      continue;
    }
    
    try {
      const journey = await prisma.journey.create({
        data: {
          clientId: clientId,
          name: name,
          slug: generateSlug(name),
          description: row['Description'] || null,
          category: mapCategory(row['Type']),
          status: mapJourneyStatus(row['Status']),
          version: 1,
          triggerConfig: null,
          goal: null,
          metadata: {
            tags: row['Tags'] ? row['Tags'].split(',').map(t => t.trim()) : [],
            migratedFrom: 'airtable-csv'
          }
        }
      });
      
      mappings.journeys.set(name, journey.id);
      
      // Create initial version
      await prisma.journeyVersion.create({
        data: {
          journeyId: journey.id,
          version: 1,
          snapshot: {},
          changeLog: 'Migrated from Airtable CSV export'
        }
      });
      
      console.log(`  ✓ ${journey.name}`);
    } catch (error) {
      if (error.code === 'P2002') {
        // Unique constraint violation - try to find existing
        const existing = await prisma.journey.findFirst({
          where: { name: name }
        });
        if (existing) {
          mappings.journeys.set(name, existing.id);
          console.log(`  ⟳ ${name} (already exists)`);
        }
      } else {
        console.error(`  ✗ Failed to migrate journey ${name}:`, error.message);
        issues.brokenLinks.push({ type: 'journey', name, error: error.message });
      }
    }
  }
  
  // Second pass: handle orphan journeys by creating them with inferred clients from touchpoints
  if (mappings.pendingJourneys && mappings.pendingJourneys.length > 0) {
    console.log(`  Processing ${mappings.pendingJourneys.length} orphan journeys...`);
    
    // Read touchpoints to analyze content
    const touchpointRows = readCSV('touchpoints');
    
    for (const pending of mappings.pendingJourneys) {
      // Try to infer client from touchpoint content
      let inferredClientId = null;
      let inferredClientName = null;
      
      // Analyze touchpoints for this journey (by name pattern)
      for (const tp of touchpointRows) {
        const tpName = tp['Internal Name'] || '';
        const tpSubject = tp['Subject'] || '';
        const tpBody = tp['Body Content'] || '';
        const combined = `${tpName} ${tpSubject} ${tpBody}`.toLowerCase();
        
        // Check each client
        for (const [clientName, clientId] of mappings.clients) {
          if (combined.includes(clientName.toLowerCase()) ||
              (clientName === 'Cameron Estate Inn' && combined.includes('cameron estate'))) {
            inferredClientId = clientId;
            inferredClientName = clientName;
            break;
          }
        }
        if (inferredClientId) break;
      }
      
      if (inferredClientId) {
        // Create the journey with inferred client
        try {
          const row = pending.row;
          const journey = await prisma.journey.create({
            data: {
              clientId: inferredClientId,
              name: pending.name,
              slug: generateSlug(pending.name),
              description: row['Description'] || null,
              category: mapCategory(row['Type']),
              status: mapJourneyStatus(row['Status']),
              version: 1,
              metadata: {
                tags: row['Tags'] ? row['Tags'].split(',').map(t => t.trim()) : [],
                migratedFrom: 'airtable-csv',
                inferredFromTouchpoints: true
              }
            }
          });
          
          mappings.journeys.set(pending.name, journey.id);
          
          await prisma.journeyVersion.create({
            data: {
              journeyId: journey.id,
              version: 1,
              snapshot: {},
              changeLog: 'Migrated from Airtable CSV export (client inferred from touchpoints)'
            }
          });
          
          issues.dataTransforms.push({
            type: 'journey-client-link-inferred',
            journey: pending.name,
            inferredClient: inferredClientName,
            method: 'touchpoint-content-analysis'
          });
          
          console.log(`  ✓ ${journey.name} (inferred client: ${inferredClientName})`);
        } catch (error) {
          console.error(`  ✗ Failed to create journey ${pending.name}:`, error.message);
        }
      } else {
        // Still can't find client - skip but keep record
        console.warn(`  ⚠️  Could not infer client for journey "${pending.name}" - skipping`);
      }
    }
  }
  
  console.log(`  Migrated ${mappings.journeys.size} journeys\n`);
}

/**
 * Migrate Touchpoints from CSV
 * Enhanced to better match touchpoints to journeys
 */
async function migrateTouchpoints() {
  console.log('📍 Migrating Touchpoints from CSV...');
  
  const rows = readCSV('touchpoints');
  console.log(`  Found ${rows.length} touchpoints in CSV`);
  
  // Group touchpoints by detected client/journey for better assignment
  const touchpointsByClient = new Map();
  
  for (const row of rows) {
    const name = row['Internal Name'];
    if (!name) {
      issues.skipped.push({ type: 'touchpoint', reason: 'Missing name', row });
      continue;
    }
    
    // Try to detect client from content
    const clientId = detectClientFromTouchpoint(row);
    if (clientId) {
      if (!touchpointsByClient.has(clientId)) {
        touchpointsByClient.set(clientId, []);
      }
      touchpointsByClient.get(clientId).push(row);
    } else {
      // No client detected - add to issues
      issues.brokenLinks.push({ 
        type: 'touchpoint', 
        name, 
        reason: 'Could not detect client from content' 
      });
    }
  }
  
  // Now migrate touchpoints, assigning them to journeys
  let migratedCount = 0;
  
  for (const [clientId, clientTouchpoints] of touchpointsByClient) {
    // Find journeys for this client - from both existing DB and newly migrated
    const clientJourneys = [];
    
    // Check migrations mappings first
    for (const [journeyName, journeyId] of mappings.journeys) {
      const journey = await prisma.journey.findUnique({
        where: { id: journeyId },
        select: { clientId: true, name: true }
      });
      if (journey && journey.clientId === clientId) {
        clientJourneys.push({ name: journeyName, id: journeyId });
      }
    }
    
    // Also check existing journeys in DB for this client
    const existingJourneys = await prisma.journey.findMany({
      where: { clientId: clientId },
      select: { id: true, name: true }
    });
    
    for (const j of existingJourneys) {
      if (!clientJourneys.find(cj => cj.id === j.id)) {
        clientJourneys.push({ name: j.name, id: j.id });
      }
    }
    
    // Get client name for logging
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { name: true }
    });
    const clientName = client?.name || 'unknown';
    
    // If no journeys exist for this client, try to create one
    let defaultJourneyId = clientJourneys.length > 0 ? clientJourneys[0].id : null;
    
    if (!defaultJourneyId) {
      console.log(`  Creating new journey for client "${clientName}" to hold touchpoints...`);
      try {
        const newJourney = await prisma.journey.create({
          data: {
            clientId: clientId,
            name: `${clientName} Nurture Sequence`,
            slug: generateSlug(`${clientName} Nurture Sequence`),
            category: 'nurture',
            status: 'draft',
            version: 1,
            metadata: {
              migratedFrom: 'airtable-csv',
              autoCreated: true
            }
          }
        });
        
        await prisma.journeyVersion.create({
          data: {
            journeyId: newJourney.id,
            version: 1,
            snapshot: {},
            changeLog: 'Auto-created from Airtable CSV migration'
          }
        });
        
        defaultJourneyId = newJourney.id;
        clientJourneys.push({ name: newJourney.name, id: newJourney.id });
        mappings.journeys.set(newJourney.name, newJourney.id);
        console.log(`  ✓ Created journey: ${newJourney.name}`);
      } catch (error) {
        console.error(`  ✗ Failed to create journey for ${clientName}:`, error.message);
      }
    }
    
    for (const row of clientTouchpoints) {
      const name = row['Internal Name'];
      
      // Determine journey - try to match by content patterns
      let journeyId = defaultJourneyId;
      
      // Check if touchpoint name contains journey hints
      for (const journey of clientJourneys) {
        if (name.toLowerCase().includes('nurture') && 
            journey.name.toLowerCase().includes('nurture')) {
          journeyId = journey.id;
          break;
        }
        if ((name.toLowerCase().includes('wedding') || name.toLowerCase().includes('welcome')) && 
            journey.name.toLowerCase().includes('wedding')) {
          journeyId = journey.id;
          break;
        }
      }
      
      if (!journeyId) {
        console.warn(`  ⚠️  Skipping touchpoint ${name} - no journey found`);
        continue;
      }
      
      const day = parseInt(row['Day']) || 0;
      const order = parseInt(row['Order']) || day || 0;
      
      try {
        const touchpoint = await prisma.touchpoint.create({
          data: {
            journeyId: journeyId,
            name: name,
            type: mapTouchpointType(row['Type']),
            orderIndex: order,
            content: {
              subject: row['Subject'] || '',
              body: row['Body Content'] || ''
            },
            config: {},
            position: null,
            ghlTemplateId: row['GHL Template ID'] || null,
            status: mapTouchpointStatus(row['Status'])
          }
        });
        
        mappings.touchpoints.set(name, touchpoint.id);
        migratedCount++;
      } catch (error) {
        // Check for duplicate - might already exist
        if (error.code === 'P2002') {
          const existing = await prisma.touchpoint.findFirst({
            where: { name: name, journeyId: journeyId }
          });
          if (existing) {
            mappings.touchpoints.set(name, existing.id);
            console.log(`  ⟳ ${name} (already exists in this journey)`);
          }
        } else {
          console.error(`  ✗ Failed to migrate touchpoint ${name}:`, error.message);
          issues.brokenLinks.push({ type: 'touchpoint', name, error: error.message });
        }
      }
    }
  }
  
  console.log(`  Migrated ${migratedCount} touchpoints\n`);
}

/**
 * Log migration results
 */
async function logMigration() {
  try {
    await prisma.migrationLog.create({
      data: {
        operation: 'MIGRATE_AIRTABLE_CSV_TO_POSTGRES',
        status: 'completed',
        details: {
          clients: mappings.clients.size,
          journeys: mappings.journeys.size,
          touchpoints: mappings.touchpoints.size,
          pipelines: mappings.pipelines.size,
          issues: issues,
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    // Migration log table might not exist
    console.warn('  ⚠️  Could not create migration log:', error.message);
  }
}

/**
 * Verify migration results
 */
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

/**
 * Print migration issues report
 */
function printIssuesReport() {
  console.log('\n📋 Migration Issues Report:');
  console.log('='.repeat(50));
  
  if (issues.missingFields.length > 0) {
    console.log(`\n⚠️  Missing Fields (${issues.missingFields.length}):`);
    issues.missingFields.slice(0, 5).forEach(issue => {
      console.log(`   - ${issue.type}: ${issue.reason}`);
    });
  }
  
  if (issues.brokenLinks.length > 0) {
    console.log(`\n🔗 Broken Links (${issues.brokenLinks.length}):`);
    issues.brokenLinks.slice(0, 10).forEach(issue => {
      console.log(`   - ${issue.type} "${issue.name}": ${issue.reason || issue.error}`);
    });
  }
  
  if (issues.dataTransforms.length > 0) {
    console.log(`\n🔄 Data Transforms (${issues.dataTransforms.length}):`);
    issues.dataTransforms.slice(0, 10).forEach(issue => {
      console.log(`   - ${issue.type}: ${JSON.stringify(issue)}`);
    });
  }
  
  if (issues.skipped.length > 0) {
    console.log(`\n⏭️  Skipped Records (${issues.skipped.length}):`);
    issues.skipped.slice(0, 5).forEach(issue => {
      console.log(`   - ${issue.type}: ${issue.reason}`);
    });
  }
  
  if (issues.missingFields.length === 0 && 
      issues.brokenLinks.length === 0 && 
      issues.skipped.length === 0) {
    console.log('\n✅ No issues found!');
  }
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Airtable CSV to PostgreSQL Migration                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // Check for DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL environment variable is required');
    process.exit(1);
  }

  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Connected to PostgreSQL\n');

    // Check CSV directory exists
    if (!existsSync(CSV_DIR)) {
      console.error(`❌ Error: CSV directory not found: ${CSV_DIR}`);
      process.exit(1);
    }
    console.log(`📁 Reading CSVs from: ${CSV_DIR}\n`);

    // Run migrations in order
    await migrateClients();
    await migrateJourneys();
    await migrateTouchpoints();
    
    // Log migration
    await logMigration();
    
    // Verify
    const counts = await verifyMigration();
    
    // Print issues report
    printIssuesReport();
    
    console.log('\n✅ Migration completed!');
    console.log(`\n📊 Summary:`);
    console.log(`  Clients:     ${mappings.clients.size} migrated`);
    console.log(`  Journeys:    ${mappings.journeys.size} migrated`);
    console.log(`  Touchpoints: ${mappings.touchpoints.size} migrated`);
    
    if (issues.brokenLinks.length > 0 || issues.skipped.length > 0) {
      console.log(`\n⚠️  Note: Some records had issues. Review the report above.`);
    }
    
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

export { migrate, parseCSV };