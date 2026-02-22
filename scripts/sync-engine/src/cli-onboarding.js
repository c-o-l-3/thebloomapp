/**
 * CLI Onboarding Wizard - BLOOM-205 Improvements
 * Interactive CLI for client onboarding automation with improved UX
 * 
 * Improvements:
 * - 7-step interactive wizard flow
 * - inquirer.js prompts for better UX
 * - Progress save/resume capability (--resume flag)
 * - Step-by-step validation
 * - Progress indicators and colored output
 * - --skip-validation flag for faster iteration
 * - Backward compatible with existing CLI
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { createRequire } from 'module';

import { GHLAutoExtractionService } from './services/ghl-auto-extract.js';
import { KnowledgeHub } from './services/knowledge-hub.js';
import { FactExtractionService } from './services/ai-extraction.js';
import { BrandVoiceAnalyzer } from './services/brand-voice-analyzer.js';
import { JourneyGenerator } from './services/journey-generator.js';
import { SetupValidator, ValidationStatus, runValidation } from './utils/setup-validator.js';
import { OnboardingReportGenerator } from './utils/onboarding-report.js';
import { crawlAndPopulateHub } from './journey-builder/crawler.js';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

// Progress file path for resume functionality
const PROGRESS_FILE = path.join(repoRoot, '.onboarding-progress.json');

// Wizard steps definition
const WIZARD_STEPS = [
  { id: 'welcome', name: 'Welcome & Client Selection', weight: 5 },
  { id: 'ghl-credentials', name: 'GHL API Credentials', weight: 15 },
  { id: 'airtable-setup', name: 'Airtable Connection', weight: 15 },
  { id: 'brand-voice', name: 'Brand Voice Configuration', weight: 20 },
  { id: 'email-templates', name: 'Email Template Selection', weight: 15 },
  { id: 'review', name: 'Review & Confirm', weight: 10 },
  { id: 'execute', name: 'Execute Setup', weight: 20 }
];

/**
 * Get total weight for progress calculation
 */
function getTotalWeight() {
  return WIZARD_STEPS.reduce((sum, step) => sum + step.weight, 0);
}

/**
 * Calculate progress percentage
 */
function calculateProgress(completedSteps) {
  const completedWeight = completedSteps.reduce((sum, stepId) => {
    const step = WIZARD_STEPS.find(s => s.id === stepId);
    return sum + (step?.weight || 0);
  }, 0);
  return Math.round((completedWeight / getTotalWeight()) * 100);
}

/**
 * Format time estimate
 */
function formatTimeEstimate(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
  return `${Math.ceil(seconds / 3600)}h ${Math.ceil((seconds % 3600) / 60)}m`;
}

/**
 * Onboarding State Manager - Handles save/resume functionality
 */
export class OnboardingStateManager {
  constructor() {
    this.progressFile = PROGRESS_FILE;
  }

  /**
   * Save current progress
   */
  async save(state) {
    try {
      const data = {
        ...state,
        savedAt: new Date().toISOString(),
        version: '2.0'
      };
      await fs.writeFile(this.progressFile, JSON.stringify(data, null, 2), 'utf8');
      logger.info('Progress saved', { step: state.currentStep });
      return true;
    } catch (error) {
      logger.warn('Failed to save progress', { error: error.message });
      return false;
    }
  }

  /**
   * Load saved progress
   */
  async load() {
    try {
      const data = await fs.readFile(this.progressFile, 'utf8');
      const state = JSON.parse(data);
      logger.info('Progress loaded', { step: state.currentStep, savedAt: state.savedAt });
      return state;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear saved progress
   */
  async clear() {
    try {
      await fs.unlink(this.progressFile);
      logger.info('Progress cleared');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if there's saved progress
   */
  async hasProgress() {
    try {
      await fs.access(this.progressFile);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get progress age in minutes
   */
  async getProgressAge() {
    try {
      const state = await this.load();
      if (!state?.savedAt) return null;
      const saved = new Date(state.savedAt);
      const now = new Date();
      return Math.round((now - saved) / (1000 * 60));
    } catch {
      return null;
    }
  }
}

/**
 * Interactive Onboarding Wizard - Improved UX with inquirer.js
 */
export class InteractiveOnboardingWizard {
  constructor(options = {}) {
    this.clientSlug = options.client;
    this.website = options.website;
    this.ghlLocationId = options.ghlLocationId;
    this.industry = options.industry || 'wedding-venue';
    this.dryRun = options.dryRun || false;
    this.skipValidation = options.skipValidation || false;
    this.resume = options.resume || false;
    this.nonInteractive = options.nonInteractive || false;
    
    // Track which steps are completed
    this.completedSteps = [];
    this.currentStepIndex = 0;
    
    this.results = {
      timestamp: new Date().toISOString(),
      clientSlug: this.clientSlug,
      steps: {},
      config: {}
    };
    
    this.reportGenerator = null;
    this.stateManager = new OnboardingStateManager();
    this.startTime = null;
    this.stepStartTime = null;
    
    // Validation cache
    this.validationCache = new Map();
    
    // Validation results tracking
    this.validationResults = {
      preSetup: null,
      steps: {}
    };
  }

  /**
   * Run pre-setup validation before wizard starts
   */
  async runPreValidation() {
    if (this.skipValidation) {
      console.log(chalk.yellow('⚠ Pre-validation skipped (--skip-validation flag)\n'));
      return { skipped: true };
    }

    console.log(chalk.cyan('\n╔════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║  Pre-Setup Validation                                  ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════════════╝\n'));

    const validator = new SetupValidator(null, { silent: true });
    const spinner = ora('Running pre-setup validation...').start();

    try {
      // Run pre-validation checks
      await validator.validateNodeVersion();
      await validator.validateEnvironmentVariables();
      await validator.validateEnvFile();
      await validator.validateDiskSpace();

      const report = validator.generateReport();
      this.validationResults.preSetup = report;

      const failed = report.summary.failed;
      const warnings = report.summary.warnings;

      if (failed > 0) {
        spinner.fail(`${failed} critical issue(s) found`);
        
        // Show errors with fix instructions
        console.log(chalk.red('\n❌ Critical Issues:'));
        report.errors.forEach(e => {
          console.log(chalk.red(`  ✗ ${e.check}: ${e.message}`));
          if (e.fixInstructions) {
            e.fixInstructions.forEach(fix => {
              console.log(chalk.gray(`    → ${fix}`));
            });
          }
        });

        if (!this.nonInteractive) {
          const { continueAnyway } = await inquirer.prompt([{
            type: 'confirm',
            name: 'continueAnyway',
            message: 'Continue anyway? (Not recommended)',
            default: false
          }]);

          if (!continueAnyway) {
            throw new Error('Pre-setup validation failed');
          }
        } else {
          throw new Error('Pre-setup validation failed');
        }
      } else if (warnings > 0) {
        spinner.succeed(`Pre-validation passed with ${warnings} warning(s)`);
        
        if (!this.nonInteractive) {
          console.log(chalk.yellow('\n⚠ Warnings:'));
          report.warnings.slice(0, 3).forEach(w => {
            console.log(chalk.yellow(`  ⚠ ${w.check}: ${w.message}`));
          });
          
          const { continueWithWarnings } = await inquirer.prompt([{
            type: 'confirm',
            name: 'continueWithWarnings',
            message: 'Continue with warnings?',
            default: true
          }]);

          if (!continueWithWarnings) {
            throw new Error('Setup cancelled by user');
          }
        }
      } else {
        spinner.succeed('Pre-setup validation passed');
      }

      return report;
    } catch (error) {
      spinner.fail('Pre-validation failed');
      throw error;
    }
  }

  /**
   * Validate a specific step and cache results
   */
  async validateStep(stepId, validationFn) {
    if (this.skipValidation) {
      return { skipped: true };
    }

    const cacheKey = `${stepId}-${Date.now()}`;
    
    try {
      const result = await validationFn();
      this.validationCache.set(cacheKey, result);
      this.validationResults.steps[stepId] = result;
      return result;
    } catch (error) {
      const errorResult = {
        status: ValidationStatus.FAIL,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      this.validationCache.set(cacheKey, errorResult);
      this.validationResults.steps[stepId] = errorResult;
      return errorResult;
    }
  }

  /**
   * Save validation results to state
   */
  async saveValidationState() {
    const state = await this.stateManager.load() || {};
    state.validationResults = this.validationResults;
    state.validatedAt = new Date().toISOString();
    await this.stateManager.save(state);
  }

  /**
   * Print wizard header
   */
  printHeader(title, subtitle = null) {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan(`║  ${title.padEnd(52)}║`));
    if (subtitle) {
      console.log(chalk.cyan(`║  ${chalk.gray(subtitle).padEnd(52)}║`));
    }
    console.log(chalk.cyan('╚════════════════════════════════════════════════════════╝\n'));
  }

  /**
   * Print progress bar
   */
  printProgress() {
    const progress = calculateProgress(this.completedSteps);
    const filled = Math.round(progress / 2); // 50 chars width
    const empty = 50 - filled;
    const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
    console.log(`\n${chalk.cyan('Progress:')} [${bar}] ${chalk.bold(`${progress}%`)}`);
    
    // Show completed steps
    if (this.completedSteps.length > 0) {
      const currentStep = WIZARD_STEPS[this.currentStepIndex];
      console.log(`${chalk.gray('Completed:')} ${this.completedSteps.length}/${WIZARD_STEPS.length} steps`);
      if (currentStep) {
        console.log(`${chalk.gray('Current:')} ${currentStep.name}`);
      }
    }
    console.log('');
  }

  /**
   * Log step result with icon
   */
  logStep(step, status, details = null, duration = null) {
    this.results.steps[step] = { 
      status, 
      details, 
      timestamp: new Date().toISOString(),
      duration 
    };
    
    const icon = status === 'success' ? chalk.green('✓') : 
                 status === 'warning' ? chalk.yellow('⚠') : 
                 status === 'error' ? chalk.red('✗') : 
                 status === 'skipped' ? chalk.gray('○') : chalk.blue('→');
    
    const durationStr = duration ? chalk.gray(` (${duration}s)`) : '';
    console.log(`  ${icon} ${step}${details ? `: ${details}` : ''}${durationStr}`);
  }

  /**
   * Show error with suggestions
   */
  showError(message, suggestions = []) {
    console.log(chalk.red(`\n  ✗ Error: ${message}`));
    if (suggestions.length > 0) {
      console.log(chalk.yellow('\n  Suggestions:'));
      suggestions.forEach((s, i) => {
        console.log(`    ${i + 1}. ${s}`);
      });
    }
    console.log('');
  }

  /**
   * Check if step should be skipped (already configured)
   */
  async shouldSkipStep(stepId) {
    if (!this.clientSlug) return false;
    
    const clientDir = path.join(repoRoot, 'clients', this.clientSlug);
    
    switch (stepId) {
      case 'ghl-credentials': {
        try {
          const configPath = path.join(clientDir, 'location-config.json');
          const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
          return config.locationId && config.name;
        } catch {
          return false;
        }
      }
      case 'airtable-setup': {
        // Check if Airtable connection is already configured
        try {
          const { loadClientLocationConfig } = await import('./journey-builder/client-loader.js');
          const { locationConfig } = await loadClientLocationConfig(this.clientSlug);
          return locationConfig.airtable?.baseId || locationConfig.airtable?.isConnected;
        } catch {
          return false;
        }
      }
      case 'brand-voice': {
        try {
          const hub = new KnowledgeHub(this.clientSlug);
          const profile = await hub.getBrandVoice();
          return profile.voice?.adjectives?.length > 0;
        } catch {
          return false;
        }
      }
      case 'email-templates': {
        try {
          const templatesPath = path.join(clientDir, 'emails', 'email-templates.json');
          const templates = JSON.parse(await fs.readFile(templatesPath, 'utf8'));
          return templates.templates?.length > 0;
        } catch {
          return false;
        }
      }
      default:
        return false;
    }
  }

  /**
   * Step 1: Welcome & Client Selection
   */
  async step1_Welcome() {
    this.printHeader('Step 1: Welcome & Client Selection');
    this.stepStartTime = Date.now();

    if (this.nonInteractive) {
      // Non-interactive mode - use provided options
      if (!this.clientSlug) {
        throw new Error('Client slug is required (--client) in non-interactive mode');
      }
      this.logStep('Client selection', 'success', this.clientSlug);
      this.completedSteps.push('welcome');
      return { clientSlug: this.clientSlug };
    }

    // Get existing clients
    const clientsDir = path.join(repoRoot, 'clients');
    let existingClients = [];
    try {
      const entries = await fs.readdir(clientsDir, { withFileTypes: true });
      existingClients = entries
        .filter(e => e.isDirectory() && !e.name.startsWith('.'))
        .map(e => e.name);
    } catch {
      // Directory doesn't exist yet
    }

    // Ask user what they want to do
    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: '🆕 Create new client', value: 'new' },
        ...(existingClients.length > 0 ? [
          { name: '📁 Select existing client', value: 'existing' }
        ] : []),
        { name: '❌ Exit', value: 'exit' }
      ]
    }]);

    if (action === 'exit') {
      console.log(chalk.yellow('\nExiting...'));
      process.exit(0);
    }

    let selectedClient = null;

    if (action === 'existing') {
      const { client } = await inquirer.prompt([{
        type: 'list',
        name: 'client',
        message: 'Select a client:',
        choices: existingClients.map(c => ({ name: c, value: c }))
      }]);
      selectedClient = client;
      
      // Ask if they want to skip already configured sections
      const { skipConfigured } = await inquirer.prompt([{
        type: 'confirm',
        name: 'skipConfigured',
        message: 'Skip already-configured sections?',
        default: true
      }]);
      this.skipConfigured = skipConfigured;
    } else {
      // Create new client
      const { clientSlug } = await inquirer.prompt([{
        type: 'input',
        name: 'clientSlug',
        message: 'Enter client slug (lowercase, hyphens only):',
        validate: (input) => {
          if (!input) return 'Client slug is required';
          if (!/^[a-z0-9-]+$/.test(input)) {
            return 'Slug must contain only lowercase letters, numbers, and hyphens';
          }
          if (existingClients.includes(input)) {
            return 'Client already exists';
          }
          return true;
        }
      }]);
      selectedClient = clientSlug;
    }

    this.clientSlug = selectedClient;
    this.reportGenerator = new OnboardingReportGenerator(this.clientSlug);
    
    const duration = ((Date.now() - this.stepStartTime) / 1000).toFixed(1);
    this.logStep('Client selection', 'success', this.clientSlug, duration);
    this.completedSteps.push('welcome');
    
    // Save progress
    await this.stateManager.save({
      currentStep: 'welcome',
      completedSteps: this.completedSteps,
      clientSlug: this.clientSlug,
      config: this.results.config
    });

    return { clientSlug: this.clientSlug };
  }

  /**
   * Step 2: GHL API Credentials with Validation
   */
  async step2_GHLCredentials() {
    this.printHeader('Step 2: GHL API Credentials');
    this.stepStartTime = Date.now();

    // Check if already configured
    if (this.skipConfigured && await this.shouldSkipStep('ghl-credentials')) {
      this.logStep('GHL credentials', 'skipped', 'Already configured');
      this.completedSteps.push('ghl-credentials');
      return { skipped: true };
    }

    // Step validation: Pre-validate GHL credentials before user input
    if (!this.skipValidation) {
      console.log(chalk.gray('\nValidating GHL API configuration...\n'));
      
      const validator = new SetupValidator(null, { silent: true });
      const validation = await this.validateStep('ghl-credentials', async () => {
        return await validator.validateGHLConnection();
      });

      if (validation.status === ValidationStatus.FAIL) {
        console.log(chalk.red('\n✗ GHL API configuration issue:'));
        console.log(chalk.red(`  ${validation.message}`));
        
        if (validation.fixInstructions) {
          console.log(chalk.yellow('\n  Fix instructions:'));
          validation.fixInstructions.forEach(fix => {
            console.log(chalk.gray(`    → ${fix}`));
          });
        }
        console.log('');
      } else if (validation.status === ValidationStatus.PASS) {
        console.log(chalk.green(`✓ GHL API configured: ${validation.details?.locationName || 'Connected'}\n`));
      }
    }

    if (this.nonInteractive) {
      if (!this.ghlLocationId) {
        throw new Error('GHL Location ID is required (--ghl-location-id) in non-interactive mode');
      }
      if (!this.website) {
        throw new Error('Website URL is required (--website) in non-interactive mode');
      }
      
      // Validate GHL connection with live API test
      if (!this.dryRun && !this.skipValidation) {
        const spinner = ora('Testing GHL connection...').start();
        try {
          const validator = new SetupValidator(null, { silent: true });
          const result = await validator.validateGHLConnection(null, this.ghlLocationId);
          
          if (result.status === ValidationStatus.PASS) {
            spinner.succeed(`GHL connection successful: ${result.details?.locationName}`);
            this.logStep('GHL connection', 'success', result.details?.locationName);
            this.validationResults.steps['ghl-api-test'] = result;
          } else {
            spinner.fail(`GHL connection failed: ${result.message}`);
            throw new Error(`Cannot connect to GHL: ${result.message}`);
          }
        } catch (error) {
          spinner.fail(`GHL connection failed: ${error.message}`);
          throw error;
        }
      }
      
      this.completedSteps.push('ghl-credentials');
      return { ghlLocationId: this.ghlLocationId, website: this.website };
    }

    // Interactive mode
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'ghlLocationId',
        message: 'Enter GoHighLevel Location ID:',
        default: this.ghlLocationId,
        validate: (input) => input ? true : 'Location ID is required'
      },
      {
        type: 'input',
        name: 'website',
        message: 'Enter client website URL:',
        default: this.website,
        validate: (input) => {
          if (!input) return 'Website URL is required';
          try {
            new URL(input);
            return true;
          } catch {
            return 'Invalid URL format';
          }
        }
      },
      {
        type: 'confirm',
        name: 'testConnection',
        message: 'Test GHL connection now?',
        default: true
      }
    ]);

    this.ghlLocationId = answers.ghlLocationId;
    this.website = answers.website;

    // Test connection if requested
    if (answers.testConnection && !this.dryRun && !this.skipValidation) {
      const spinner = ora('Testing GHL connection...').start();
      try {
        const validator = new SetupValidator(null, { silent: true });
        const result = await validator.validateGHLConnection(null, this.ghlLocationId);
        
        if (result.status === ValidationStatus.PASS) {
          spinner.succeed(`GHL connection successful: ${result.details.locationName}`);
          this.logStep('GHL connection', 'success', result.details.locationName);
          this.validationResults.steps['ghl-api-test'] = result;
          
          // Ask if they want to extract data now
          const { extractNow } = await inquirer.prompt([{
            type: 'confirm',
            name: 'extractNow',
            message: 'Extract location data from GHL now?',
            default: true
          }]);
          
          if (extractNow) {
            const extractor = new GHLAutoExtractionService(this.clientSlug, this.ghlLocationId);
            await this.extractGHLData(extractor);
          }
        } else {
          spinner.fail(`GHL connection failed: ${result.message}`);
          this.showError(result.message, result.fixInstructions || [
            'Check that your GHL_API_KEY environment variable is set',
            'Verify the Location ID is correct',
            'Ensure the location is active in GHL',
            'Try again with --skip-validation flag if needed'
          ]);
          
          const { continueAnyway } = await inquirer.prompt([{
            type: 'confirm',
            name: 'continueAnyway',
            message: 'Continue anyway?',
            default: false
          }]);
          
          if (!continueAnyway) {
            throw new Error('GHL connection failed');
          }
        }
      } catch (error) {
        spinner.fail(`GHL connection failed: ${error.message}`);
        throw error;
      }
    }

    const duration = ((Date.now() - this.stepStartTime) / 1000).toFixed(1);
    this.logStep('GHL credentials', 'success', `${this.ghlLocationId}`, duration);
    this.completedSteps.push('ghl-credentials');
    
    // Save progress
    await this.stateManager.save({
      currentStep: 'ghl-credentials',
      completedSteps: this.completedSteps,
      clientSlug: this.clientSlug,
      config: {
        ...this.results.config,
        ghlLocationId: this.ghlLocationId,
        website: this.website
      }
    });

    return { ghlLocationId: this.ghlLocationId, website: this.website };
  }

  /**
   * Extract GHL data
   */
  async extractGHLData(extractor) {
    const spinner = ora('Extracting GHL data...').start();
    
    try {
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

      if (this.reportGenerator) {
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
      }

    } catch (error) {
      spinner.fail(`GHL extraction failed: ${error.message}`);
      this.logStep('GHL extraction', 'error', error.message);
      throw error;
    }
  }

  /**
   * Step 3: Airtable Connection Setup with Validation
   */
  async step3_AirtableSetup() {
    this.printHeader('Step 3: Airtable Connection Setup');
    this.stepStartTime = Date.now();

    // Check if already configured
    if (this.skipConfigured && await this.shouldSkipStep('airtable-setup')) {
      this.logStep('Airtable setup', 'skipped', 'Already configured');
      this.completedSteps.push('airtable-setup');
      return { skipped: true };
    }

    // Step validation: Pre-validate Airtable configuration
    if (!this.skipValidation) {
      console.log(chalk.gray('\nValidating Airtable configuration...\n'));
      
      const validator = new SetupValidator(null, { silent: true });
      const validation = await this.validateStep('airtable-setup', async () => {
        return await validator.validateAirtableConnection();
      });

      if (validation.status === ValidationStatus.FAIL) {
        console.log(chalk.red('\n✗ Airtable configuration issue:'));
        console.log(chalk.red(`  ${validation.message}`));
        
        if (validation.fixInstructions) {
          console.log(chalk.yellow('\n  Fix instructions:'));
          validation.fixInstructions.forEach(fix => {
            console.log(chalk.gray(`    → ${fix}`));
          });
        }
        console.log('');
      } else if (validation.status === ValidationStatus.PASS) {
        console.log(chalk.green(`✓ Airtable connected: ${validation.details?.tables?.length || 0} tables accessible\n`));
        this.validationResults.steps['airtable-connection'] = validation;
      } else if (validation.status === ValidationStatus.WARNING) {
        console.log(chalk.yellow(`⚠ ${validation.message}\n`));
      }
    }

    if (this.nonInteractive) {
      this.logStep('Airtable setup', 'success', 'Using environment configuration');
      this.completedSteps.push('airtable-setup');
      return { usingEnv: true };
    }

    // Check Airtable environment variables
    const hasAirtableKey = !!process.env.AIRTABLE_API_KEY;
    const hasAirtableBase = !!process.env.AIRTABLE_BASE_ID;

    if (hasAirtableKey && hasAirtableBase) {
      console.log(chalk.green('✓ Airtable environment variables found'));
      
      const { testConnection } = await inquirer.prompt([{
        type: 'confirm',
        name: 'testConnection',
        message: 'Test Airtable connection with detailed validation?',
        default: !this.skipValidation
      }]);

      if (testConnection && !this.skipValidation) {
        const spinner = ora('Testing Airtable connection...').start();
        try {
          const validator = new SetupValidator(null, { silent: true });
          const result = await validator.validateAirtableConnection();
          
          if (result.status === ValidationStatus.PASS) {
            spinner.succeed(`Airtable connected: ${result.details.tables.length} tables accessible`);
            this.logStep('Airtable connection', 'success', `${result.details.tables.length} tables`);
            this.logStep('Tables found', 'success', result.details.tables.join(', '));
            this.validationResults.steps['airtable-connection'] = result;
          } else if (result.status === ValidationStatus.WARNING) {
            spinner.warn(`Airtable connected with warnings: ${result.message}`);
            this.logStep('Airtable connection', 'warning', result.message);
          } else {
            spinner.fail(`Airtable connection failed: ${result.message}`);
            this.showError(result.message, result.fixInstructions || [
              'Check your AIRTABLE_API_KEY environment variable',
              'Verify your AIRTABLE_BASE_ID is correct',
              'Ensure the base is accessible'
            ]);
          }
        } catch (error) {
          spinner.fail(`Airtable connection failed: ${error.message}`);
          this.logStep('Airtable connection', 'error', error.message);
        }
      }
    } else {
      console.log(chalk.yellow('⚠ Airtable environment variables not fully configured'));
      console.log(chalk.gray('  Set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in your .env file\n'));
      
      const { configureNow } = await inquirer.prompt([{
        type: 'confirm',
        name: 'configureNow',
        message: 'Would you like to configure Airtable now?',
        default: true
      }]);

      if (configureNow) {
        console.log(chalk.cyan('\nPlease set these environment variables:'));
        console.log('  export AIRTABLE_API_KEY=your_api_key');
        console.log('  export AIRTABLE_BASE_ID=your_base_id\n');
        
        await inquirer.prompt([{
          type: 'input',
          name: 'continue',
          message: 'Press Enter when ready to continue...'
        }]);
      }
    }

    const duration = ((Date.now() - this.stepStartTime) / 1000).toFixed(1);
    this.logStep('Airtable setup', 'success', 'Configuration verified', duration);
    this.completedSteps.push('airtable-setup');
    
    await this.stateManager.save({
      currentStep: 'airtable-setup',
      completedSteps: this.completedSteps,
      clientSlug: this.clientSlug,
      config: this.results.config
    });

    return { configured: true };
  }

  /**
   * Step 4: Brand Voice Configuration (AI-assisted) with Validation
   */
  async step4_BrandVoice() {
    this.printHeader('Step 4: Brand Voice Configuration', 'AI-assisted analysis');
    this.stepStartTime = Date.now();

    // Check if already configured
    if (this.skipConfigured && await this.shouldSkipStep('brand-voice')) {
      this.logStep('Brand voice', 'skipped', 'Already configured');
      this.completedSteps.push('brand-voice');
      return { skipped: true };
    }

    // Initialize Knowledge Hub
    const hub = new KnowledgeHub(this.clientSlug);
    const isInitialized = await hub.isInitialized();
    
    if (!isInitialized) {
      console.log('Initializing Knowledge Hub...');
      await hub.initialize({ website: this.website });
      console.log(chalk.green('✓ Knowledge Hub initialized'));
    }

    // Step validation: Validate brand voice config
    if (!this.skipValidation && this.clientSlug) {
      console.log(chalk.gray('\nValidating brand voice configuration...\n'));
      
      const validator = new SetupValidator(this.clientSlug, { silent: true });
      const validation = await this.validateStep('brand-voice', async () => {
        return await validator.validateBrandVoiceConfig();
      });

      if (validation.status === ValidationStatus.FAIL) {
        console.log(chalk.yellow('\n⚠ Brand voice needs configuration:'));
        console.log(chalk.yellow(`  ${validation.message}`));
        
        if (validation.fixInstructions) {
          console.log(chalk.gray('\n  Instructions:'));
          validation.fixInstructions.forEach(fix => {
            console.log(chalk.gray(`    → ${fix}`));
          });
        }
        console.log('');
      } else if (validation.status === ValidationStatus.PASS) {
        console.log(chalk.green(`✓ Brand voice configured: ${validation.details?.adjectives || 0} adjectives, ${validation.details?.personality || 'no'} personality\n`));
        this.validationResults.steps['brand-voice-config'] = validation;
      }
    }

    if (this.nonInteractive) {
      // Non-interactive: auto-run if AI is available
      if (process.env.OPENAI_API_KEY && !this.dryRun) {
        await this.runBrandVoiceAnalysis(hub);
      }
      this.completedSteps.push('brand-voice');
      return { autoConfigured: true };
    }

    // Interactive mode
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    
    if (!hasOpenAI) {
      console.log(chalk.yellow('⚠ OPENAI_API_KEY not set - brand voice analysis will be skipped'));
      console.log(chalk.gray('  Add OPENAI_API_KEY to your .env file for AI-powered analysis\n'));
      
      const { skipAnalysis } = await inquirer.prompt([{
        type: 'confirm',
        name: 'skipAnalysis',
        message: 'Continue without AI analysis?',
        default: true
      }]);

      if (skipAnalysis) {
        this.logStep('Brand voice', 'skipped', 'AI not configured');
        this.completedSteps.push('brand-voice');
        return { skipped: true };
      }
    }

    // Check if website has been crawled
    const stats = await hub.getStats();
    if (stats.goldenPages.total === 0) {
      console.log(chalk.yellow('⚠ No website content found'));
      
      const { crawlFirst } = await inquirer.prompt([{
        type: 'confirm',
        name: 'crawlFirst',
        message: `Crawl ${this.website} for brand voice analysis?`,
        default: true
      }]);

      if (crawlFirst) {
        await this.crawlWebsite();
      }
    }

    // Run brand voice analysis
    const { runAnalysis } = await inquirer.prompt([{
      type: 'confirm',
      name: 'runAnalysis',
      message: 'Run AI brand voice analysis?',
      default: hasOpenAI && !this.dryRun
    }]);

    if (runAnalysis && hasOpenAI && !this.dryRun) {
      await this.runBrandVoiceAnalysis(hub);
    }

    // Show current brand voice
    try {
      const profile = await hub.getBrandVoice();
      if (profile.voice?.adjectives?.length > 0) {
        console.log(chalk.cyan('\nCurrent Brand Voice:'));
        console.log(`  Adjectives: ${profile.voice.adjectives.join(', ')}`);
        console.log(`  Personality: ${profile.voice.personality || 'Not set'}`);
      }
    } catch {
      // No brand voice yet
    }

    const duration = ((Date.now() - this.stepStartTime) / 1000).toFixed(1);
    this.logStep('Brand voice', 'success', 'Configuration complete', duration);
    this.completedSteps.push('brand-voice');
    
    await this.stateManager.save({
      currentStep: 'brand-voice',
      completedSteps: this.completedSteps,
      clientSlug: this.clientSlug,
      config: this.results.config
    });

    return { configured: true };
  }

  /**
   * Run brand voice analysis
   */
  async runBrandVoiceAnalysis(hub) {
    const spinner = ora('Analyzing brand voice...').start();
    
    try {
      const analyzer = new BrandVoiceAnalyzer(this.clientSlug);
      const result = await analyzer.runFullAnalysis();

      spinner.succeed(`Brand voice analysis complete`);
      
      this.logStep('Brand voice analyzed', 'success', `${result.pagesAnalyzed} pages`);
      if (result.profile.voice?.adjectives?.length > 0) {
        this.logStep('Voice adjectives', 'success', result.profile.voice.adjectives.join(', '));
      }

      if (this.reportGenerator) {
        this.reportGenerator.recordStep('aiExtraction', 'success');
      }

    } catch (error) {
      spinner.fail(`Brand voice analysis failed: ${error.message}`);
      this.logStep('Brand voice analysis', 'warning', error.message);
    }
  }

  /**
   * Crawl website
   */
  async crawlWebsite() {
    const spinner = ora(`Crawling ${this.website}...`).start();
    
    try {
      const result = await crawlAndPopulateHub(this.clientSlug, this.website, {
        maxPages: 40,
        maxDepth: 3,
        dryRun: this.dryRun
      });

      if (this.dryRun) {
        spinner.succeed(`Dry run: ${result.pagesFound} pages found`);
      } else {
        spinner.succeed(`Crawl complete: ${result.pagesCrawled} pages`);
        this.logStep('Pages crawled', 'success', `${result.pagesCrawled}`);
        this.logStep('Facts extracted', 'success', `${result.factsExtracted}`);
      }

      if (this.reportGenerator && !this.dryRun) {
        this.reportGenerator.recordStep('websiteCrawl', 'success', {
          pages: result.pagesCrawled,
          facts: result.factsExtracted
        });
      }

    } catch (error) {
      spinner.fail(`Crawl failed: ${error.message}`);
      this.logStep('Website crawl', 'error', error.message);
      throw error;
    }
  }

  /**
   * Step 5: Email Template Selection with MJML Validation
   */
  async step5_EmailTemplates() {
    this.printHeader('Step 5: Email Template Selection');
    this.stepStartTime = Date.now();

    // Check if already configured
    if (this.skipConfigured && await this.shouldSkipStep('email-templates')) {
      this.logStep('Email templates', 'skipped', 'Already configured');
      this.completedSteps.push('email-templates');
      return { skipped: true };
    }

    const clientDir = path.join(repoRoot, 'clients', this.clientSlug);
    const templatesPath = path.join(clientDir, 'emails', 'email-templates.json');

    // Step validation: Validate email templates MJML
    if (!this.skipValidation && this.clientSlug) {
      console.log(chalk.gray('\nValidating email templates...\n'));
      
      const validator = new SetupValidator(this.clientSlug, { silent: true });
      const validation = await this.validateStep('email-templates', async () => {
        return await validator.validateEmailTemplates();
      });

      if (validation.status === ValidationStatus.FAIL) {
        console.log(chalk.yellow('\n⚠ Email templates need setup:'));
        console.log(chalk.yellow(`  ${validation.message}`));
        
        if (validation.fixInstructions) {
          console.log(chalk.gray('\n  Instructions:'));
          validation.fixInstructions.forEach(fix => {
            console.log(chalk.gray(`    → ${fix}`));
          });
        }
        console.log('');
      } else if (validation.status === ValidationStatus.WARNING) {
        console.log(chalk.yellow(`⚠ ${validation.message}`));
        if (validation.details?.issues) {
          validation.details.issues.forEach(issue => {
            console.log(chalk.gray(`  - ${issue}`));
          });
        }
        console.log('');
      } else if (validation.status === ValidationStatus.PASS) {
        console.log(chalk.green(`✓ Email templates valid: ${validation.details?.totalTemplates || 0} templates\n`));
        this.validationResults.steps['email-templates-validation'] = validation;
      }
    }

    if (this.nonInteractive) {
      this.logStep('Email templates', 'success', 'Using default templates');
      this.completedSteps.push('email-templates');
      return { usingDefaults: true };
    }

    // Check existing templates
    let existingTemplates = [];
    try {
      const templates = JSON.parse(await fs.readFile(templatesPath, 'utf8'));
      existingTemplates = templates.templates || [];
    } catch {
      // File doesn't exist
    }

    if (existingTemplates.length > 0) {
      console.log(chalk.green(`✓ Found ${existingTemplates.length} existing templates`));
      
      const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Keep existing templates', value: 'keep' },
          { name: 'Review and edit templates', value: 'review' },
          { name: 'Reset to defaults', value: 'reset' }
        ]
      }]);

      if (action === 'keep') {
        this.logStep('Email templates', 'success', `${existingTemplates.length} templates kept`);
        this.completedSteps.push('email-templates');
        return { kept: true };
      }

      if (action === 'reset') {
        // Copy from template
        const templatePath = path.join(repoRoot, 'templates', 'standard-client', 'emails', 'email-templates.json');
        try {
          const defaultTemplates = await fs.readFile(templatePath, 'utf8');
          await fs.mkdir(path.dirname(templatesPath), { recursive: true });
          await fs.writeFile(templatesPath, defaultTemplates, 'utf8');
          this.logStep('Email templates', 'success', 'Reset to defaults');
        } catch (error) {
          this.logStep('Email templates', 'warning', `Could not reset: ${error.message}`);
        }
      }
    } else {
      // Create from template
      console.log('Creating default email templates...');
      const templatePath = path.join(repoRoot, 'templates', 'standard-client', 'emails', 'email-templates.json');
      try {
        const defaultTemplates = await fs.readFile(templatePath, 'utf8');
        await fs.mkdir(path.dirname(templatesPath), { recursive: true });
        await fs.writeFile(templatesPath, defaultTemplates, 'utf8');
        this.logStep('Email templates', 'success', 'Default templates created');
      } catch (error) {
        this.logStep('Email templates', 'warning', `Could not create: ${error.message}`);
      }
    }

    // Show template summary
    try {
      const templates = JSON.parse(await fs.readFile(templatesPath, 'utf8'));
      console.log(chalk.cyan('\nTemplate Categories:'));
      const categories = {};
      templates.templates?.forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + 1;
      });
      Object.entries(categories).forEach(([cat, count]) => {
        console.log(`  ${cat}: ${count} templates`);
      });
    } catch {
      // Ignore
    }

    const duration = ((Date.now() - this.stepStartTime) / 1000).toFixed(1);
    this.logStep('Email templates', 'success', 'Configuration complete', duration);
    this.completedSteps.push('email-templates');
    
    await this.stateManager.save({
      currentStep: 'email-templates',
      completedSteps: this.completedSteps,
      clientSlug: this.clientSlug,
      config: this.results.config
    });

    return { configured: true };
  }

  /**
   * Step 6: Review & Confirm
   */
  async step6_Review() {
    this.printHeader('Step 6: Review & Confirm');
    this.stepStartTime = Date.now();

    // Gather all configuration info
    const config = {
      clientSlug: this.clientSlug,
      ghlLocationId: this.ghlLocationId,
      website: this.website,
      industry: this.industry
    };

    // Load location config if available
    try {
      const configPath = path.join(repoRoot, 'clients', this.clientSlug, 'location-config.json');
      const locationConfig = JSON.parse(await fs.readFile(configPath, 'utf8'));
      config.locationName = locationConfig.name;
      config.timezone = locationConfig.timezone;
    } catch {
      // Not available yet
    }

    console.log(chalk.cyan('Configuration Summary:\n'));
    console.log(`  Client Slug: ${chalk.white(config.clientSlug)}`);
    console.log(`  Location: ${chalk.white(config.locationName || 'Not extracted')}`);
    console.log(`  GHL Location ID: ${chalk.white(config.ghlLocationId)}`);
    console.log(`  Website: ${chalk.white(config.website)}`);
    console.log(`  Industry: ${chalk.white(config.industry)}`);
    console.log(`  Timezone: ${chalk.white(config.timezone || 'Not set')}`);
    
    console.log(chalk.cyan('\nCompleted Steps:'));
    this.completedSteps.forEach(stepId => {
      const step = WIZARD_STEPS.find(s => s.id === stepId);
      if (step) {
        console.log(`  ${chalk.green('✓')} ${step.name}`);
      }
    });

    if (this.dryRun) {
      console.log(chalk.yellow('\n⚠ DRY RUN MODE - No changes will be made\n'));
    }

    if (!this.nonInteractive) {
      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: this.dryRun ? 'Run in dry-run mode?' : 'Proceed with setup?',
        default: true
      }]);

      if (!confirm) {
        console.log(chalk.yellow('\nSetup cancelled by user.'));
        
        const { saveProgress } = await inquirer.prompt([{
          type: 'confirm',
          name: 'saveProgress',
          message: 'Save progress to resume later?',
          default: true
        }]);

        if (saveProgress) {
          await this.stateManager.save({
            currentStep: 'review',
            completedSteps: this.completedSteps,
            clientSlug: this.clientSlug,
            config: this.results.config
          });
          console.log(chalk.green('Progress saved. Run with --resume to continue.'));
        }
        
        process.exit(0);
      }
    }

    const duration = ((Date.now() - this.stepStartTime) / 1000).toFixed(1);
    this.logStep('Review', 'success', 'Configuration confirmed', duration);
    this.completedSteps.push('review');
    
    await this.stateManager.save({
      currentStep: 'review',
      completedSteps: this.completedSteps,
      clientSlug: this.clientSlug,
      config: this.results.config
    });

    return { confirmed: true, config };
  }

  /**
   * Step 7: Execute Setup with Progress Bar
   */
  async step7_Execute() {
    this.printHeader('Step 7: Execute Setup', 'Creating client configuration...');
    this.stepStartTime = Date.now();

    if (this.dryRun) {
      console.log(chalk.yellow('\n⚠ DRY RUN - Simulating setup execution\n'));
      
      // Simulate steps
      const steps = [
        'Creating client directory',
        'Copying template files',
        'Extracting GHL data',
        'Generating default journeys',
        'Validating setup'
      ];
      
      for (const step of steps) {
        const spinner = ora(`${step}...`).start();
        await new Promise(r => setTimeout(r, 500)); // Simulate work
        spinner.succeed(`${step} (dry run)`);
      }
      
      this.logStep('Setup execution', 'success', 'Dry run complete');
      this.completedSteps.push('execute');
      return { dryRun: true };
    }

    // Real execution
    const executionSteps = [
      { name: 'Create client directory', fn: () => this.createClientDirectory() },
      { name: 'Extract GHL data', fn: () => this.extractGHLDataFull(), skip: !this.ghlLocationId },
      { name: 'Crawl website', fn: () => this.crawlWebsite(), skip: !this.website },
      { name: 'Generate default journeys', fn: () => this.generateJourneys() },
      { name: 'Validate setup', fn: () => this.validateSetup(), skip: this.skipValidation }
    ];

    let currentStepIndex = 0;
    const totalSteps = executionSteps.filter(s => !s.skip).length;

    for (const step of executionSteps) {
      if (step.skip) {
        this.logStep(step.name, 'skipped');
        continue;
      }

      currentStepIndex++;
      const stepProgress = Math.round((currentStepIndex / totalSteps) * 100);
      const spinner = ora(`[${currentStepIndex}/${totalSteps}] ${step.name}...`).start();
      
      try {
        const stepStart = Date.now();
        await step.fn();
        const stepDuration = ((Date.now() - stepStart) / 1000).toFixed(1);
        spinner.succeed(`${step.name} (${stepDuration}s) [${stepProgress}%]`);
      } catch (error) {
        spinner.fail(`${step.name} failed: ${error.message}`);
        this.logStep(step.name, 'error', error.message);
        
        if (!this.nonInteractive) {
          const { continueOnError } = await inquirer.prompt([{
            type: 'confirm',
            name: 'continueOnError',
            message: 'Continue with remaining steps?',
            default: true
          }]);
          
          if (!continueOnError) {
            throw error;
          }
        } else {
          throw error;
        }
      }
    }

    // Generate final report
    await this.generateFinalReport();

    const duration = ((Date.now() - this.stepStartTime) / 1000).toFixed(1);
    this.logStep('Setup execution', 'success', `Complete in ${duration}s`, duration);
    this.completedSteps.push('execute');
    
    // Clear progress on success
    await this.stateManager.clear();

    return { success: true, duration };
  }

  /**
   * Create client directory
   */
  async createClientDirectory() {
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
              .replace(/\{\{WEBSITE_URL\}\}/g, this.website || '');
            
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
   * Extract GHL data (full)
   */
  async extractGHLDataFull() {
    const extractor = new GHLAutoExtractionService(this.clientSlug, this.ghlLocationId);
    await this.extractGHLData(extractor);
  }

  /**
   * Generate journeys
   */
  async generateJourneys() {
    const spinner = ora('Generating default journeys...').start();
    
    try {
      const generator = new JourneyGenerator(this.clientSlug);
      const result = await generator.run({ createInAirtable: true });

      spinner.succeed(`Generated ${result.summary.journeysCreated} journeys`);
      
      result.summary.journeys.forEach(j => {
        this.logStep(j.name, 'success', `${j.touchpointCount} touchpoints`);
      });

      if (this.reportGenerator) {
        this.reportGenerator.setJourneys(result.summary.journeys);
        this.reportGenerator.recordStep('journeyGeneration', 'success', {
          journeys: result.summary.journeysCreated,
          touchpoints: result.summary.totalTouchpoints
        });
      }

    } catch (error) {
      spinner.fail(`Journey generation failed: ${error.message}`);
      this.logStep('Journey generation', 'error', error.message);
      throw error;
    }
  }

  /**
   * Validate setup with comprehensive post-validation
   */
  async validateSetup() {
    const validator = new SetupValidator(this.clientSlug);
    
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║  Post-Setup Validation                                 ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════════════╝\n'));
    
    const spinner = ora('Running comprehensive validation checks...').start();
    
    try {
      // Run post-setup validation
      const report = await validator.runPostSetupValidation();

      // Save validation report
      const reportPath = await validator.saveReport();
      
      spinner.succeed('Validation complete');

      const passed = report.summary.passed;
      const failed = report.summary.failed;
      const warnings = report.summary.warnings;

      this.logStep('Validation checks', 'success', `${passed} passed`);
      if (warnings > 0) this.logStep('Warnings', 'warning', `${warnings}`);
      if (failed > 0) this.logStep('Critical issues', 'error', `${failed}`);
      this.logStep('Validation report', 'success', reportPath.replace(repoRoot + '/', ''));

      if (report.errors.length > 0) {
        console.log(chalk.red('\n  Critical Issues:'));
        report.errors.slice(0, 5).forEach(e => {
          console.log(chalk.red(`    ✗ ${e.check}: ${e.message}`));
          if (e.fixInstructions) {
            e.fixInstructions.forEach(fix => {
              console.log(chalk.gray(`      → ${fix}`));
            });
          }
        });
      }

      // Store validation results
      this.validationResults.postSetup = report;
      await this.saveValidationState();

      if (this.reportGenerator) {
        this.reportGenerator.recordStep('validation', failed === 0 ? 'success' : 'warning', {
          passed,
          failed,
          warnings,
          reportPath
        });
      }

      return report;

    } catch (error) {
      spinner.fail(`Validation failed: ${error.message}`);
      this.logStep('Validation', 'error', error.message);
      throw error;
    }
  }

  /**
   * Generate validation summary report
   */
  async generateValidationReport() {
    if (!this.clientSlug) return;

    console.log(chalk.cyan('\n╔════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║  Validation Summary                                    ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════════════╝\n'));

    const report = {
      preSetup: this.validationResults.preSetup?.summary || null,
      steps: Object.entries(this.validationResults.steps).map(([step, result]) => ({
        step,
        status: result.status,
        message: result.message
      })),
      postSetup: this.validationResults.postSetup?.summary || null,
      timestamp: new Date().toISOString()
    };

    // Print summary
    if (report.preSetup) {
      console.log(chalk.white('Pre-Setup Validation:'));
      console.log(`  ${this.getStatusIcon(report.preSetup.isValid)} ${report.preSetup.passed}/${report.preSetup.total} checks passed`);
    }

    console.log(chalk.white('\nStep Validation:'));
    Object.entries(this.validationResults.steps).forEach(([step, result]) => {
      const icon = result.status === ValidationStatus.PASS ? chalk.green('✓') :
                   result.status === ValidationStatus.FAIL ? chalk.red('✗') :
                   result.status === ValidationStatus.WARNING ? chalk.yellow('⚠') : chalk.gray('○');
      console.log(`  ${icon} ${step}: ${result.message}`);
    });

    if (report.postSetup) {
      console.log(chalk.white('\nPost-Setup Validation:'));
      console.log(`  ${this.getStatusIcon(report.postSetup.isValid)} ${report.postSetup.passed}/${report.postSetup.total} checks passed`);
    }

    // Save combined report
    const reportPath = path.join(repoRoot, 'clients', this.clientSlug, '.bloom', 'validation-summary.json');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
    
    console.log(chalk.gray(`\nValidation summary saved to: ${reportPath.replace(repoRoot + '/', '')}`));

    return report;
  }

  /**
   * Get status icon
   */
  getStatusIcon(isValid) {
    return isValid ? chalk.green('✓') : chalk.red('✗');
  }

  /**
   * Generate final report
   */
  async generateFinalReport() {
    if (!this.reportGenerator) {
      this.reportGenerator = new OnboardingReportGenerator(this.clientSlug);
    }

    const spinner = ora('Generating onboarding report...').start();
    
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
   * Resume from saved progress
   */
  async resume() {
    const state = await this.stateManager.load();
    if (!state) {
      throw new Error('No saved progress found. Run without --resume flag to start fresh.');
    }

    const age = await this.stateManager.getProgressAge();
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║  Resuming Onboarding Wizard                            ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════════════╝\n'));
    
    console.log(`Resuming for client: ${chalk.white(state.clientSlug)}`);
    console.log(`Last saved: ${chalk.gray(age ? `${age} minutes ago` : 'unknown')}`);
    console.log(`Completed steps: ${chalk.green(state.completedSteps?.length || 0)}/${WIZARD_STEPS.length}\n`);

    // Restore state
    this.clientSlug = state.clientSlug;
    this.ghlLocationId = state.config?.ghlLocationId;
    this.website = state.config?.website;
    this.completedSteps = state.completedSteps || [];
    this.results.config = state.config || {};
    this.reportGenerator = new OnboardingReportGenerator(this.clientSlug);

    // Determine which step to resume from
    const lastCompletedStep = this.completedSteps[this.completedSteps.length - 1];
    const lastCompletedIndex = WIZARD_STEPS.findIndex(s => s.id === lastCompletedStep);
    this.currentStepIndex = lastCompletedIndex + 1;

    // Ask user if they want to resume or start over
    if (!this.nonInteractive) {
      const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '▶️  Resume from last step', value: 'resume' },
          { name: '🔄 Start over', value: 'restart' },
          { name: '❌ Exit', value: 'exit' }
        ]
      }]);

      if (action === 'exit') {
        process.exit(0);
      }

      if (action === 'restart') {
        await this.stateManager.clear();
        this.completedSteps = [];
        this.currentStepIndex = 0;
        return this.run();
      }
    }

    // Resume from next step
    return this.runFromStep(this.currentStepIndex);
  }

  /**
   * Run from specific step
   */
  async runFromStep(startIndex) {
    this.startTime = Date.now();
    
    try {
      // Run pre-validation before starting (only at step 0)
      if (startIndex === 0) {
        await this.runPreValidation();
      }
      
      // Run remaining steps
      for (let i = startIndex; i < WIZARD_STEPS.length; i++) {
        this.currentStepIndex = i;
        const step = WIZARD_STEPS[i];
        
        this.printProgress();
        
        switch (step.id) {
          case 'welcome':
            await this.step1_Welcome();
            break;
          case 'ghl-credentials':
            await this.step2_GHLCredentials();
            break;
          case 'airtable-setup':
            await this.step3_AirtableSetup();
            break;
          case 'brand-voice':
            await this.step4_BrandVoice();
            break;
          case 'email-templates':
            await this.step5_EmailTemplates();
            break;
          case 'review':
            await this.step6_Review();
            break;
          case 'execute':
            await this.step7_Execute();
            break;
        }
      }

      const totalDuration = ((Date.now() - this.startTime) / 1000).toFixed(1);
      
      // Generate validation summary report
      if (!this.skipValidation) {
        await this.generateValidationReport();
      }
      
      console.log(chalk.green('\n╔════════════════════════════════════════════════════════╗'));
      console.log(chalk.green('║  ✓ Onboarding Complete!                                ║'));
      console.log(chalk.green('╚════════════════════════════════════════════════════════╝'));
      console.log(chalk.gray(`\nTotal Duration: ${totalDuration}s`));
      console.log(`Client: ${chalk.cyan(this.clientSlug)}`);
      console.log(`\nReports saved to:`);
      console.log(`  - clients/${this.clientSlug}/ONBOARDING-REPORT.md`);
      console.log(`  - clients/${this.clientSlug}/ONBOARDING-REPORT.html`);
      if (!this.skipValidation) {
        console.log(`  - clients/${this.clientSlug}/.bloom/validation-report.json`);
        console.log(`  - clients/${this.clientSlug}/.bloom/validation-summary.json`);
      }
      console.log('');

      return {
        success: true,
        duration: totalDuration,
        results: this.results,
        validationResults: this.validationResults
      };

    } catch (error) {
      console.log(chalk.red('\n╔════════════════════════════════════════════════════════╗'));
      console.log(chalk.red('║  ✗ Onboarding Failed                                   ║'));
      console.log(chalk.red('╚════════════════════════════════════════════════════════╝'));
      console.log(chalk.red(`\nError: ${error.message}\n`));
      
      // Save progress on error
      await this.stateManager.save({
        currentStep: WIZARD_STEPS[this.currentStepIndex]?.id,
        completedSteps: this.completedSteps,
        clientSlug: this.clientSlug,
        config: this.results.config,
        validationResults: this.validationResults,
        error: error.message
      });
      
      console.log(chalk.yellow('Progress saved. Run with --resume to continue.\n'));
      
      throw error;
    }
  }

  /**
   * Run the complete onboarding wizard
   */
  async run() {
    // If resume flag is set, try to resume
    if (this.resume) {
      return this.resume();
    }

    // Check if there's existing progress
    if (await this.stateManager.hasProgress() && !this.nonInteractive) {
      console.log(chalk.yellow('\n⚠ Found saved progress from a previous session.'));
      
      const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '▶️  Resume from saved progress', value: 'resume' },
          { name: '🆕 Start fresh', value: 'fresh' }
        ]
      }]);

      if (action === 'resume') {
        this.resume = true;
        return this.resume();
      } else {
        await this.stateManager.clear();
      }
    }

    return this.runFromStep(0);
  }
}

/**
 * Legacy OnboardingWizard - Maintains backward compatibility
 * Uses the new InteractiveOnboardingWizard internally
 */
export class OnboardingWizard {
  constructor(options = {}) {
    this.options = options;
    this.wizard = new InteractiveOnboardingWizard({
      ...options,
      nonInteractive: true
    });
  }

  async run() {
    return this.wizard.run();
  }
}

// CLI Entry Point
export async function runCLI() {
  const program = new Command();

  program
    .name('onboard')
    .description('BloomBuilder Client Onboarding Wizard')
    .version('2.0.0')
    .option('--client <slug>', 'Client folder slug (non-interactive mode)')
    .option('--website <url>', 'Client website URL (non-interactive mode)')
    .option('--ghl-location-id <id>', 'GoHighLevel location ID (non-interactive mode)')
    .option('--industry <type>', 'Industry type', 'wedding-venue')
    .option('--dry-run', 'Show what would be done without making changes', false)
    .option('--skip-validation', 'Skip validation steps for faster iteration', false)
    .option('--resume', 'Resume from saved progress', false)
    .option('--non-interactive', 'Run in non-interactive mode (requires all options)', false)
    .option('--json-output', 'Output JSON for CI/CD pipelines', false)
    .option('--validate-only', 'Run validation only (no setup)', false)
    .action(async (options) => {
      // Handle validate-only mode
      if (options.validateOnly) {
        if (!options.client) {
          console.error(chalk.red('Error: --client is required for validate-only mode'));
          process.exit(1);
        }
        
        const validator = new SetupValidator(options.client, {
          jsonOutput: options.jsonOutput,
          silent: !options.jsonOutput
        });
        
        try {
          await validator.runAllValidations();
          const report = validator.generateReport();
          
          if (!options.jsonOutput) {
            validator.printSummary();
          } else {
            console.log(JSON.stringify(report, null, 2));
          }
          
          // Save report
          const reportPath = await validator.saveReport();
          if (!options.jsonOutput) {
            console.log(chalk.gray(`\nReport saved to: ${reportPath}`));
          }
          
          process.exit(report.summary.isValid ? 0 : 1);
        } catch (error) {
          if (options.jsonOutput) {
            console.log(JSON.stringify({ error: error.message }, null, 2));
          } else {
            console.error(chalk.red(`\nValidation failed: ${error.message}`));
          }
          process.exit(1);
        }
        return;
      }
      
      // Determine if we should run in interactive or non-interactive mode
      const hasAllRequired = options.client && options.website && options.ghlLocationId;
      
      if (options.nonInteractive && !hasAllRequired) {
        console.error(chalk.red('Error: --client, --website, and --ghl-location-id are required in non-interactive mode'));
        process.exit(1);
      }

      const wizard = new InteractiveOnboardingWizard({
        ...options,
        nonInteractive: options.nonInteractive || hasAllRequired
      });
      
      try {
        const result = await wizard.run();
        
        // Output JSON if requested
        if (options.jsonOutput) {
          console.log(JSON.stringify({
            success: result.success,
            duration: result.duration,
            clientSlug: options.client,
            validationResults: result.validationResults
          }, null, 2));
        }
        
        process.exit(result.success ? 0 : 1);
      } catch (error) {
        if (options.jsonOutput) {
          console.log(JSON.stringify({ error: error.message, success: false }, null, 2));
        } else {
          console.error(chalk.red(`\nFatal error: ${error.message}`));
        }
        process.exit(1);
      }
    });

  await program.parseAsync(process.argv);
}

// Export for programmatic use and BLOOM-206 integration
export { InteractiveOnboardingWizard as default };
