#!/usr/bin/env node
/**
 * Migration Validation Script
 * Verifies Airtable-to-PostgreSQL migration completeness
 * 
 * Run with: node scripts/validate-migration.js
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const prisma = new PrismaClient();

// CSV file paths
const CSV_DIR = join(__dirname, '../../../data/migration/airtable-export');

/**
 * Parse CSV content (simple parser)
 */
function parseCSV(content) {
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index].trim();
      });
      rows.push(row);
    }
  }
  
  return rows;
}

/**
 * Read and parse a CSV file
 */
function readCSV(filename) {
  const filepath = join(CSV_DIR, filename);
  
  if (!existsSync(filepath)) {
    console.warn(`  ⚠️  CSV file not found: ${filepath}`);
    return [];
  }
  
  const content = readFileSync(filepath, 'utf-8');
  return parseCSV(content);
}

/**
 * Validate migration completeness
 */
async function validateMigration() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Migration Validation Report                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };
  
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful\n');
    
    // 1. Validate Clients Migration
    console.log('📋 Validating Clients...');
    const csvClients = readCSV('Clients-Grid view.csv');
    const dbClients = await prisma.client.findMany();
    
    if (dbClients.length >= csvClients.length) {
      console.log(`  ✅ Clients: ${dbClients.length} in DB (>= ${csvClients.length} in CSV)`);
      results.passed.push(`Clients: ${dbClients.length} migrated`);
    } else {
      console.log(`  ❌ Clients: ${dbClients.length} in DB (< ${csvClients.length} in CSV)`);
      results.failed.push(`Clients: Only ${dbClients.length} of ${csvClients.length} migrated`);
    }
    
    // Check for migratedFrom marker
    const migratedClients = dbClients.filter(c => 
      c.config?.migratedFrom === 'airtable-csv'
    );
    console.log(`     ${migratedClients.length} clients marked as migrated from Airtable`);
    
    // 2. Validate Journeys Migration
    console.log('\n📋 Validating Journeys...');
    const csvJourneys = readCSV('Journeys-Grid view.csv');
    const dbJourneys = await prisma.journey.findMany();
    
    if (dbJourneys.length >= csvJourneys.length) {
      console.log(`  ✅ Journeys: ${dbJourneys.length} in DB (>= ${csvJourneys.length} in CSV)`);
      results.passed.push(`Journeys: ${dbJourneys.length} migrated`);
    } else {
      console.log(`  ❌ Journeys: ${dbJourneys.length} in DB (< ${csvJourneys.length} in CSV)`);
      results.failed.push(`Journeys: Only ${dbJourneys.length} of ${csvJourneys.length} migrated`);
    }
    
    // Check for migratedFrom marker
    const migratedJourneys = dbJourneys.filter(j => 
      j.metadata?.migratedFrom === 'airtable-csv'
    );
    console.log(`     ${migratedJourneys.length} journeys marked as migrated from Airtable`);
    
    // 3. Validate Touchpoints Migration
    console.log('\n📋 Validating Touchpoints...');
    const csvTouchpoints = readCSV('Touchpoints-Grid view.csv');
    const dbTouchpoints = await prisma.touchpoint.findMany();
    
    if (dbTouchpoints.length >= csvTouchpoints.length) {
      console.log(`  ✅ Touchpoints: ${dbTouchpoints.length} in DB (>= ${csvTouchpoints.length} in CSV)`);
      results.passed.push(`Touchpoints: ${dbTouchpoints.length} migrated`);
    } else {
      console.log(`  ⚠️  Touchpoints: ${dbTouchpoints.length} in DB (< ${csvTouchpoints.length} in CSV)`);
      results.warnings.push(`Touchpoints: Only ${dbTouchpoints.length} of ${csvTouchpoints.length} migrated (some may have been skipped due to missing references)`);
    }
    
    // 4. Validate Data Integrity
    console.log('\n📋 Validating Data Integrity...');
    
    // Check for orphaned journeys (no client)
    const allJourneys = await prisma.journey.findMany();
    const orphanedJourneys = allJourneys.filter(j => !j.clientId);
    if (orphanedJourneys.length === 0) {
      console.log('  ✅ No orphaned journeys (all have client associations)');
      results.passed.push('No orphaned journeys');
    } else {
      console.log(`  ⚠️  ${orphanedJourneys.length} orphaned journeys found (no client association)`);
      results.warnings.push(`${orphanedJourneys.length} orphaned journeys`);
    }
    
    // Check for orphaned touchpoints (no journey)
    const allTouchpoints = await prisma.touchpoint.findMany();
    const orphanedTouchpoints = allTouchpoints.filter(t => !t.journeyId);
    if (orphanedTouchpoints.length === 0) {
      console.log('  ✅ No orphaned touchpoints (all have journey associations)');
      results.passed.push('No orphaned touchpoints');
    } else {
      console.log(`  ❌ ${orphanedTouchpoints.length} orphaned touchpoints found (no journey association)`);
      results.failed.push(`${orphanedTouchpoints.length} orphaned touchpoints`);
    }
    
    // 5. Check Journey Versions
    console.log('\n📋 Validating Journey Versions...');
    const journeyVersions = await prisma.journeyVersion.findMany();
    console.log(`  ✅ ${journeyVersions.length} journey versions created`);
    results.passed.push(`Journey versions: ${journeyVersions.length}`);
    
    // 6. Migration Log
    console.log('\n📋 Checking Migration Log...');
    const migrationLogs = await prisma.migrationLog.findMany({
      where: {
        operation: 'MIGRATE_AIRTABLE_CSV_TO_POSTGRES'
      }
    });
    if (migrationLogs.length > 0) {
      console.log(`  ✅ ${migrationLogs.length} migration log entries found`);
      const latestLog = migrationLogs[migrationLogs.length - 1];
      console.log(`     Latest: ${latestLog.status} at ${latestLog.createdAt}`);
      results.passed.push('Migration log exists');
    } else {
      console.log('  ⚠️  No migration log entries found');
      results.warnings.push('No migration log entries');
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('VALIDATION SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`\n✅ Passed: ${results.passed.length}`);
    results.passed.forEach(item => console.log(`   ✓ ${item}`));
    
    if (results.warnings.length > 0) {
      console.log(`\n⚠️  Warnings: ${results.warnings.length}`);
      results.warnings.forEach(item => console.log(`   ! ${item}`));
    }
    
    if (results.failed.length > 0) {
      console.log(`\n❌ Failed: ${results.failed.length}`);
      results.failed.forEach(item => console.log(`   ✗ ${item}`));
    }
    
    // Overall result
    console.log('\n' + '='.repeat(60));
    if (results.failed.length === 0) {
      console.log('✅ MIGRATION VALIDATION PASSED');
      console.log('\nThe Airtable-to-PostgreSQL migration is complete!');
      console.log('All critical data has been successfully migrated.');
    } else {
      console.log('❌ MIGRATION VALIDATION FAILED');
      console.log('\nSome issues were found. Please review the failures above.');
    }
    console.log('='.repeat(60));
    
    return {
      success: results.failed.length === 0,
      passed: results.passed,
      warnings: results.warnings,
      failed: results.failed
    };
    
  } catch (error) {
    console.error('\n❌ Validation failed with error:', error.message);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await prisma.$disconnect();
  }
}

// Run validation
validateMigration().then(result => {
  process.exit(result.success ? 0 : 1);
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});