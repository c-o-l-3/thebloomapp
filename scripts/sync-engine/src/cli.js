#!/usr/bin/env node

/**
 * CLI Entry Point
 * Airtable to GHL Sync Engine
 */

import { Command } from 'commander';
import chalk from 'chalk';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import syncOrchestration from './services/sync.js';
import airtableService from './services/airtable.js';
import ghlService from './services/ghl.js';
import conflictDetector from './utils/conflict.js';
import logger from './utils/logger.js';
import { scaffoldClientJourneyBuilder } from './journey-builder/scaffold.js';
import { KnowledgeHub } from './services/knowledge-hub.js';
import { crawlAndPopulateHub } from './journey-builder/crawler.js';
import { processDocument } from './utils/document-processor.js';
import { FactExtractionService } from './services/ai-extraction.js';
import { BrandVoiceAnalyzer } from './services/brand-voice-analyzer.js';
import { SemanticSearchService } from './services/semantic-search.js';
import { OnboardingWizard } from './cli-onboarding.js';
import { GHLAutoExtractionService } from './services/ghl-auto-extract.js';
import { JourneyGenerator } from './services/journey-generator.js';
import { SetupValidator } from './utils/setup-validator.js';
import { OnboardingReportGenerator } from './utils/onboarding-report.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('ghl-sync')
  .description('Airtable to GoHighLevel sync engine for Journey Builder')
  .version('1.0.0');

// Main sync command
program
  .command('sync')
  .description('Sync published journeys from Airtable to GoHighLevel')
  .option('--dry-run', 'Show what would be synced without making changes')
  .option('--client <clientId>', 'Sync only for specific client')
  .option('--journey <journeyId>', 'Sync only specific journey')
  .action(async (options) => {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║      Airtable to GHL Sync Engine              ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    try {
      // Initialize sync
      await syncOrchestration.initialize(options);

      // Test connections
      console.log(chalk.cyan('\nTesting connections...\n'));
      
      const airtableTest = await airtableService.testConnection();
      console.log(airtableTest.success 
        ? chalk.green(`✓ Airtable: ${airtableTest.message}`) 
        : chalk.red(`✗ Airtable: ${airtableTest.message}`));

      const ghlTest = await ghlService.testConnection();
      console.log(ghlTest.success 
        ? chalk.green(`✓ GoHighLevel: ${ghlTest.message}`) 
        : chalk.red(`✗ GoHighLevel: ${ghlTest.message}`));

      if (!airtableTest.success || !ghlTest.success) {
        console.log(chalk.red('\nConnection tests failed. Please check your configuration.\n'));
        process.exit(1);
      }

      // Execute sync
      if (options.dryRun) {
        console.log(chalk.yellow('\n⚠ DRY RUN MODE - No changes will be made\n'));
      }

      const result = await syncOrchestration.execute();

      if (result.success) {
        console.log(chalk.green('\n✓ Sync completed successfully!\n'));
      } else {
        console.log(chalk.red('\n✗ Sync completed with errors\n'));
        console.log(chalk.red(`Error: ${result.error}\n`));
      }

      // Show conflicts if any
      if (result.conflicts && result.conflicts.totalConflicts > 0) {
        console.log(chalk.yellow(`\n⚠ ${result.conflicts.totalConflicts} conflicts detected\n`));
        console.log(chalk.yellow('Conflict Report:'));
        console.log(JSON.stringify(result.conflicts, null, 2));
      }

      process.exit(result.success ? 0 : 1);

    } catch (error) {
      logger.error('Fatal error during sync', { error: error.message, stack: error.stack });
      console.log(chalk.red('\n✗ Fatal error: ' + error.message));
      process.exit(1);
    }
  });

// Show sync history
program
  .command('history')
  .description('Show sync history')
  .option('--journey <journeyId>', 'Show history for specific journey')
  .action(async (options) => {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║           Sync History                         ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    try {
      await airtableService.connect();
      const history = await syncOrchestration.getHistory(options.journey);

      if (history.length === 0) {
        console.log(chalk.yellow('No sync history found.\n'));
        return;
      }

      console.log(`Found ${history.length} records:\n`);
      
      for (const record of history.slice(0, 20)) {
        const status = record.status === 'Success' ? chalk.green('✓') : chalk.red('✗');
        const type = record.syncType || record.SyncType || 'Unknown';
        
        console.log(`${status} ${chalk.white(record.journeyName || 'Unknown')}`);
        console.log(`   Type: ${type}`);
        console.log(`   Status: ${record.status}`);
        console.log(`   GHL ID: ${record.ghlWorkflowId || 'N/A'}`);
        console.log(`   Duration: ${record.duration || 0}ms`);
        if (record.error) {
          console.log(chalk.red(`   Error: ${record.error}`));
        }
        console.log('');
      }

      if (history.length > 20) {
        console.log(chalk.gray(`... and ${history.length - 20} more records`));
      }

    } catch (error) {
      console.log(chalk.red('Error fetching history: ' + error.message));
    }
  });

// Show conflicts
program
  .command('conflicts')
  .description('Show current conflicts')
  .action(async () => {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║           Conflict Report                      ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    const report = conflictDetector.generateReport();
    
    console.log(`Total Conflicts: ${report.totalConflicts}`);
    console.log(`Resolved: ${report.resolved}`);
    console.log(`Unresolved: ${report.unresolved}\n`);

    if (report.bySeverity) {
      console.log('By Severity:');
      Object.entries(report.bySeverity).forEach(([severity, count]) => {
        const color = severity === 'high' ? chalk.red : 
                      severity === 'medium' ? chalk.yellow : chalk.cyan;
        console.log(`  ${color(severity)}: ${count}`);
      });
      console.log('');
    }

    if (report.conflicts && report.conflicts.length > 0) {
      console.log('Conflicts:');
      report.conflicts.forEach((conflict, index) => {
        console.log(`\n${index + 1}. ${conflict.journeyName}`);
        console.log(`   Type: ${conflict.type}`);
        console.log(`   Message: ${conflict.message}`);
        console.log(`   Severity: ${conflict.severity}`);
        console.log(`   Resolution: ${conflict.resolution}`);
      });
    }
  });

// Resolve conflict
program
  .command('resolve')
  .description('Resolve a conflict')
  .argument('<conflictId>', 'Conflict ID to resolve')
  .option('--overwrite', 'Overwrite GHL with Airtable data')
  .option('--skip', 'Skip this sync')
  .option('--merge', 'Merge changes')
  .action(async (conflictId, options) => {
    console.log(chalk.cyan(`\nResolving conflict: ${conflictId}\n`));

    let resolution;
    if (options.overwrite) resolution = 'overwrite';
    else if (options.skip) resolution = 'skip';
    else if (options.merge) resolution = 'merge';
    else {
      console.log(chalk.yellow('Please specify resolution: --overwrite, --skip, or --merge'));
      process.exit(1);
    }

    const result = conflictDetector.resolveConflict(conflictId, resolution);
    
    if (result) {
      console.log(chalk.green(`✓ Conflict resolved with: ${resolution}`));
    } else {
      console.log(chalk.red('Conflict not found'));
    }
  });

// Test connections
program
  .command('test')
  .description('Test API connections')
  .action(async () => {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║         Connection Test                        ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    // Test Airtable
    try {
      await airtableService.connect();
      const result = await airtableService.testConnection();
      console.log(result.success 
        ? chalk.green(`✓ Airtable: ${result.message}`) 
        : chalk.red(`✗ Airtable: ${result.message}`));
    } catch (error) {
      console.log(chalk.red(`✗ Airtable: ${error.message}`));
    }

    // Test GHL
    try {
      await ghlService.connect();
      const result = await ghlService.testConnection();
      console.log(result.success 
        ? chalk.green(`✓ GoHighLevel: ${result.message}`) 
        : chalk.red(`✗ GoHighLevel: ${result.message}`));
    } catch (error) {
      console.log(chalk.red(`✗ GoHighLevel: ${error.message}`));
    }

    console.log('');
  });

// Status command
program
  .command('status')
  .description('Show sync engine status')
  .action(async () => {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║         Sync Engine Status                     ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    const status = syncOrchestration.getStatus();
    console.log(`Dry Run: ${status.dryRun ? chalk.yellow('Yes') : chalk.green('No')}`);
    console.log(`Client: ${status.clientId || 'All'}`);
    console.log(`Journey: ${status.journeyId || 'All'}`);
    console.log('');
    console.log('Stats:');
    console.log(`  Synced: ${status.stats.synced}`);
    console.log(`  Conflicts: ${status.stats.conflicts}`);
    console.log(`  Failed: ${status.stats.failed}`);
    console.log(`  Created: ${status.stats.created}`);
    console.log(`  Updated: ${status.stats.updated}`);
    console.log(`  Skipped: ${status.stats.skipped}`);
    console.log('');
  });

program
  .command('scaffold')
  .description('Scaffold a client journey builder workspace from website crawl')
  .requiredOption('--client-slug <slug>', 'Client folder slug under /clients')
  .option('--website <url>', 'Website URL to crawl (defaults to location-config.json contact.website)')
  .option('--max-pages <n>', 'Max pages to crawl', value => parseInt(value, 10), 40)
  .option('--max-depth <n>', 'Max crawl depth', value => parseInt(value, 10), 3)
  .action(async (options) => {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║         Journey Builder Scaffold               ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    try {
      const result = await scaffoldClientJourneyBuilder({
        clientSlug: options.clientSlug,
        website: options.website,
        maxPages: options.maxPages,
        maxDepth: options.maxDepth
      });

      console.log(chalk.green('✓ Scaffold complete'));
      console.log(`Output: ${result.outputDir}`);
      Object.entries(result.files).forEach(([key, filePath]) => {
        console.log(`- ${key}: ${filePath}`);
      });
      console.log('');
    } catch (error) {
      console.log(chalk.red('\n✗ Scaffold failed\n'));
      console.log(chalk.red(`Error: ${error.message}\n`));
      process.exit(1);
    }
  });

// ==================== KNOWLEDGE HUB COMMANDS ====================

// Initialize Knowledge Hub
program
  .command('knowledge:init')
  .description('Initialize Knowledge Hub for a client')
  .requiredOption('--client <slug>', 'Client folder slug under /clients')
  .option('--website <url>', 'Website URL for the client')
  .action(async (options) => {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║         Knowledge Hub Initialization           ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    try {
      const hub = new KnowledgeHub(options.client);
      
      const isInitialized = await hub.isInitialized();
      if (isInitialized) {
        console.log(chalk.yellow(`Knowledge Hub already initialized for ${options.client}`));
        console.log(chalk.gray(`Location: ${hub.hubDir}`));
        return;
      }

      const result = await hub.initialize({
        website: options.website
      });

      console.log(chalk.green('✓ Knowledge Hub initialized successfully'));
      console.log(`Location: ${result.hubDir}`);
      console.log('\nCreated directories:');
      console.log('  - golden-pages/');
      console.log('  - documents/');
      console.log('  - facts/');
      console.log('  - brand-voice/');
      console.log('  - embeddings/');
      console.log('  - verification/');
      console.log('  - sync-state/');
      console.log('');
    } catch (error) {
      console.log(chalk.red('\n✗ Initialization failed\n'));
      console.log(chalk.red(`Error: ${error.message}\n`));
      process.exit(1);
    }
  });

// Crawl and populate Knowledge Hub
program
  .command('knowledge:crawl')
  .description('Crawl website and populate Knowledge Hub')
  .requiredOption('--client <slug>', 'Client folder slug under /clients')
  .option('--website <url>', 'Website URL to crawl (defaults to location-config.json)')
  .option('--max-pages <n>', 'Max pages to crawl', value => parseInt(value, 10), 40)
  .option('--max-depth <n>', 'Max crawl depth', value => parseInt(value, 10), 3)
  .option('--dry-run', 'Show what would be crawled without saving')
  .action(async (options) => {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║      Knowledge Hub Website Crawl               ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    try {
      const hub = new KnowledgeHub(options.client);
      
      const isInitialized = await hub.isInitialized();
      if (!isInitialized) {
        console.log(chalk.red(`Knowledge Hub not initialized for ${options.client}`));
        console.log(chalk.yellow(`Run: npm run knowledge:init -- --client=${options.client}`));
        process.exit(1);
      }

      // Get website from location config if not provided
      let website = options.website;
      if (!website) {
        const { locationConfig } = await import('./journey-builder/client-loader.js')
          .then(m => m.loadClientLocationConfig(options.client));
        website = locationConfig.contact?.website;
      }

      if (!website) {
        console.log(chalk.red('No website URL provided or found in location-config.json'));
        process.exit(1);
      }

      const result = await crawlAndPopulateHub(options.client, website, {
        maxPages: options.maxPages,
        maxDepth: options.maxDepth,
        dryRun: options.dryRun
      });

      if (options.dryRun) {
        console.log(chalk.yellow('\n⚠ DRY RUN MODE - No changes were made\n'));
        console.log(`Found ${result.pagesFound} pages:`);
        result.pages.forEach(p => {
          const icon = p.importance === 'critical' ? chalk.red('★') : 
                       p.importance === 'high' ? chalk.yellow('◆') : chalk.gray('•');
          console.log(`  ${icon} ${p.title || p.url}`);
          console.log(`     ${chalk.gray(p.url)} [${p.category}]`);
        });
      } else {
        console.log(chalk.green('\n✓ Crawl completed successfully'));
        console.log(`Pages crawled: ${result.pagesCrawled}`);
        console.log(`Pages added: ${result.pagesAdded}`);
        console.log(`Pages updated: ${result.pagesUpdated}`);
        console.log(`Facts extracted: ${result.factsExtracted}`);
      }
      console.log('');
    } catch (error) {
      console.log(chalk.red('\n✗ Crawl failed\n'));
      console.log(chalk.red(`Error: ${error.message}\n`));
      process.exit(1);
    }
  });

// Import document
program
  .command('knowledge:import')
  .description('Import a document into Knowledge Hub')
  .requiredOption('--client <slug>', 'Client folder slug under /clients')
  .requiredOption('--file <path>', 'Path to the file to import')
  .option('--category <cat>', 'Document category (pricing, contract, menu, etc.)')
  .option('--tags <tags>', 'Comma-separated tags', value => value.split(',').map(t => t.trim()))
  .action(async (options) => {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║         Document Import                        ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    try {
      const hub = new KnowledgeHub(options.client);
      
      const isInitialized = await hub.isInitialized();
      if (!isInitialized) {
        console.log(chalk.red(`Knowledge Hub not initialized for ${options.client}`));
        console.log(chalk.yellow(`Run: npm run knowledge:init -- --client=${options.client}`));
        process.exit(1);
      }

      // Import the document
      const doc = await hub.importDocument(options.file, {
        category: options.category,
        tags: options.tags || []
      });

      console.log(chalk.green('✓ Document imported successfully'));
      console.log(`ID: ${doc.id}`);
      console.log(`Filename: ${doc.originalName}`);
      console.log(`Type: ${doc.type}`);
      console.log(`Size: ${(doc.fileSize / 1024).toFixed(1)} KB`);
      console.log('');

      // Process the document (extract text, chunk, etc.)
      console.log('Processing document...');
      const processed = await processDocument(options.file, {
        chunkOptions: { chunkSize: 1000, chunkOverlap: 200 }
      });

      // Save extracted text
      const extractPath = `documents/extracted/${doc.id}.txt`;
      await hub.writeJson(extractPath, processed.extraction.text);

      // Update document with OCR results
      await hub.updateDocumentOcr(doc.id, {
        ocrStatus: 'completed',
        ocrTextPath: extractPath,
        wordCount: processed.extraction.wordCount,
        chunkCount: processed.chunks.length
      });

      console.log(`Extracted ${processed.extraction.wordCount} words`);
      console.log(`Created ${processed.chunks.length} chunks`);
      console.log(chalk.green('✓ Processing complete'));
      console.log('');
    } catch (error) {
      console.log(chalk.red('\n✗ Import failed\n'));
      console.log(chalk.red(`Error: ${error.message}\n`));
      process.exit(1);
    }
  });

// List facts
program
  .command('knowledge:facts')
  .description('List facts in Knowledge Hub')
  .requiredOption('--client <slug>', 'Client folder slug under /clients')
  .option('--category <cat>', 'Filter by category (pricing, capacity, policies, amenities, venue-details)')
  .option('--verified-only', 'Show only verified facts', false)
  .option('--search <query>', 'Search in fact statements')
  .option('--limit <n>', 'Limit number of results', value => parseInt(value, 10), 20)
  .action(async (options) => {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║         Knowledge Hub Facts                    ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    try {
      const hub = new KnowledgeHub(options.client);
      
      const isInitialized = await hub.isInitialized();
      if (!isInitialized) {
        console.log(chalk.red(`Knowledge Hub not initialized for ${options.client}`));
        process.exit(1);
      }

      const facts = await hub.getFacts(options.category, {
        verifiedOnly: options.verifiedOnly,
        search: options.search
      });

      const limitedFacts = facts.slice(0, options.limit);

      console.log(`Found ${facts.length} facts${facts.length > options.limit ? ` (showing first ${options.limit})` : ''}\n`);

      limitedFacts.forEach((fact, index) => {
        const statusIcon = fact.verificationStatus === 'verified' ? chalk.green('✓') : 
                           fact.verificationStatus === 'ai-extracted' ? chalk.yellow('⚠') : chalk.gray('?');
        const confidence = Math.round(fact.confidence * 100);
        const confidenceColor = confidence >= 90 ? chalk.green : confidence >= 70 ? chalk.yellow : chalk.red;
        
        console.log(`${index + 1}. ${statusIcon} ${chalk.white(fact.statement.slice(0, 80))}${fact.statement.length > 80 ? '...' : ''}`);
        console.log(`   ID: ${chalk.gray(fact.id)} | Category: ${chalk.cyan(fact.category)}${fact.subcategory ? `/${fact.subcategory}` : ''}`);
        console.log(`   Confidence: ${confidenceColor(confidence + '%')} | Status: ${fact.verificationStatus}`);
        if (fact.tags.length > 0) {
          console.log(`   Tags: ${chalk.gray(fact.tags.join(', '))}`);
        }
        console.log('');
      });
    } catch (error) {
      console.log(chalk.red('\n✗ Failed to list facts\n'));
      console.log(chalk.red(`Error: ${error.message}\n`));
      process.exit(1);
    }
  });

// Verify a fact
program
  .command('knowledge:verify')
  .description('Verify a fact in the Knowledge Hub')
  .requiredOption('--client <slug>', 'Client folder slug under /clients')
  .requiredOption('--fact-id <id>', 'ID of the fact to verify')
  .option('--status <status>', 'Verification status (verified, disputed, deprecated)', 'verified')
  .option('--by <name>', 'Name of verifier', 'manual')
  .option('--notes <notes>', 'Verification notes')
  .action(async (options) => {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║         Verify Fact                            ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    try {
      const hub = new KnowledgeHub(options.client);
      
      const isInitialized = await hub.isInitialized();
      if (!isInitialized) {
        console.log(chalk.red(`Knowledge Hub not initialized for ${options.client}`));
        process.exit(1);
      }

      // Get the fact first to show details
      const fact = await hub.getFact(options.factId);
      if (!fact) {
        console.log(chalk.red(`Fact not found: ${options.factId}`));
        process.exit(1);
      }

      console.log('Current fact:');
      console.log(`  Statement: ${fact.statement}`);
      console.log(`  Category: ${fact.category}`);
      console.log(`  Current status: ${fact.verificationStatus}`);
      console.log('');

      const updated = await hub.verifyFact(options.factId, {
        status: options.status,
        verifiedBy: options.by,
        notes: options.notes
      });

      console.log(chalk.green('✓ Fact verified successfully'));
      console.log(`New status: ${updated.verificationStatus}`);
      console.log(`Verified by: ${updated.verifiedBy}`);
      console.log(`Verified at: ${updated.verifiedAt}`);
      console.log('');
    } catch (error) {
      console.log(chalk.red('\n✗ Verification failed\n'));
      console.log(chalk.red(`Error: ${error.message}\n`));
      process.exit(1);
    }
  });

// Show Knowledge Hub stats
program
  .command('knowledge:stats')
  .description('Show Knowledge Hub statistics')
  .requiredOption('--client <slug>', 'Client folder slug under /clients')
  .action(async (options) => {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║         Knowledge Hub Statistics               ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    try {
      const hub = new KnowledgeHub(options.client);
      
      const isInitialized = await hub.isInitialized();
      if (!isInitialized) {
        console.log(chalk.red(`Knowledge Hub not initialized for ${options.client}`));
        process.exit(1);
      }

      const stats = await hub.getStats();

      console.log(chalk.white(`Client: ${stats.clientSlug}`));
      console.log(chalk.gray(`Last updated: ${stats.lastUpdated}`));
      console.log('');

      console.log(chalk.cyan('Golden Pages:'));
      console.log(`  Total: ${stats.goldenPages.total}`);
      console.log(`  Critical: ${chalk.red(stats.goldenPages.byImportance.critical)}`);
      console.log(`  High: ${chalk.yellow(stats.goldenPages.byImportance.high)}`);
      console.log(`  Medium: ${stats.goldenPages.byImportance.medium}`);
      console.log(`  Low: ${stats.goldenPages.byImportance.low}`);
      console.log('');

      console.log(chalk.cyan('Facts:'));
      console.log(`  Total: ${stats.facts.total}`);
      console.log(`  Verified: ${chalk.green(stats.facts.verified)}`);
      console.log(`  Pending: ${chalk.yellow(stats.facts.pending)}`);
      console.log('');

      if (stats.facts.byCategory.length > 0) {
        console.log('  By Category:');
        stats.facts.byCategory.forEach(cat => {
          console.log(`    ${cat.name}: ${cat.count}`);
        });
        console.log('');
      }

      console.log(chalk.cyan('Documents:'));
      console.log(`  Total: ${stats.documents.total}`);
      console.log(`  Processed: ${chalk.green(stats.documents.byStatus.completed)}`);
      console.log(`  Pending: ${stats.documents.byStatus.pending}`);
      console.log('');

      if (stats.verification.pending > 0) {
        console.log(chalk.yellow(`⚠ ${stats.verification.pending} facts pending verification`));
        console.log(chalk.gray(`Run: npm run knowledge:facts -- --client=${options.client} --verified-only=false`));
      }
      console.log('');
    } catch (error) {
      console.log(chalk.red('\n✗ Failed to get stats\n'));
      console.log(chalk.red(`Error: ${error.message}\n`));
      process.exit(1);
    }
  });

// ==================== AI ENRICHMENT COMMANDS ====================

// AI Extract facts from golden pages
program
  .command('ai:extract')
  .description('Extract facts from golden pages using AI')
  .requiredOption('--client <slug>', 'Client folder slug under /clients')
  .option('--category <cat>', 'Only process pages in this category')
  .option('--importance <level>', 'Only process pages with this importance (critical, high, medium, low)', 'medium')
  .option('--page-id <id>', 'Extract facts from a specific page only')
  .option('--dry-run', 'Show what would be extracted without saving')
  .action(async (options) => {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║      AI Fact Extraction                        ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    try {
      // Check OpenAI configuration
      if (!process.env.OPENAI_API_KEY) {
        console.log(chalk.red('✗ OPENAI_API_KEY not configured'));
        console.log(chalk.yellow('Add OPENAI_API_KEY to your .env file'));
        process.exit(1);
      }

      const hub = new KnowledgeHub(options.client);
      
      const isInitialized = await hub.isInitialized();
      if (!isInitialized) {
        console.log(chalk.red(`Knowledge Hub not initialized for ${options.client}`));
        console.log(chalk.yellow(`Run: npm run knowledge:init -- --client=${options.client}`));
        process.exit(1);
      }

      const extractor = new FactExtractionService(options.client);

      if (options.dryRun) {
        console.log(chalk.yellow('⚠ DRY RUN MODE - No changes will be made\n'));
      }

      let results;

      if (options.pageId) {
        // Extract from specific page
        console.log(`Extracting facts from page: ${options.pageId}`);
        const page = await hub.getGoldenPage(options.pageId);
        if (!page) {
          console.log(chalk.red(`Page not found: ${options.pageId}`));
          process.exit(1);
        }

        if (options.dryRun) {
          console.log(`Would extract from: ${page.title || page.url}`);
          console.log(`Content length: ${page.textSample?.length || 0} chars`);
          return;
        }

        results = await extractor.reextractPageFacts(options.pageId);
        console.log(chalk.green(`\n✓ Extracted ${results.factsExtracted} facts`));
      } else {
        // Extract from all matching pages
        const filters = {
          importance: options.importance === 'high+' ? 'high+' : options.importance
        };
        if (options.category) {
          filters.category = options.category;
        }

        const pages = await hub.getGoldenPages(filters);
        console.log(`Found ${pages.length} pages to process\n`);

        if (options.dryRun) {
          pages.forEach(p => {
            console.log(`  • ${p.title || p.url} [${p.category}]`);
          });
          console.log(chalk.yellow(`\nWould process ${pages.length} pages`));
          return;
        }

        results = await extractor.extractAllFacts({ filters });
      }

      console.log(chalk.green('\n✓ Fact extraction complete'));
      console.log(`  Pages processed: ${results.pagesProcessed}`);
      console.log(`  Facts extracted: ${results.factsExtracted}`);
      console.log(`  Facts added: ${results.factsAdded}`);
      console.log(`  Facts queued for verification: ${results.factsQueued}`);
      
      if (results.errors.length > 0) {
        console.log(chalk.yellow(`\n⚠ ${results.errors.length} errors occurred`));
        results.errors.forEach(e => {
          console.log(chalk.gray(`  - ${e.page}: ${e.error}`));
        });
      }

      console.log('');
    } catch (error) {
      console.log(chalk.red('\n✗ Fact extraction failed\n'));
      console.log(chalk.red(`Error: ${error.message}\n`));
      process.exit(1);
    }
  });

// AI Analyze brand voice
program
  .command('ai:voice')
  .description('Analyze brand voice from golden pages')
  .requiredOption('--client <slug>', 'Client folder slug under /clients')
  .option('--importance <level>', 'Minimum page importance to include', 'high+')
  .option('--dry-run', 'Show analysis without updating profile')
  .action(async (options) => {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║      AI Brand Voice Analysis                   ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    try {
      // Check OpenAI configuration
      if (!process.env.OPENAI_API_KEY) {
        console.log(chalk.red('✗ OPENAI_API_KEY not configured'));
        console.log(chalk.yellow('Add OPENAI_API_KEY to your .env file'));
        process.exit(1);
      }

      const hub = new KnowledgeHub(options.client);
      
      const isInitialized = await hub.isInitialized();
      if (!isInitialized) {
        console.log(chalk.red(`Knowledge Hub not initialized for ${options.client}`));
        process.exit(1);
      }

      const analyzer = new BrandVoiceAnalyzer(options.client);

      console.log('Analyzing brand voice from golden pages...\n');

      const result = await analyzer.runFullAnalysis({
        importance: options.importance,
        sourcePages: 'golden-pages'
      });

      console.log(chalk.green('✓ Brand voice analysis complete'));
      console.log(`  Pages analyzed: ${result.pagesAnalyzed}`);
      console.log('');

      // Display key findings
      const voice = result.profile.voice;
      
      console.log(chalk.cyan('Voice Adjectives:'));
      voice.adjectives.forEach(adj => {
        console.log(`  • ${adj}`);
      });
      console.log('');

      console.log(chalk.cyan('Personality:'));
      console.log(`  ${voice.personality}`);
      console.log('');

      console.log(chalk.cyan("DO's:"));
      voice.do.slice(0, 5).forEach(item => {
        console.log(`  ✓ ${item}`);
      });
      console.log('');

      console.log(chalk.cyan("DON'Ts:"));
      voice.dont.slice(0, 5).forEach(item => {
        console.log(`  ✗ ${item}`);
      });
      console.log('');

      if (options.dryRun) {
        console.log(chalk.yellow('⚠ Dry run - profile not updated'));
      } else {
        console.log(chalk.green('✓ Brand voice profile updated'));
      }
      console.log('');
    } catch (error) {
      console.log(chalk.red('\n✗ Brand voice analysis failed\n'));
      console.log(chalk.red(`Error: ${error.message}\n`));
      process.exit(1);
    }
  });

// AI Search semantic
program
  .command('ai:search')
  .description('Semantic search over facts and content')
  .requiredOption('--client <slug>', 'Client folder slug under /clients')
  .requiredOption('--query <query>', 'Search query')
  .option('--category <cat>', 'Filter by category')
  .option('--type <type>', 'Filter by type (fact, page)', 'fact')
  .option('--limit <n>', 'Maximum results', value => parseInt(value, 10), 10)
  .option('--threshold <n>', 'Minimum similarity threshold (0-1)', value => parseFloat(value), 0.5)
  .action(async (options) => {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║      Semantic Search                           ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    try {
      const hub = new KnowledgeHub(options.client);
      
      const isInitialized = await hub.isInitialized();
      if (!isInitialized) {
        console.log(chalk.red(`Knowledge Hub not initialized for ${options.client}`));
        process.exit(1);
      }

      const searchService = new SemanticSearchService(options.client);

      console.log(`Query: "${options.query}"\n`);

      let results;
      if (options.type === 'fact') {
        results = await searchService.searchFacts(options.query, {
          category: options.category,
          limit: options.limit,
          threshold: options.threshold
        });
      } else {
        results = await searchService.search(options.query, {
          category: options.category,
          type: options.type,
          limit: options.limit,
          threshold: options.threshold
        });
      }

      console.log(chalk.cyan(`Results (${results.results.length} found):\n`));

      if (results.results.length === 0) {
        console.log(chalk.yellow('No matching results found'));
        console.log(chalk.gray('Try lowering the threshold or using different keywords'));
      } else {
        results.results.forEach((result, index) => {
          const similarity = Math.round(result.similarity * 100);
          const simColor = similarity >= 80 ? chalk.green : similarity >= 60 ? chalk.yellow : chalk.gray;
          
          console.log(`${index + 1}. ${result.fact?.statement || result.text}`);
          console.log(`   Similarity: ${simColor(similarity + '%')} | Type: ${result.type}`);
          
          if (result.fact) {
            console.log(`   Category: ${chalk.cyan(result.fact.category)} | Confidence: ${Math.round(result.fact.confidence * 100)}%`);
          }
          
          if (result.metadata?.tags?.length > 0) {
            console.log(`   Tags: ${chalk.gray(result.metadata.tags.join(', '))}`);
          }
          console.log('');
        });
      }

      console.log('');
    } catch (error) {
      console.log(chalk.red('\n✗ Search failed\n'));
      console.log(chalk.red(`Error: ${error.message}\n`));
      process.exit(1);
    }
  });

// AI Generate embeddings
program
  .command('ai:embeddings')
  .description('Generate embeddings for facts and pages')
  .requiredOption('--client <slug>', 'Client folder slug under /clients')
  .option('--type <type>', 'What to embed (facts, pages, all)', 'all')
  .option('--category <cat>', 'Only embed facts in this category')
  .option('--force', 'Regenerate existing embeddings', false)
  .action(async (options) => {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║      Generate Embeddings                       ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    try {
      if (!process.env.OPENAI_API_KEY) {
        console.log(chalk.yellow('⚠ OPENAI_API_KEY not configured - using fallback embeddings'));
        console.log(chalk.gray('For better results, add OPENAI_API_KEY to your .env file\n'));
      }

      const hub = new KnowledgeHub(options.client);
      
      const isInitialized = await hub.isInitialized();
      if (!isInitialized) {
        console.log(chalk.red(`Knowledge Hub not initialized for ${options.client}`));
        process.exit(1);
      }

      const searchService = new SemanticSearchService(options.client);

      let factResults = { generated: 0, skipped: 0 };
      let pageResults = { generated: 0, skipped: 0 };

      if (options.type === 'facts' || options.type === 'all') {
        console.log('Generating fact embeddings...');
        factResults = await searchService.generateFactEmbeddings({
          category: options.category,
          force: options.force
        });
      }

      if (options.type === 'pages' || options.type === 'all') {
        console.log('\nGenerating page embeddings...');
        pageResults = await searchService.generatePageEmbeddings({
          force: options.force
        });
      }

      console.log(chalk.green('\n✓ Embedding generation complete'));
      console.log(`  Facts: ${factResults.generated} generated, ${factResults.skipped} skipped`);
      console.log(`  Pages: ${pageResults.generated} generated, ${pageResults.skipped} skipped`);
      console.log('');
    } catch (error) {
      console.log(chalk.red('\n✗ Embedding generation failed\n'));
      console.log(chalk.red(`Error: ${error.message}\n`));
      process.exit(1);
    }
  });

// AI Enrich - Run all enrichment steps
program
  .command('ai:enrich')
  .description('Run full AI enrichment pipeline')
  .requiredOption('--client <slug>', 'Client folder slug under /clients')
  .option('--skip-facts', 'Skip fact extraction', false)
  .option('--skip-voice', 'Skip brand voice analysis', false)
  .option('--skip-embeddings', 'Skip embedding generation', false)
  .action(async (options) => {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║      AI Enrichment Pipeline                    ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    try {
      // Check OpenAI configuration
      if (!process.env.OPENAI_API_KEY) {
        console.log(chalk.red('✗ OPENAI_API_KEY not configured'));
        console.log(chalk.yellow('Add OPENAI_API_KEY to your .env file'));
        process.exit(1);
      }

      const hub = new KnowledgeHub(options.client);
      
      const isInitialized = await hub.isInitialized();
      if (!isInitialized) {
        console.log(chalk.red(`Knowledge Hub not initialized for ${options.client}`));
        process.exit(1);
      }

      const results = {
        facts: null,
        voice: null,
        embeddings: null
      };

      // Step 1: Extract facts
      if (!options.skipFacts) {
        console.log(chalk.cyan('Step 1: Extracting facts from golden pages...\n'));
        const extractor = new FactExtractionService(options.client);
        results.facts = await extractor.extractAllFacts();
        console.log(chalk.green(`  ✓ Extracted ${results.facts.factsExtracted} facts\n`));
      }

      // Step 2: Analyze brand voice
      if (!options.skipVoice) {
        console.log(chalk.cyan('Step 2: Analyzing brand voice...\n'));
        const analyzer = new BrandVoiceAnalyzer(options.client);
        results.voice = await analyzer.runFullAnalysis();
        console.log(chalk.green(`  ✓ Analyzed brand voice from ${results.voice.pagesAnalyzed} pages\n`));
      }

      // Step 3: Generate embeddings
      if (!options.skipEmbeddings) {
        console.log(chalk.cyan('Step 3: Generating embeddings...\n'));
        const searchService = new SemanticSearchService(options.client);
        results.embeddings = await searchService.rebuildEmbeddings();
        console.log(chalk.green(`  ✓ Generated ${results.embeddings.total} embeddings\n`));
      }

      console.log(chalk.green('═'.repeat(50)));
      console.log(chalk.green('✓ AI Enrichment Pipeline Complete'));
      console.log(chalk.green('═'.repeat(50)));
      console.log('');

      if (results.facts) {
        console.log(`Facts extracted: ${results.facts.factsExtracted}`);
      }
      if (results.voice) {
        console.log(`Brand voice: Updated from ${results.voice.pagesAnalyzed} pages`);
      }
      if (results.embeddings) {
        console.log(`Embeddings: ${results.embeddings.total} total`);
      }
      console.log('');
    } catch (error) {
      console.log(chalk.red('\n✗ Enrichment pipeline failed\n'));
      console.log(chalk.red(`Error: ${error.message}\n`));
      process.exit(1);
    }
  });

// ==================== DEPLOYMENT COMMANDS ====================

// Validate deployment
program
  .command('validate')
  .description('Validate journey before deployment')
  .requiredOption('--client <slug>', 'Client folder slug')
  .requiredOption('--journey <journeyId>', 'Journey ID to validate')
  .action(async (options) => {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║      Deployment Validation                     ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    try {
      const { DeployPipeline } = await import('./services/deploy-pipeline.js');
      
      const pipeline = new DeployPipeline(options.client);
      await pipeline.initialize();

      // Connect to Airtable
      await airtableService.connect();
      const journey = await airtableService.getJourneyById(options.journey);
      const touchpoints = await airtableService.getTouchpointsForJourney(options.journey);

      console.log(`Validating journey: ${journey.name}`);
      console.log(`Touchpoints: ${touchpoints.length}\n`);

      // Run validation
      const validation = await pipeline.runPreDeployValidation(touchpoints);

      if (validation.valid) {
        console.log(chalk.green('✓ Validation passed'));
        console.log(`  Touchpoints checked: ${validation.touchpointsChecked}`);
        console.log(`  Errors: ${validation.errors}`);
        console.log(`  Warnings: ${validation.warnings}\n`);
      }

      // Check approval status
      try {
        const approvalCheck = await pipeline.validateApprovalStatus(journey);
        console.log(chalk.green('✓ Approval status verified'));
        console.log(`  Status: ${journey.status}`);
        console.log(`  Open comments: ${approvalCheck.openComments}\n`);
      } catch (error) {
        console.log(chalk.yellow('⚠ Approval check: ' + error.message + '\n'));
      }

      // Verify facts
      const factCheck = await pipeline.verifyFacts(touchpoints);
      console.log(chalk.cyan('Fact Verification:'));
      console.log(`  Verified facts used: ${factCheck.verified.length}`);
      console.log(`  Unverified facts: ${factCheck.unverified.length}`);
      if (factCheck.unverified.length > 0) {
        console.log(chalk.yellow('  ⚠ Some unverified facts found'));
      }
      console.log('');

    } catch (error) {
      console.log(chalk.red('\n✗ Validation failed\n'));
      console.log(chalk.red(`Error: ${error.message}\n`));
      process.exit(1);
    }
  });

// Deploy journey
program
  .command('deploy')
  .description('Deploy journey to GoHighLevel')
  .requiredOption('--client <slug>', 'Client folder slug')
  .requiredOption('--journey <journeyId>', 'Journey ID to deploy')
  .option('--dry-run', 'Run without making changes', false)
  .option('--skip-validation', 'Skip pre-deployment validation', false)
  .option('--skip-approval-check', 'Skip approval status check', false)
  .action(async (options) => {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║      Journey Deployment                        ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    try {
      const { DeployPipeline } = await import('./services/deploy-pipeline.js');
      
      const pipeline = new DeployPipeline(options.client);
      await pipeline.initialize();

      // Connect to Airtable
      await airtableService.connect();
      const journey = await airtableService.getJourneyById(options.journey);
      const touchpoints = await airtableService.getTouchpointsForJourney(options.journey);

      console.log(`Deploying journey: ${chalk.white(journey.name)}`);
      console.log(`Touchpoints: ${touchpoints.length}`);
      if (options.dryRun) {
        console.log(chalk.yellow('\n⚠ DRY RUN MODE - No changes will be made\n'));
      }
      console.log('');

      // Execute deployment
      const result = await pipeline.execute(journey, touchpoints);

      if (result.success) {
        console.log(chalk.green('\n✓ Deployment completed successfully\n'));
        console.log(`Deployment ID: ${result.deployment.id}`);
        console.log(`Duration: ${Date.now() - new Date(result.deployment.startedAt).getTime()}ms\n`);
        
        // Show step results
        console.log(chalk.cyan('Steps completed:'));
        result.deployment.steps.forEach(step => {
          const icon = step.status === 'completed' ? chalk.green('✓') : chalk.red('✗');
          console.log(`  ${icon} ${step.name}`);
        });
        console.log('');
      } else {
        console.log(chalk.red('\n✗ Deployment failed\n'));
        console.log(chalk.red(`Error: ${result.error}`));
        if (result.step) {
          console.log(chalk.red(`Failed at step: ${result.step.name}`));
        }
        console.log('');
        process.exit(1);
      }

    } catch (error) {
      console.log(chalk.red('\n✗ Deployment failed\n'));
      console.log(chalk.red(`Error: ${error.message}\n`));
      process.exit(1);
    }
  });

// Rollback deployment
program
  .command('rollback')
  .description('Rollback a previous deployment')
  .requiredOption('--client <slug>', 'Client folder slug')
  .requiredOption('--deployment-id <id>', 'Deployment ID to rollback')
  .action(async (options) => {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║      Deployment Rollback                       ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    try {
      const { DeployPipeline } = await import('./services/deploy-pipeline.js');
      
      const pipeline = new DeployPipeline(options.client);
      await pipeline.initialize();

      console.log(`Rolling back deployment: ${options.deploymentId}\n`);

      const result = await pipeline.rollback(options.deploymentId);

      if (result.success) {
        console.log(chalk.green('\n✓ Rollback completed successfully\n'));
        console.log(`Restored: ${result.restored} templates`);
        if (result.failed > 0) {
          console.log(chalk.yellow(`Failed: ${result.failed} templates`));
        }
        console.log('');
      } else {
        console.log(chalk.red('\n✗ Rollback failed\n'));
        console.log(chalk.red(`Failed: ${result.failed} templates`));
        console.log('');
        process.exit(1);
      }

    } catch (error) {
      console.log(chalk.red('\n✗ Rollback failed\n'));
      console.log(chalk.red(`Error: ${error.message}\n`));
      process.exit(1);
    }
  });

// Check deployment status
program
  .command('deploy:status')
  .description('Show deployment status')
  .requiredOption('--client <slug>', 'Client folder slug')
  .option('--journey <journeyId>', 'Filter by journey ID')
  .option('--deployment-id <id>', 'Show specific deployment')
  .action(async (options) => {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║      Deployment Status                         ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    try {
      const { DeployPipeline } = await import('./services/deploy-pipeline.js');
      
      const pipeline = new DeployPipeline(options.client);
      
      if (options.deploymentId) {
        // Show specific deployment
        const deployment = await pipeline.getDeployment(options.deploymentId);
        if (!deployment) {
          console.log(chalk.red(`Deployment not found: ${options.deploymentId}\n`));
          process.exit(1);
        }

        console.log(`Deployment: ${deployment.id}`);
        console.log(`Journey: ${deployment.journeyName} (${deployment.journeyId})`);
        console.log(`Status: ${getStatusColor(deployment.status)(deployment.status)}`);
        console.log(`Started: ${new Date(deployment.startedAt).toLocaleString()}`);
        if (deployment.completedAt) {
          console.log(`Completed: ${new Date(deployment.completedAt).toLocaleString()}`);
        }
        console.log('');

        console.log(chalk.cyan('Steps:'));
        deployment.steps.forEach(step => {
          const icon = step.status === 'completed' ? chalk.green('✓') : 
                       step.status === 'failed' ? chalk.red('✗') : chalk.yellow('○');
          console.log(`  ${icon} ${step.name}`);
          if (step.error) {
            console.log(chalk.red(`     Error: ${step.error}`));
          }
        });
        console.log('');
      } else {
        // List deployments
        const history = await pipeline.getDeploymentHistory(options.journey);
        
        if (history.length === 0) {
          console.log(chalk.yellow('No deployments found.\n'));
          return;
        }

        console.log(`Found ${history.length} deployment(s):\n`);
        
        history.slice(0, 10).forEach(d => {
          const statusColor = getStatusColor(d.status);
          console.log(`${statusColor('●')} ${d.journeyName}`);
          console.log(`   ID: ${chalk.gray(d.id)}`);
          console.log(`   Status: ${statusColor(d.status)}`);
          console.log(`   Started: ${new Date(d.startedAt).toLocaleString()}`);
          console.log('');
        });

        if (history.length > 10) {
          console.log(chalk.gray(`... and ${history.length - 10} more`));
        }
        console.log('');
      }

    } catch (error) {
      console.log(chalk.red('\n✗ Failed to get status\n'));
      console.log(chalk.red(`Error: ${error.message}\n`));
      process.exit(1);
    }
  });

// Helper function for status colors
function getStatusColor(status) {
  switch (status) {
    case 'completed':
    case 'published':
      return chalk.green;
    case 'failed':
    case 'rolled_back':
      return chalk.red;
    case 'in_progress':
      return chalk.blue;
    case 'partial':
      return chalk.yellow;
    default:
      return chalk.gray;
  }
}

// ==================== ONBOARDING COMMANDS ====================

// Main onboarding wizard
program
  .command('onboard')
  .description('Run full client onboarding wizard')
  .requiredOption('--client <slug>', 'Client folder slug')
  .requiredOption('--website <url>', 'Client website URL')
  .requiredOption('--ghl-location-id <id>', 'GoHighLevel location ID')
  .option('--industry <type>', 'Industry type', 'wedding-venue')
  .option('--dry-run', 'Show what would be done without making changes', false)
  .option('--skip-crawl', 'Skip website crawling', false)
  .option('--skip-ai', 'Skip AI extraction and analysis', false)
  .option('--skip-ghl', 'Skip GHL data extraction', false)
  .option('--skip-journeys', 'Skip journey generation', false)
  .action(async (options) => {
    const wizard = new OnboardingWizard(options);
    
    try {
      const result = await wizard.run();
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error(chalk.red(`\nFatal error: ${error.message}`));
      process.exit(1);
    }
  });

// Extract GHL data only
program
  .command('extract-ghl')
  .description('Extract all data from GHL for a client')
  .requiredOption('--client <slug>', 'Client folder slug')
  .requiredOption('--ghl-location-id <id>', 'GoHighLevel location ID')
  .option('--api-key <key>', 'GHL API key (or set GHL_API_KEY env var)')
  .action(async (options) => {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║         GHL Data Extraction                    ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    try {
      const extractor = new GHLAutoExtractionService(
        options.client,
        options.ghlLocationId,
        options.apiKey
      );

      const results = await extractor.runFullExtraction();
      
      console.log(chalk.green('\n✓ Extraction complete'));
      console.log(`\nResults saved to: clients/${options.client}/api-responses/`);
      console.log(`Location config: clients/${options.client}/location-config.json\n`);
      
      process.exit(0);
    } catch (error) {
      console.log(chalk.red(`\n✗ Extraction failed: ${error.message}\n`));
      process.exit(1);
    }
  });

// Validate setup
program
  .command('validate-setup')
  .description('Validate client setup')
  .requiredOption('--client <slug>', 'Client folder slug')
  .option('--save-report', 'Save validation report to file', false)
  .action(async (options) => {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║         Setup Validation                       ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    try {
      const validator = new SetupValidator(options.client);
      const report = await validator.runAllValidations();
      
      validator.printSummary();
      
      if (options.saveReport) {
        await validator.saveReport();
      }
      
      process.exit(report.summary.isValid ? 0 : 1);
    } catch (error) {
      console.log(chalk.red(`\n✗ Validation failed: ${error.message}\n`));
      process.exit(1);
    }
  });

// Fix setup issues
program
  .command('fix-setup')
  .description('Auto-fix common setup issues')
  .requiredOption('--client <slug>', 'Client folder slug')
  .action(async (options) => {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║         Fix Setup Issues                       ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    try {
      const validator = new SetupValidator(options.client);
      const report = await validator.runAllValidations();
      
      console.log('Checking for fixable issues...\n');
      
      let fixes = 0;
      
      // Check if Knowledge Hub needs initialization
      const hub = new KnowledgeHub(options.client);
      if (!await hub.isInitialized()) {
        console.log('Initializing Knowledge Hub...');
        await hub.initialize();
        console.log(chalk.green('✓ Knowledge Hub initialized'));
        fixes++;
      }
      
      // Check for missing template files
      const templateDir = path.join(repoRoot, 'templates', 'standard-client');
      const clientDir = path.join(repoRoot, 'clients', options.client);
      
      const requiredFiles = [
        'contacts/contact-template.json',
        'contacts/custom-fields.json',
        'opportunities/pipelines.json',
        'workflows/workflow-templates.json'
      ];
      
      for (const file of requiredFiles) {
        const destPath = path.join(clientDir, file);
        try {
          await fs.access(destPath);
        } catch {
          const srcPath = path.join(templateDir, file);
          try {
            await fs.mkdir(path.dirname(destPath), { recursive: true });
            const content = await fs.readFile(srcPath, 'utf8');
            await fs.writeFile(destPath, content, 'utf8');
            console.log(chalk.green(`✓ Created: ${file}`));
            fixes++;
          } catch (e) {
            console.log(chalk.yellow(`⚠ Could not create: ${file}`));
          }
        }
      }
      
      if (fixes === 0) {
        console.log(chalk.green('No issues found that can be auto-fixed.\n'));
      } else {
        console.log(chalk.green(`\n✓ Fixed ${fixes} issue(s)\n`));
      }
      
      process.exit(0);
    } catch (error) {
      console.log(chalk.red(`\n✗ Fix failed: ${error.message}\n`));
      process.exit(1);
    }
  });

// Generate onboarding report
program
  .command('onboarding-report')
  .description('Generate onboarding report for a client')
  .requiredOption('--client <slug>', 'Client folder slug')
  .option('--format <format>', 'Output format (md, html, both)', 'both')
  .action(async (options) => {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║         Onboarding Report                      ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    try {
      const generator = new OnboardingReportGenerator(options.client);
      
      const reports = await generator.generate({
        saveMarkdown: ['md', 'both'].includes(options.format),
        saveHTML: ['html', 'both'].includes(options.format)
      });
      
      console.log(chalk.green('\n✓ Reports generated'));
      if (reports.files.markdown) {
        console.log(`  Markdown: ${reports.files.markdown}`);
      }
      if (reports.files.html) {
        console.log(`  HTML: ${reports.files.html}`);
      }
      console.log('');
      
      process.exit(0);
    } catch (error) {
      console.log(chalk.red(`\n✗ Report generation failed: ${error.message}\n`));
      process.exit(1);
    }
  });

// Generate default journeys
program
  .command('generate-journeys')
  .description('Generate default journeys for a client')
  .requiredOption('--client <slug>', 'Client folder slug')
  .option('--create-in-airtable', 'Also create journeys in Airtable', false)
  .action(async (options) => {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║         Generate Default Journeys              ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    try {
      const generator = new JourneyGenerator(options.client);
      const result = await generator.run({
        createInAirtable: options.createInAirtable
      });
      
      console.log(chalk.green('\n✓ Journey generation complete'));
      console.log(`\nJourneys created: ${result.summary.journeysCreated}`);
      console.log(`Total touchpoints: ${result.summary.totalTouchpoints}`);
      console.log(`\nFiles saved to: clients/${options.client}/journeys/\n`);
      
      if (result.airtable) {
        console.log('Airtable:');
        console.log(`  Journeys: ${result.airtable.journeys.length}`);
        console.log(`  Touchpoints: ${result.airtable.touchpoints.length}\n`);
      }
      
      process.exit(0);
    } catch (error) {
      console.log(chalk.red(`\n✗ Journey generation failed: ${error.message}\n`));
      process.exit(1);
    }
  });

// Sync local journeys to Airtable
program
  .command('sync:airtable')
  .description('Sync local journey files to Airtable')
  .requiredOption('--client <slug>', 'Client folder slug')
  .option('--dry-run', 'Show what would be synced without making changes', false)
  .option('--skip-existing', 'Skip records that already exist in Airtable', false)
  .option('--mock', 'Run in mock mode without connecting to Airtable', false)
  .action(async (options) => {
    const { syncJourneysToAirtable } = await import('./scripts/sync-journeys-to-airtable.js');
    
    const result = await syncJourneysToAirtable({
      client: options.client,
      dryRun: options.dryRun,
      skipExisting: options.skipExisting,
      mockMode: options.mock
    });
    
    process.exit(result.success ? 0 : 1);
  });

// Parse and execute
program.parse();

export default program;
