/**
 * CLI Onboarding Wizard
 * Interactive CLI for client onboarding automation
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

import { GHLAutoExtractionService } from './services/ghl-auto-extract.js';
import { KnowledgeHub } from './services/knowledge-hub.js';
import { FactExtractionService } from './services/ai-extraction.js';
import { BrandVoiceAnalyzer } from './services/brand-voice-analyzer.js';
import { JourneyGenerator } from './services/journey-generator.js';
import { SetupValidator } from './utils/setup-validator.js';
import { OnboardingReportGenerator } from './utils/onboarding-report.js';
import { crawlAndPopulateHub } from './journey-builder/crawler.js';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

export class OnboardingWizard {
  constructor(options = {}) {
    this.clientSlug = options.client;
    this.website = options.website;
    this.ghlLocationId = options.ghlLocationId;
    this.industry = options.industry || 'wedding-venue';
    this.dryRun = options.dryRun || false;
    this.skipCrawl = options.skipCrawl || false;
    this.skipAI = options.skipAI || false;
    this.skipGHL = options.skipGHL || false;
    this.skipJourneys = options.skipJourneys || false;
    
    this.results = {
      timestamp: new Date().toISOString(),
      clientSlug: this.clientSlug,
      steps: {}
    };
    
    this.reportGenerator = new OnboardingReportGenerator(this.clientSlug);
  }

  /**
   * Log step result
   */
  logStep(step, status, details = null) {
    this.results.steps[step] = { status, details, timestamp: new Date().toISOString() };
    
    const icon = status === 'success' ? chalk.green('✓') : 
                 status === 'warning' ? chalk.yellow('⚠') : 
                 status === 'error' ? chalk.red('✗') : chalk.blue('→');
    
    console.log(`  ${icon} ${step}${details ? `: ${details}` : ''}`);
  }

  /**
   * Validate inputs
   */
  async validateInputs() {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║    Step 1: Validating Inputs                   ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    // Validate client slug
    if (!this.clientSlug) {
      throw new Error('Client slug is required (--client)');
    }
    
    if (!/^[a-z0-9-]+$/.test(this.clientSlug)) {
      throw new Error('Client slug must contain only lowercase letters, numbers, and hyphens');
    }

    this.logStep('Client slug', 'success', this.clientSlug);

    // Validate website
    if (!this.website) {
      throw new Error('Website URL is required (--website)');
    }

    try {
      new URL(this.website);
      this.logStep('Website URL format', 'success');
    } catch {
      throw new Error('Invalid website URL format');
    }

    // Test website reachability
    if (!this.dryRun) {
      const spinner = ora('Testing website reachability...').start();
      try {
        const response = await axios.get(this.website, {
          timeout: 15000,
          maxRedirects: 5,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; BloomBuilder/1.0)'
          }
        });
        spinner.succeed(`Website reachable (${response.status})`);
        this.logStep('Website reachable', 'success');
      } catch (error) {
        spinner.fail(`Website unreachable: ${error.message}`);
        this.logStep('Website reachable', 'warning', 'Site may have restrictions');
      }
    }

    // Validate GHL location ID
    if (!this.ghlLocationId) {
      throw new Error('GHL Location ID is required (--ghl-location-id)');
    }

    this.logStep('GHL Location ID', 'success', this.ghlLocationId);

    // Test GHL connection
    if (!this.dryRun && !this.skipGHL) {
      const spinner = ora('Testing GHL connection...').start();
      try {
        const extractor = new GHLAutoExtractionService(this.clientSlug, this.ghlLocationId);
        const test = await extractor.testConnection();
        
        if (test.success) {
          spinner.succeed(`GHL connection successful: ${test.locationName}`);
          this.logStep('GHL connection', 'success', test.locationName);
        } else {
          spinner.fail(`GHL connection failed: ${test.message}`);
          throw new Error(`Cannot connect to GHL: ${test.message}`);
        }
      } catch (error) {
        spinner.fail(`GHL connection failed: ${error.message}`);
        throw error;
      }
    }

    return true;
  }

  /**
   * Create client directory from templates
   */
  async createClientDirectory() {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║    Step 2: Creating Client Directory           ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    if (this.dryRun) {
      this.logStep('Directory creation', 'success', '(dry run - would create)');
      return;
    }

    const clientDir = path.join(repoRoot, 'clients', this.clientSlug);
    const templateDir = path.join(repoRoot, 'templates', 'standard-client');

    try {
      // Check if client already exists
      try {
        await fs.access(clientDir);
        this.logStep('Client directory', 'warning', 'Already exists');
      } catch {
        // Create directory structure
        await fs.mkdir(clientDir, { recursive: true });
        
        // Copy template files
        const templateFiles = [
          'README.md',
          'location-config.json',
          'contacts/contact-template.json',
          'contacts/custom-fields.json',
          'opportunities/pipelines.json',
          'workflows/workflow-templates.json',
          'calendars/calendar-config.json',
          'emails/email-templates.json',
          'forms/form-configurations.json'
        ];

        for (const file of templateFiles) {
          const srcPath = path.join(templateDir, file);
          const destPath = path.join(clientDir, file);
          
          try {
            await fs.mkdir(path.dirname(destPath), { recursive: true });
            const content = await fs.readFile(srcPath, 'utf8');
            
            // Transform template content
            const transformed = content
              .replace(/\{\{CLIENT_SLUG\}\}/g, this.clientSlug)
              .replace(/\{\{WEBSITE_URL\}\}/g, this.website);
            
            await fs.writeFile(destPath, transformed, 'utf8');
          } catch (error) {
            logger.warn(`Could not copy template file: ${file}`);
          }
        }
        
        this.logStep('Client directory', 'success', clientDir);
      }
    } catch (error) {
      this.logStep('Directory creation', 'error', error.message);
      throw error;
    }
  }

  /**
   * Fetch GHL location data
   */
  async fetchGHLData() {
    if (this.skipGHL) {
      this.logStep('GHL extraction', 'success', 'skipped');
      return;
    }

    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║    Step 3: Fetching GHL Location Data          ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    if (this.dryRun) {
      this.logStep('GHL extraction', 'success', '(dry run - would extract location, pipelines, templates, etc.)');
      return;
    }

    const spinner = ora('Extracting GHL data...').start();
    
    try {
      const extractor = new GHLAutoExtractionService(this.clientSlug, this.ghlLocationId);
      const results = await extractor.runFullExtraction();
      
      spinner.succeed('GHL extraction complete');
      
      this.logStep('Location details', 'success', results.steps.location.name);
      this.logStep('Pipelines', 'success', `${results.steps.pipelines.count} found`);
      this.logStep('Email templates', 'success', `${results.steps.emailTemplates.count} found`);
      this.logStep('SMS templates', 'success', `${results.steps.smsTemplates.count} found`);
      this.logStep('Custom fields', 'success', `${results.steps.customFields.count} found`);
      this.logStep('Calendars', 'success', `${results.steps.calendars.count} found`);
      this.logStep('Forms', 'success', `${results.steps.forms.count} found`);
      this.logStep('Workflows', 'success', `${results.steps.workflows.count} found`);

      this.reportGenerator.setExtractedData({
        locationName: results.steps.location.name,
        pipelines: results.steps.pipelines.count,
        emailTemplates: results.steps.emailTemplates.count,
        smsTemplates: results.steps.smsTemplates.count,
        customFields: results.steps.customFields.count,
        calendars: results.steps.calendars.count,
        forms: results.steps.forms.count,
        workflows: results.steps.workflows.count
      });

    } catch (error) {
      spinner.fail(`GHL extraction failed: ${error.message}`);
      this.logStep('GHL extraction', 'error', error.message);
      throw error;
    }
  }

  /**
   * Crawl website and populate Knowledge Hub
   */
  async crawlWebsite() {
    if (this.skipCrawl) {
      this.logStep('Website crawl', 'success', 'skipped');
      return;
    }

    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║    Step 4: Crawling Website                    ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    if (this.dryRun) {
      this.logStep('Website crawl', 'success', '(dry run - would crawl up to 40 pages)');
      return;
    }

    // Initialize Knowledge Hub if needed
    const hub = new KnowledgeHub(this.clientSlug);
    const isInitialized = await hub.isInitialized();
    
    if (!isInitialized) {
      const spinner = ora('Initializing Knowledge Hub...').start();
      await hub.initialize({ website: this.website });
      spinner.succeed('Knowledge Hub initialized');
    }

    // Crawl website
    const spinner = ora(`Crawling ${this.website}...`).start();
    
    try {
      const result = await crawlAndPopulateHub(this.clientSlug, this.website, {
        maxPages: 40,
        maxDepth: 3,
        dryRun: false
      });

      spinner.succeed(`Crawl complete: ${result.pagesCrawled} pages`);
      
      this.logStep('Pages crawled', 'success', `${result.pagesCrawled}`);
      this.logStep('Pages added', 'success', `${result.pagesAdded}`);
      this.logStep('Facts extracted', 'success', `${result.factsExtracted}`);

      this.reportGenerator.recordStep('websiteCrawl', 'success', {
        pages: result.pagesCrawled,
        facts: result.factsExtracted
      });

    } catch (error) {
      spinner.fail(`Crawl failed: ${error.message}`);
      this.logStep('Website crawl', 'error', error.message);
      throw error;
    }
  }

  /**
   * Run AI extraction
   */
  async runAIExtraction() {
    if (this.skipAI) {
      this.logStep('AI extraction', 'success', 'skipped');
      return;
    }

    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║    Step 5: Running AI Extraction               ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    if (this.dryRun) {
      this.logStep('AI fact extraction', 'success', '(dry run - would extract facts from pages)');
      this.logStep('Brand voice analysis', 'success', '(dry run - would analyze brand voice)');
      return;
    }

    // Check OpenAI key
    if (!process.env.OPENAI_API_KEY) {
      this.logStep('AI extraction', 'warning', 'OPENAI_API_KEY not set - skipping');
      return;
    }

    // Extract facts
    const factSpinner = ora('Extracting facts with AI...').start();
    
    try {
      const extractor = new FactExtractionService(this.clientSlug);
      const result = await extractor.extractAllFacts();

      factSpinner.succeed(`Fact extraction complete: ${result.factsExtracted} facts`);
      
      this.logStep('Facts extracted', 'success', `${result.factsExtracted}`);
      this.logStep('Facts queued for review', 'success', `${result.factsQueued}`);

    } catch (error) {
      factSpinner.fail(`Fact extraction failed: ${error.message}`);
      this.logStep('AI fact extraction', 'warning', error.message);
    }

    // Analyze brand voice
    const voiceSpinner = ora('Analyzing brand voice...').start();
    
    try {
      const analyzer = new BrandVoiceAnalyzer(this.clientSlug);
      const result = await analyzer.runFullAnalysis();

      voiceSpinner.succeed(`Brand voice analysis complete`);
      
      this.logStep('Brand voice analyzed', 'success', `${result.pagesAnalyzed} pages`);
      this.logStep('Voice adjectives', 'success', result.profile.voice?.adjectives?.join(', ') || 'N/A');

      this.reportGenerator.recordStep('aiExtraction', 'success');

    } catch (error) {
      voiceSpinner.fail(`Brand voice analysis failed: ${error.message}`);
      this.logStep('Brand voice analysis', 'warning', error.message);
    }
  }

  /**
   * Generate default journeys
   */
  async generateJourneys() {
    if (this.skipJourneys) {
      this.logStep('Journey generation', 'success', 'skipped');
      return;
    }

    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║    Step 6: Generating Default Journeys         ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    if (this.dryRun) {
      this.logStep('Journey generation', 'success', '(dry run - would create 5 journeys with 17 touchpoints)');
      return;
    }

    const spinner = ora('Generating default journeys...').start();
    
    try {
      const generator = new JourneyGenerator(this.clientSlug);
      const result = await generator.run({ createInAirtable: true });

      spinner.succeed(`Generated ${result.summary.journeysCreated} journeys`);
      
      result.summary.journeys.forEach(j => {
        this.logStep(j.name, 'success', `${j.touchpointCount} touchpoints`);
      });

      this.reportGenerator.setJourneys(result.summary.journeys);
      this.reportGenerator.recordStep('journeyGeneration', 'success', {
        journeys: result.summary.journeysCreated,
        touchpoints: result.summary.totalTouchpoints
      });

    } catch (error) {
      spinner.fail(`Journey generation failed: ${error.message}`);
      this.logStep('Journey generation', 'error', error.message);
      throw error;
    }
  }

  /**
   * Validate complete setup
   */
  async validateSetup() {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║    Step 7: Validating Setup                    ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    const validator = new SetupValidator(this.clientSlug);
    
    if (this.dryRun) {
      this.logStep('Validation', 'success', '(dry run - would run full validation)');
      return { valid: true };
    }

    const spinner = ora('Running validation checks...').start();
    
    try {
      const report = await validator.runAllValidations({
        skipConnections: true, // Already validated
        skipWebsite: true      // Already validated
      });

      spinner.succeed('Validation complete');

      const passed = report.summary.passed;
      const failed = report.summary.failed;
      const warnings = report.summary.warnings;

      this.logStep('Checks passed', 'success', `${passed}`);
      if (warnings > 0) this.logStep('Warnings', 'warning', `${warnings}`);
      if (failed > 0) this.logStep('Checks failed', 'error', `${failed}`);

      // Show critical errors
      if (report.errors.length > 0) {
        console.log(chalk.red('\n  Critical Issues:'));
        report.errors.slice(0, 5).forEach(e => {
          console.log(chalk.red(`    ✗ ${e.check}: ${e.message}`));
        });
      }

      this.reportGenerator.recordStep('validation', failed === 0 ? 'success' : 'warning', {
        passed,
        failed,
        warnings
      });

      return report;

    } catch (error) {
      spinner.fail(`Validation failed: ${error.message}`);
      this.logStep('Validation', 'error', error.message);
      throw error;
    }
  }

  /**
   * Generate onboarding report
   */
  async generateReport() {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║    Step 8: Generating Onboarding Report        ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));

    if (this.dryRun) {
      this.logStep('Report generation', 'success', '(dry run - would generate reports)');
      return;
    }

    const spinner = ora('Generating reports...').start();
    
    try {
      this.reportGenerator.setNextSteps([
        'Review extracted facts in Knowledge Hub',
        'Verify brand voice profile accuracy',
        'Edit default journey touchpoints in Airtable',
        'Add any missing facts manually',
        'Get client approval on messaging',
        'Test journeys before deployment',
        'Deploy to production when ready'
      ]);

      const reports = await this.reportGenerator.generate();

      spinner.succeed('Reports generated');
      
      this.logStep('Markdown report', 'success', 'ONBOARDING-REPORT.md');
      this.logStep('HTML report', 'success', 'ONBOARDING-REPORT.html');

      // Print summary
      await this.reportGenerator.printSummary();

    } catch (error) {
      spinner.fail(`Report generation failed: ${error.message}`);
      this.logStep('Report generation', 'error', error.message);
    }
  }

  /**
   * Run the complete onboarding wizard
   */
  async run() {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║    BloomBuilder Client Onboarding Wizard       ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════╝'));

    if (this.dryRun) {
      console.log(chalk.yellow('\n⚠ DRY RUN MODE - No changes will be made\n'));
    }

    const startTime = Date.now();

    try {
      // Run all steps
      await this.validateInputs();
      await this.createClientDirectory();
      await this.fetchGHLData();
      await this.crawlWebsite();
      await this.runAIExtraction();
      await this.generateJourneys();
      const validation = await this.validateSetup();
      await this.generateReport();

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      console.log(chalk.green('\n╔════════════════════════════════════════════════╗'));
      console.log(chalk.green('║    Onboarding Complete!                        ║'));
      console.log(chalk.green('╚════════════════════════════════════════════════╝'));
      console.log(chalk.gray(`\nDuration: ${duration}s`));
      console.log(`Client: ${chalk.cyan(this.clientSlug)}`);
      console.log(`Location: ${chalk.cyan(this.ghlLocationId)}`);
      console.log(`\nReports saved to:`);
      console.log(`  - clients/${this.clientSlug}/ONBOARDING-REPORT.md`);
      console.log(`  - clients/${this.clientSlug}/ONBOARDING-REPORT.html\n`);

      if (this.dryRun) {
        console.log(chalk.yellow('This was a dry run. No changes were made.'));
        console.log(chalk.yellow(`To run for real: npm run onboard -- --client=${this.clientSlug} --website=${this.website} --ghl-location-id=${this.ghlLocationId}\n`));
      }

      return {
        success: true,
        duration,
        results: this.results,
        validation
      };

    } catch (error) {
      console.log(chalk.red('\n╔════════════════════════════════════════════════╗'));
      console.log(chalk.red('║    Onboarding Failed                           ║'));
      console.log(chalk.red('╚════════════════════════════════════════════════╝'));
      console.log(chalk.red(`\nError: ${error.message}\n`));
      
      throw error;
    }
  }
}

// CLI Entry Point
export async function runCLI() {
  const program = new Command();

  program
    .name('onboard')
    .description('BloomBuilder Client Onboarding Wizard')
    .version('1.0.0')
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
        await wizard.run();
        process.exit(0);
      } catch (error) {
        console.error(chalk.red(`\nFatal error: ${error.message}`));
        process.exit(1);
      }
    });

  await program.parseAsync(process.argv);
}

// Export for programmatic use
export default OnboardingWizard;
