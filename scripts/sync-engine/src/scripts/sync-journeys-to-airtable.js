#!/usr/bin/env node

/**
 * Journey Sync Script
 * Pushes local journey JSON files to Airtable
 * Usage: npm run sync:airtable -- --client=promise-farm
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { globby } from 'globby';
import airtableService from '../services/airtable.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../..');

// Rate limiting configuration
const RATE_LIMIT_DELAY = 200; // ms between requests

/**
 * Sleep utility for rate limiting
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Load client configuration from location-config.json
 */
async function loadClientConfig(clientSlug) {
  const configPath = path.join(repoRoot, 'clients', clientSlug, 'location-config.json');
  try {
    const content = await fs.readFile(configPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load client config for ${clientSlug}: ${error.message}`);
  }
}

/**
 * Load all journey files for a client
 */
async function loadJourneyFiles(clientSlug) {
  const journeysDir = path.join(repoRoot, 'clients', clientSlug, 'journeys');
  
  try {
    const files = await globby('journey*.json', { cwd: journeysDir });
    const journeys = [];
    
    for (const file of files) {
      const filePath = path.join(journeysDir, file);
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const journey = JSON.parse(content);
        journeys.push({ ...journey, _sourceFile: file });
      } catch (error) {
        logger.error(`Failed to load journey file ${file}`, { error: error.message });
      }
    }
    
    return journeys;
  } catch (error) {
    throw new Error(`Failed to load journey files: ${error.message}`);
  }
}

/**
 * Get or create client record in Airtable
 */
async function getOrCreateClient(clientConfig, mockMode = false) {
  if (mockMode) {
    logger.info(`[MOCK] Would get/create client: ${clientConfig.name}`);
    return `mock-client-${Date.now()}`;
  }

  try {
    // Search for existing client by Location ID
    const clients = await airtableService.base('Clients')
      .select({
        filterByFormula: `{Location ID} = '${clientConfig.locationId}'`
      })
      .all();
    
    if (clients.length > 0) {
      logger.info(`Found existing client record: ${clients[0].id}`);
      return clients[0].id;
    }
    
    // Create new client record
    const record = await airtableService.base('Clients').create({
      'Name': clientConfig.name,
      'Location ID': clientConfig.locationId,
      'Website': clientConfig.contact?.website || '',
      'Status': 'Active'
    });
    
    logger.success(`Created new client record: ${record.id}`);
    await sleep(RATE_LIMIT_DELAY);
    return record.id;
  } catch (error) {
    throw new Error(`Failed to get/create client: ${error.message}`);
  }
}

/**
 * Check if journey exists in Airtable
 */
async function findExistingJourney(journeyId, clientRecordId, mockMode = false) {
  if (mockMode) return null;

  try {
    const records = await airtableService.base('Journeys')
      .select({
        filterByFormula: `{Client} = '${clientRecordId}'`
      })
      .all();
    
    // Check by journey ID in the name or description
    return records.find(r => {
      const name = r.get('Journey Name') || r.get('Name') || '';
      const desc = r.get('Description') || '';
      return name.includes(journeyId) || desc.includes(journeyId);
    }) || null;
  } catch (error) {
    logger.error(`Failed to check existing journey`, { error: error.message });
    return null;
  }
}

/**
 * Map category to Type field options
 */
function mapCategoryToType(category) {
  const mapping = {
    'nurture': 'Nurture',
    'follow-up': 'Inquiry',
    'confirmation': 'Event',
    'proposal': 'Wedding',
    'onboarding': 'Onboarding'
  };
  return mapping[category] || 'Nurture';
}

/**
 * Create or update journey in Airtable
 */
async function syncJourney(journey, clientRecordId, options = {}) {
  const { mockMode = false, skipExisting = false } = options;
  
  if (mockMode) {
    logger.info(`[MOCK] Would sync journey: ${journey.name}`);
    return { 
      id: `mock-journey-${Date.now()}`, 
      touchpoints: journey.touchpoints || [], 
      skipped: false 
    };
  }

  const existingJourney = await findExistingJourney(journey.id, clientRecordId);
  
  // Map to Airtable schema fields
  const journeyData = {
    'Journey Name': journey.name,
    'Description': journey.description || '',
    'Client': [clientRecordId],
    'Status': journey.status || 'Draft',
    'Type': mapCategoryToType(journey.category)
  };
  
  try {
    let journeyRecord;
    
    if (existingJourney && !skipExisting) {
      // Update existing journey
      journeyRecord = await airtableService.base('Journeys').update(existingJourney.id, journeyData);
      logger.info(`Updated journey: ${journey.name} (${journeyRecord.id})`);
    } else if (!existingJourney) {
      // Create new journey
      journeyRecord = await airtableService.base('Journeys').create(journeyData);
      logger.success(`Created journey: ${journey.name} (${journeyRecord.id})`);
    } else {
      logger.info(`Skipped existing journey: ${journey.name}`);
      return { id: existingJourney.id, touchpoints: [], skipped: true };
    }
    
    await sleep(RATE_LIMIT_DELAY);
    return { id: journeyRecord.id, touchpoints: journey.touchpoints || [], skipped: false };
  } catch (error) {
    throw new Error(`Failed to sync journey ${journey.name}: ${error.message}`);
  }
}

/**
 * Calculate day number from delay and unit
 */
function calculateDay(delay, delayUnit) {
  if (!delay) return 0;
  
  switch (delayUnit) {
    case 'minutes':
    case 'hours':
      return 0;
    case 'days':
      return delay;
    case 'weeks':
      return delay * 7;
    default:
      return delay;
  }
}

/**
 * Find existing touchpoint
 */
async function findExistingTouchpoint(touchpointId, journeyRecordId, mockMode = false) {
  if (mockMode) return null;

  try {
    const records = await airtableService.base('Touchpoints')
      .select({
        filterByFormula: `{Journey} = '${journeyRecordId}'`
      })
      .all();
    
    // Check by touchpoint ID in the internal name
    return records.find(r => {
      const internalName = r.get('Internal Name') || r.get('Name') || '';
      return internalName.includes(touchpointId);
    }) || null;
  } catch (error) {
    return null;
  }
}

/**
 * Create or update touchpoint in Airtable
 */
async function syncTouchpoint(touchpoint, journeyRecordId, order, options = {}) {
  const { mockMode = false, skipExisting = false } = options;
  
  if (mockMode) {
    logger.success(`[MOCK] Would create touchpoint: ${touchpoint.name}`);
    return { id: `mock-tp-${Date.now()}`, skipped: false };
  }

  const existingTouchpoint = await findExistingTouchpoint(touchpoint.id, journeyRecordId);
  
  // Extract content based on touchpoint type
  let subject = '';
  let bodyContent = '';
  
  if (typeof touchpoint.content === 'object') {
    subject = touchpoint.content.subject || '';
    
    if (touchpoint.content.body) {
      bodyContent = touchpoint.content.body;
    } else if (touchpoint.type === 'SMS' && touchpoint.content.body) {
      bodyContent = touchpoint.content.body;
    }
  } else if (typeof touchpoint.content === 'string') {
    bodyContent = touchpoint.content;
  }
  
  // Map to Airtable Touchpoints schema
  const touchpointData = {
    'Internal Name': touchpoint.name,
    'Journey': [journeyRecordId],
    'Type': touchpoint.type || 'Email',
    'Day': calculateDay(touchpoint.delay, touchpoint.delayUnit),
    'Subject': subject,
    'Body Content': bodyContent,
    'Status': 'Draft'
  };
  
  try {
    let touchpointRecord;
    
    if (existingTouchpoint && !skipExisting) {
      touchpointRecord = await airtableService.base('Touchpoints').update(existingTouchpoint.id, touchpointData);
      logger.info(`  Updated touchpoint: ${touchpoint.name}`);
    } else if (!existingTouchpoint) {
      touchpointRecord = await airtableService.base('Touchpoints').create(touchpointData);
      logger.success(`  Created touchpoint: ${touchpoint.name}`);
    } else {
      logger.info(`  Skipped existing touchpoint: ${touchpoint.name}`);
      return { id: existingTouchpoint.id, skipped: true };
    }
    
    await sleep(RATE_LIMIT_DELAY);
    return { id: touchpointRecord.id, skipped: false };
  } catch (error) {
    logger.error(`Failed to sync touchpoint ${touchpoint.name}`, { error: error.message });
    return { id: null, error: error.message };
  }
}

/**
 * Test Airtable connection with better error handling
 */
async function testAirtableConnection() {
  try {
    console.log(chalk.cyan('Testing Airtable connection...'));
    console.log(chalk.gray(`  Base ID: ${process.env.AIRTABLE_BASE_ID?.substring(0, 10)}...`));
    console.log(chalk.gray(`  API Key: ${process.env.AIRTABLE_API_KEY ? '✓ Set' : '✗ Not set'}`));
    
    const connected = await airtableService.connect();
    
    if (connected) {
      console.log(chalk.green('✓ Connected to Airtable\n'));
      return true;
    } else {
      console.log(chalk.red('✗ Failed to connect to Airtable\n'));
      return false;
    }
  } catch (error) {
    console.log(chalk.red(`✗ Connection error: ${error.message}\n`));
    console.log(chalk.yellow('Troubleshooting tips:'));
    console.log(chalk.gray('  1. Verify AIRTABLE_API_KEY is correct'));
    console.log(chalk.gray('  2. Verify AIRTABLE_BASE_ID is correct'));
    console.log(chalk.gray('  3. Ensure the base exists and API key has access'));
    console.log(chalk.gray('  4. Check that the Journeys table exists in the base\n'));
    return false;
  }
}

/**
 * Main sync function
 */
export async function syncJourneysToAirtable(options = {}) {
  const { client, dryRun = false, skipExisting = false, mockMode = false } = options;
  
  console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║    Sync Local Journeys to Airtable             ║'));
  console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));
  
  if (mockMode) {
    console.log(chalk.yellow('⚠ MOCK MODE - Simulating Airtable operations\n'));
  } else if (dryRun) {
    console.log(chalk.yellow('⚠ DRY RUN MODE - No changes will be made\n'));
  }
  
  try {
    // Load client configuration
    console.log(chalk.cyan(`Loading client configuration for: ${client}...`));
    const clientConfig = await loadClientConfig(client);
    console.log(chalk.green(`✓ Client: ${clientConfig.name}`));
    console.log(chalk.gray(`  Location ID: ${clientConfig.locationId}\n`));
    
    // Load journey files
    console.log(chalk.cyan('Loading journey files...'));
    const journeys = await loadJourneyFiles(client);
    console.log(chalk.green(`✓ Found ${journeys.length} journey(s)\n`));
    
    if (journeys.length === 0) {
      console.log(chalk.yellow('No journeys to sync.\n'));
      return { success: true, journeysSynced: 0, touchpointsSynced: 0 };
    }
    
    // Show journeys that would be synced
    console.log(chalk.cyan('Journeys to sync:'));
    for (const journey of journeys) {
      console.log(`  • ${journey.name} (${journey.touchpoints?.length || 0} touchpoints)`);
    }
    console.log('');
    
    // Connect to Airtable (unless in mock mode)
    let useMockMode = mockMode;
    if (!mockMode) {
      const connected = await testAirtableConnection();
      if (!connected) {
        console.log(chalk.yellow('\n⚠ Falling back to MOCK MODE - no actual changes will be made\n'));
        useMockMode = true;
      }
    }
    
    if (dryRun || useMockMode) {
      const totalTouchpoints = journeys.reduce((acc, j) => acc + (j.touchpoints?.length || 0), 0);
      console.log(chalk.cyan(`${useMockMode ? 'Mock' : 'Dry run'} summary:`));
      console.log(`  Journeys: ${journeys.length}`);
      console.log(`  Touchpoints: ${totalTouchpoints}`);
      console.log('');
      
      if (useMockMode) {
        // Show detailed mock output
        console.log(chalk.cyan('Mock sync details:'));
        for (const journey of journeys) {
          console.log(chalk.white(`\n  Journey: ${journey.name}`));
          console.log(chalk.gray(`    Category: ${journey.category}`));
          console.log(chalk.gray(`    Status: ${journey.status}`));
          console.log(chalk.gray(`    Touchpoints:`));
          for (const tp of journey.touchpoints || []) {
            console.log(chalk.gray(`      - ${tp.name} (${tp.type}, Day ${calculateDay(tp.delay, tp.delayUnit)})`));
          }
        }
        console.log('');
      }
      
      return { 
        success: true, 
        journeysSynced: journeys.length, 
        touchpointsSynced: journeys.reduce((acc, j) => acc + (j.touchpoints?.length || 0), 0),
        dryRun: true,
        mockMode: useMockMode
      };
    }
    
    // Get or create client record
    console.log(chalk.cyan('Syncing client record...'));
    const clientRecordId = await getOrCreateClient(clientConfig);
    console.log('');
    
    // Sync journeys and their touchpoints
    console.log(chalk.cyan('Syncing journeys...\n'));
    let journeysSynced = 0;
    let touchpointsSynced = 0;
    let errors = [];
    
    for (const journey of journeys) {
      try {
        console.log(chalk.white(`Processing: ${journey.name}`));
        
        // Sync journey
        const result = await syncJourney(journey, clientRecordId, { skipExisting });
        journeysSynced++;
        
        if (result.skipped) {
          console.log(chalk.gray(`  Skipped (already exists)`));
          continue;
        }
        
        // Sync touchpoints
        if (result.touchpoints && result.touchpoints.length > 0) {
          console.log(chalk.gray(`  Syncing ${result.touchpoints.length} touchpoints...`));
          
          for (let i = 0; i < result.touchpoints.length; i++) {
            const touchpoint = result.touchpoints[i];
            const tpResult = await syncTouchpoint(touchpoint, result.id, i + 1, { skipExisting });
            if (!tpResult.skipped && !tpResult.error) {
              touchpointsSynced++;
            }
          }
        }
        
        console.log('');
      } catch (error) {
        logger.error(`Failed to sync journey ${journey.name}`, { error: error.message });
        errors.push({ journey: journey.name, error: error.message });
      }
    }
    
    // Print summary
    console.log(chalk.cyan('═'.repeat(50)));
    console.log(chalk.cyan('Sync Summary'));
    console.log(chalk.cyan('═'.repeat(50)));
    console.log(`Journeys synced: ${chalk.green(journeysSynced)}`);
    console.log(`Touchpoints synced: ${chalk.green(touchpointsSynced)}`);
    
    if (errors.length > 0) {
      console.log(chalk.red(`\nErrors: ${errors.length}`));
      errors.forEach(e => console.log(chalk.red(`  • ${e.journey}: ${e.error}`)));
    }
    
    console.log('');
    
    return {
      success: errors.length === 0,
      journeysSynced,
      touchpointsSynced,
      errors
    };
    
  } catch (error) {
    logger.error('Sync failed', { error: error.message });
    console.log(chalk.red(`\n✗ Sync failed: ${error.message}\n`));
    return { success: false, error: error.message };
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const clientArg = args.find(arg => arg.startsWith('--client='));
  const dryRun = args.includes('--dry-run');
  const skipExisting = args.includes('--skip-existing');
  const mockMode = args.includes('--mock');
  
  if (!clientArg) {
    console.log(chalk.red('Error: --client parameter is required'));
    console.log(chalk.gray('Usage: node sync-journeys-to-airtable.js --client=<client-slug> [--dry-run] [--skip-existing] [--mock]'));
    process.exit(1);
  }
  
  const client = clientArg.split('=')[1];
  
  syncJourneysToAirtable({ client, dryRun, skipExisting, mockMode })
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error(chalk.red('Fatal error:'), error);
      process.exit(1);
    });
}

export default syncJourneysToAirtable;
