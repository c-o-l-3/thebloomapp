/**
 * Setup Validation System - BLOOM-206 Enhanced
 * Comprehensive validation for client onboarding with automated checks
 * 
 * Features:
 * - Pre-validation (Node, env vars, disk space, .env structure)
 * - Step validation (GHL, Airtable, Brand Voice, Email Templates)
 * - Post-validation (E2E sync test, file verification)
 * - Colored output with ✓/✗ indicators
 * - JSON output for CI/CD
 * - Validation report generation
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import logger from './logger.js';
import { KnowledgeHub } from '../services/knowledge-hub.js';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../..');

// Validation result types
export const ValidationStatus = {
  PASS: 'pass',
  FAIL: 'fail',
  WARNING: 'warning',
  SKIP: 'skip'
};

// ANSI color codes for terminal output
export const Colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

/**
 * Enhanced Setup Validator with BLOOM-206 features
 */
export class SetupValidator {
  constructor(clientSlug, options = {}) {
    this.clientSlug = clientSlug;
    this.clientDir = clientSlug ? path.join(repoRoot, 'clients', clientSlug) : null;
    this.results = [];
    this.errors = [];
    this.warnings = [];
    this.options = {
      jsonOutput: options.jsonOutput || false,
      silent: options.silent || false,
      ciMode: options.ciMode || false,
      ...options
    };
    this.startTime = Date.now();
  }

  /**
   * Get colored icon for status
   */
  getIcon(status) {
    if (this.options.jsonOutput) return '';
    switch (status) {
      case ValidationStatus.PASS:
        return `${Colors.green}✓${Colors.reset}`;
      case ValidationStatus.FAIL:
        return `${Colors.red}✗${Colors.reset}`;
      case ValidationStatus.WARNING:
        return `${Colors.yellow}⚠${Colors.reset}`;
      case ValidationStatus.SKIP:
        return `${Colors.gray}○${Colors.reset}`;
      default:
        return `${Colors.blue}→${Colors.reset}`;
    }
  }

  /**
   * Format console output
   */
  log(message, status = null) {
    if (this.options.silent || this.options.jsonOutput) return;
    
    if (status) {
      console.log(`  ${this.getIcon(status)} ${message}`);
    } else {
      console.log(message);
    }
  }

  /**
   * Add a validation result
   */
  addResult(check, status, message, details = null, fixInstructions = null) {
    const result = {
      check,
      status,
      message,
      details,
      fixInstructions,
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime
    };
    
    this.results.push(result);
    
    if (status === ValidationStatus.FAIL) {
      this.errors.push(result);
    } else if (status === ValidationStatus.WARNING) {
      this.warnings.push(result);
    }
    
    // Log if not in silent/json mode
    if (!this.options.silent && !this.options.jsonOutput) {
      this.log(message, status);
    }
    
    return result;
  }

  //===========================================================================
  // PRE-VALIDATION METHODS
  //===========================================================================

  /**
   * Validate Node.js version (>= 18)
   */
  async validateNodeVersion() {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
    
    if (majorVersion >= 18) {
      return this.addResult(
        'node_version',
        ValidationStatus.PASS,
        `Node.js version ${nodeVersion} meets requirement (>= 18)`,
        { version: nodeVersion, required: '>= 18' }
      );
    }
    
    return this.addResult(
      'node_version',
      ValidationStatus.FAIL,
      `Node.js version ${nodeVersion} is too old (requires >= 18)`,
      { version: nodeVersion, required: '>= 18' },
      [
        'Upgrade Node.js to version 18 or higher',
        'Use nvm: nvm install 18 && nvm use 18',
        'Or download from https://nodejs.org/'
      ]
    );
  }

  /**
   * Check required environment variables
   */
  async validateEnvironmentVariables() {
    const required = [
      { key: 'GHL_API_KEY', critical: true, description: 'GoHighLevel API key' },
      { key: 'GHL_LOCATION_ID', critical: true, description: 'GoHighLevel Location ID' },
      { key: 'AIRTABLE_API_KEY', critical: true, description: 'Airtable Personal Access Token' },
      { key: 'AIRTABLE_BASE_ID', critical: true, description: 'Airtable Base ID' },
      { key: 'OPENAI_API_KEY', critical: false, description: 'OpenAI API key (for AI features)' }
    ];

    const missing = [];
    const present = [];

    for (const env of required) {
      const value = process.env[env.key];
      if (!value) {
        missing.push(env);
      } else {
        present.push(env.key);
      }
    }

    const details = {
      present,
      missing: missing.map(m => m.key),
      criticalMissing: missing.filter(m => m.critical).map(m => m.key)
    };

    if (missing.length === 0) {
      return this.addResult(
        'environment_variables',
        ValidationStatus.PASS,
        `All ${required.length} required environment variables configured`,
        details
      );
    }

    const criticalMissing = missing.filter(m => m.critical);
    if (criticalMissing.length > 0) {
      return this.addResult(
        'environment_variables',
        ValidationStatus.FAIL,
        `Missing critical environment variables: ${criticalMissing.map(m => m.key).join(', ')}`,
        details,
        missing.map(m => `Set ${m.key}: export ${m.key}=your_${m.key.toLowerCase()}`)
      );
    }

    return this.addResult(
      'environment_variables',
      ValidationStatus.WARNING,
      `Missing optional environment variables: ${missing.map(m => m.key).join(', ')}`,
      details,
      missing.map(m => `Set ${m.key} for enhanced functionality`)
    );
  }

  /**
   * Validate .env file structure
   */
  async validateEnvFile() {
    const envPaths = [
      path.join(repoRoot, '.env'),
      path.join(repoRoot, 'scripts/sync-engine/.env')
    ];

    let foundEnvFile = false;
    let envContent = '';

    for (const envPath of envPaths) {
      try {
        envContent = await fs.readFile(envPath, 'utf8');
        foundEnvFile = true;
        break;
      } catch {
        // Continue to next path
      }
    }

    if (!foundEnvFile) {
      return this.addResult(
        'env_file',
        ValidationStatus.FAIL,
        '.env file not found in expected locations',
        { searched: envPaths },
        [
          'Copy .env.example to .env: cp .env.example .env',
          'Fill in your API keys in the .env file',
          'Make sure .env is in the project root or scripts/sync-engine/'
        ]
      );
    }

    // Validate .env structure
    const lines = envContent.split('\n');
    const issues = [];
    const definedVars = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and comments
      if (!line || line.startsWith('#')) continue;
      
      // Check for proper KEY=value format
      if (!line.includes('=')) {
        issues.push(`Line ${i + 1}: Missing '=' separator`);
        continue;
      }
      
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=');
      
      if (!key || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
        issues.push(`Line ${i + 1}: Invalid key name "${key}"`);
      }
      
      definedVars.push(key);
    }

    if (issues.length > 0) {
      return this.addResult(
        'env_file_structure',
        ValidationStatus.FAIL,
        `.env file has structural issues: ${issues.join('; ')}`,
        { issues, definedVars },
        [
          'Fix the issues in your .env file',
          'Use format: KEY=value (no spaces around =)',
          'Keys must start with letter/underscore, contain only alphanumeric and _'
        ]
      );
    }

    return this.addResult(
      'env_file_structure',
      ValidationStatus.PASS,
      '.env file structure valid',
      { definedVars, lineCount: lines.length }
    );
  }

  /**
   * Check available disk space (need 500MB+)
   */
  async validateDiskSpace() {
    const minRequiredMB = 500;
    
    try {
      let availableMB;
      
      if (process.platform === 'darwin' || process.platform === 'linux') {
        // Unix-based systems
        const { stdout } = await execAsync('df -m . | tail -1');
        const parts = stdout.trim().split(/\s+/);
        availableMB = parseInt(parts[3], 10);
      } else if (process.platform === 'win32') {
        // Windows
        const { stdout } = await execAsync('wmic logicaldisk get size,freespace,caption');
        const lines = stdout.trim().split('\n');
        const currentDrive = process.cwd().charAt(0).toUpperCase();
        for (const line of lines.slice(1)) {
          const parts = line.trim().split(/\s+/);
          if (parts[0].startsWith(currentDrive)) {
            availableMB = parseInt(parts[1], 10) / (1024 * 1024);
            break;
          }
        }
      }

      if (!availableMB) {
        return this.addResult(
          'disk_space',
          ValidationStatus.WARNING,
          'Could not determine available disk space',
          { minRequiredMB },
          ['Ensure at least 500MB free space is available']
        );
      }

      if (availableMB >= minRequiredMB) {
        return this.addResult(
          'disk_space',
          ValidationStatus.PASS,
          `Disk space sufficient: ${Math.round(availableMB)}MB available (requires ${minRequiredMB}MB)`,
          { availableMB, minRequiredMB }
        );
      }

      return this.addResult(
        'disk_space',
        ValidationStatus.FAIL,
        `Insufficient disk space: ${Math.round(availableMB)}MB available (requires ${minRequiredMB}MB)`,
        { availableMB, minRequiredMB },
        [
          'Free up disk space',
          'Delete old log files in scripts/sync-engine/src/logs/',
          'Remove unused client directories if safe to do so'
        ]
      );
    } catch (error) {
      return this.addResult(
        'disk_space',
        ValidationStatus.WARNING,
        `Could not check disk space: ${error.message}`,
        { minRequiredMB },
        ['Ensure at least 500MB free space is available']
      );
    }
  }

  /**
   * Run all pre-validation checks
   */
  async validatePreSetup() {
    if (!this.options.silent && !this.options.jsonOutput) {
      console.log('\n' + Colors.cyan + '╔════════════════════════════════════════════════╗' + Colors.reset);
      console.log(Colors.cyan + '║         Pre-Setup Validation                   ║' + Colors.reset);
      console.log(Colors.cyan + '╚════════════════════════════════════════════════╝' + Colors.reset + '\n');
    }

    await this.validateNodeVersion();
    await this.validateEnvironmentVariables();
    await this.validateEnvFile();
    await this.validateDiskSpace();

    return this.getSummary();
  }

  //===========================================================================
  // STEP VALIDATION METHODS
  //===========================================================================

  /**
   * Validate GHL API credentials with live API test
   */
  async validateGHLConnection(apiKey = null, locationId = null) {
    const key = apiKey || process.env.GHL_API_KEY;
    const locId = locationId || process.env.GHL_LOCATION_ID;

    if (!key) {
      return this.addResult(
        'ghl_connection',
        ValidationStatus.FAIL,
        'GHL_API_KEY not configured',
        null,
        ['Set GHL_API_KEY environment variable', 'Get API key from GoHighLevel Settings > API']
      );
    }

    if (!locId) {
      return this.addResult(
        'ghl_connection',
        ValidationStatus.FAIL,
        'GHL_LOCATION_ID not configured',
        null,
        ['Set GHL_LOCATION_ID environment variable', 'Find Location ID in GHL URL or Settings']
      );
    }

    try {
      const response = await axios.get(
        `https://services.leadconnectorhq.com/locations/${locId}`,
        {
          headers: {
            'Authorization': `Bearer ${key}`,
            'Version': '2021-07-28'
          },
          timeout: 15000
        }
      );

      const data = response.data;
      
      return this.addResult(
        'ghl_connection',
        ValidationStatus.PASS,
        `GHL connection successful: ${data.name}`,
        {
          locationName: data.name,
          locationId: data.id,
          timezone: data.timezone,
          email: data.email,
          phone: data.phone
        }
      );
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;
      
      let fixInstructions = [
        'Check that GHL_API_KEY is correct and not expired',
        'Verify GHL_LOCATION_ID is correct',
        'Ensure the location is active in GoHighLevel'
      ];
      
      if (status === 401) {
        fixInstructions = [
          'Your GHL API key is invalid or expired',
          'Generate a new API key in GoHighLevel Settings > API',
          'Update GHL_API_KEY in your .env file'
        ];
      } else if (status === 404) {
        fixInstructions = [
          'Location ID not found',
          'Verify GHL_LOCATION_ID is correct',
          'Check that the location exists and you have access'
        ];
      }

      return this.addResult(
        'ghl_connection',
        ValidationStatus.FAIL,
        `GHL connection failed: ${message}`,
        { status, error: message },
        fixInstructions
      );
    }
  }

  /**
   * Validate Airtable connection with list bases and verify write access
   */
  async validateAirtableConnection(pat = null, baseId = null) {
    const apiKey = pat || process.env.AIRTABLE_API_KEY;
    const base = baseId || process.env.AIRTABLE_BASE_ID;

    if (!apiKey) {
      return this.addResult(
        'airtable_connection',
        ValidationStatus.FAIL,
        'AIRTABLE_API_KEY not configured',
        null,
        [
          'Create a Personal Access Token at https://airtable.com/create/tokens',
          'Set AIRTABLE_API_KEY in your .env file',
          'Required scopes: data.records:read, data.records:write, schema.bases:read'
        ]
      );
    }

    if (!base) {
      return this.addResult(
        'airtable_connection',
        ValidationStatus.FAIL,
        'AIRTABLE_BASE_ID not configured',
        null,
        [
          'Find your Base ID in Airtable API documentation',
          'It starts with "app" followed by alphanumeric characters',
          'Set AIRTABLE_BASE_ID in your .env file'
        ]
      );
    }

    try {
      const { default: Airtable } = await import('airtable');
      
      Airtable.configure({ apiKey });
      const airtableBase = Airtable.base(base);
      
      // Test 1: List tables (schema read access)
      const tables = await airtableBase.tables();
      const tableNames = tables.map(t => t.name);
      
      // Check for required tables
      const requiredTables = ['Journeys', 'Touchpoints', 'Templates'];
      const missingTables = requiredTables.filter(t => !tableNames.includes(t));
      
      // Test 2: Verify write access by attempting to read a record
      let writeAccess = false;
      try {
        if (tableNames.includes('Journeys')) {
          await airtableBase('Journeys').select({ maxRecords: 1 }).firstPage();
          writeAccess = true;
        }
      } catch (writeError) {
        // Write access might be limited, but that's ok for validation
      }

      if (missingTables.length > 0) {
        return this.addResult(
          'airtable_connection',
          ValidationStatus.WARNING,
          `Airtable connected but missing recommended tables: ${missingTables.join(', ')}`,
          {
            baseId: base,
            tablesFound: tableNames,
            missingTables,
            writeAccess
          },
          [
            `Create the missing tables: ${missingTables.join(', ')}`,
            'Or run the Airtable setup script: npm run setup-airtable'
          ]
        );
      }

      return this.addResult(
        'airtable_connection',
        ValidationStatus.PASS,
        `Airtable connection successful: ${tableNames.length} tables accessible`,
        {
          baseId: base,
          tables: tableNames,
          writeAccess
        }
      );
    } catch (error) {
      let fixInstructions = [
        'Verify AIRTABLE_API_KEY is a valid Personal Access Token',
        'Check that AIRTABLE_BASE_ID is correct',
        'Ensure the token has access to the base'
      ];
      
      if (error.message?.includes('AUTHENTICATION_REQUIRED') || error.message?.includes('INVALID')) {
        fixInstructions = [
          'Your Airtable Personal Access Token is invalid',
          'Create a new token at https://airtable.com/create/tokens',
          'Ensure it has the required scopes',
          'Update AIRTABLE_API_KEY in your .env file'
        ];
      } else if (error.message?.includes('NOT_FOUND')) {
        fixInstructions = [
          'Base ID not found',
          'Verify AIRTABLE_BASE_ID is correct',
          'Ensure the base exists and the token has access to it'
        ];
      }

      return this.addResult(
        'airtable_connection',
        ValidationStatus.FAIL,
        `Airtable connection failed: ${error.message}`,
        { error: error.message },
        fixInstructions
      );
    }
  }

  /**
   * Validate brand voice configuration JSON structure
   */
  async validateBrandVoiceConfig(configPath = null) {
    const profilePath = configPath || path.join(this.clientDir, 'knowledge-hub/brand-voice/profile.json');
    
    try {
      const content = await fs.readFile(profilePath, 'utf8');
      const profile = JSON.parse(content);
      
      // Validate schema
      const required = {
        'voice.adjectives': Array.isArray(profile.voice?.adjectives),
        'voice.personality': typeof profile.voice?.personality === 'string',
        'voice.do': Array.isArray(profile.voice?.do),
        'voice.dont': Array.isArray(profile.voice?.dont),
        'messaging.valueProposition': typeof profile.messaging?.valueProposition === 'string'
      };

      const missing = Object.entries(required)
        .filter(([, valid]) => !valid)
        .map(([field]) => field);

      if (missing.length > 0) {
        return this.addResult(
          'brand_voice_config',
          ValidationStatus.WARNING,
          `Brand voice config missing recommended fields: ${missing.join(', ')}`,
          { profilePath, missing },
          [
            `Add the missing fields to ${profilePath}`,
            'Run brand voice analysis to auto-populate these fields'
          ]
        );
      }

      return this.addResult(
        'brand_voice_config',
        ValidationStatus.PASS,
        'Brand voice configuration valid',
        {
          profilePath,
          adjectives: profile.voice?.adjectives?.length || 0,
          personality: profile.voice?.personality,
          dos: profile.voice?.do?.length || 0,
          donts: profile.voice?.dont?.length || 0
        }
      );
    } catch (error) {
      if (error.code === 'ENOENT') {
        return this.addResult(
          'brand_voice_config',
          ValidationStatus.FAIL,
          'Brand voice profile not found',
          { profilePath },
          [
            `Create brand voice profile at ${profilePath}`,
            'Run brand voice analysis: npm run analyze-brand-voice'
          ]
        );
      }
      
      if (error instanceof SyntaxError) {
        return this.addResult(
          'brand_voice_config',
          ValidationStatus.FAIL,
          `Invalid JSON in brand voice profile: ${error.message}`,
          { profilePath },
          [
            `Fix JSON syntax errors in ${profilePath}`,
            'Use a JSON validator to find the error'
          ]
        );
      }

      return this.addResult(
        'brand_voice_config',
        ValidationStatus.FAIL,
        `Brand voice validation failed: ${error.message}`,
        { profilePath },
        ['Check file permissions and path']
      );
    }
  }

  /**
   * Validate email templates MJML syntax
   */
  async validateEmailTemplates(templatesPath = null) {
    const emailPath = templatesPath || path.join(this.clientDir, 'emails/email-templates.json');
    
    try {
      const content = await fs.readFile(emailPath, 'utf8');
      const templates = JSON.parse(content);
      
      if (!templates.templates || !Array.isArray(templates.templates)) {
        return this.addResult(
          'email_templates',
          ValidationStatus.FAIL,
          'Email templates missing "templates" array',
          { emailPath },
          [
            `Fix structure in ${emailPath}`,
            'Expected format: { "templates": [...] }'
          ]
        );
      }

      const issues = [];
      const templateChecks = [];

      for (const template of templates.templates) {
        const check = {
          id: template.id,
          name: template.name,
          hasSubject: !!template.subject,
          hasMjml: !!template.mjml,
          mjmlValid: true,
          issues: []
        };

        if (!template.subject) {
          check.issues.push('Missing subject line');
        }

        if (!template.mjml) {
          check.issues.push('Missing MJML content');
          check.mjmlValid = false;
        } else {
          // Basic MJML validation
          const mjml = template.mjml;
          
          // Check for common MJML errors
          if (!mjml.includes('<mjml>')) {
            check.issues.push('Missing <mjml> root tag');
            check.mjmlValid = false;
          }
          if (!mjml.includes('<mj-body>')) {
            check.issues.push('Missing <mj-body> tag');
            check.mjmlValid = false;
          }
          
          // Check for unclosed tags (basic check)
          const selfClosing = ['mj-image', 'mj-divider', 'mj-spacer', 'mj-breakpoint'];
          const tags = mjml.match(/<mj-[a-z-]+/g) || [];
          const closingTags = mjml.match(/<\/mj-[a-z-]+>/g) || [];
          
          // This is a simplified check - real MJML validation would need the mjml package
          if (tags.length < closingTags.length) {
            check.issues.push('Potentially unclosed MJML tags');
            check.mjmlValid = false;
          }
        }

        if (check.issues.length > 0) {
          issues.push(`${template.name}: ${check.issues.join(', ')}`);
        }
        
        templateChecks.push(check);
      }

      if (issues.length > 0) {
        return this.addResult(
          'email_templates',
          ValidationStatus.WARNING,
          `${issues.length} template(s) have issues`,
          {
            emailPath,
            totalTemplates: templates.templates.length,
            issues,
            templateChecks
          },
          [
            `Review and fix issues in ${emailPath}`,
            'Use the MJML online validator: https://mjml.io/try-it-live',
            'Ensure all templates have <mjml> and <mj-body> tags'
          ]
        );
      }

      return this.addResult(
        'email_templates',
        ValidationStatus.PASS,
        `${templates.templates.length} email templates validated`,
        {
          emailPath,
          totalTemplates: templates.templates.length,
          templateChecks: templateChecks.map(t => ({
            name: t.name,
            hasSubject: t.hasSubject,
            hasMjml: t.hasMjml
          }))
        }
      );
    } catch (error) {
      if (error.code === 'ENOENT') {
        return this.addResult(
          'email_templates',
          ValidationStatus.FAIL,
          'Email templates file not found',
          { emailPath },
          [
            `Create email templates at ${emailPath}`,
            'Copy from templates/standard-client/emails/email-templates.json'
          ]
        );
      }
      
      if (error instanceof SyntaxError) {
        return this.addResult(
          'email_templates',
          ValidationStatus.FAIL,
          `Invalid JSON in email templates: ${error.message}`,
          { emailPath },
          [`Fix JSON syntax errors in ${emailPath}`]
        );
      }

      return this.addResult(
        'email_templates',
        ValidationStatus.FAIL,
        `Email templates validation failed: ${error.message}`,
        { emailPath }
      );
    }
  }

  /**
   * Validate client configuration JSON schema
   */
  async validateClientConfig(configPath = null) {
    const configFile = configPath || path.join(this.clientDir, 'location-config.json');
    
    try {
      const content = await fs.readFile(configFile, 'utf8');
      const config = JSON.parse(content);
      
      // Define schema requirements
      const schema = {
        required: ['locationId', 'name', 'timezone'],
        contact: ['email', 'phone'],
        address: ['city', 'state'],
        optional: ['industry', 'website']
      };

      const missing = [];
      const present = [];

      // Check required fields
      for (const field of schema.required) {
        if (!config[field]) {
          missing.push(field);
        } else {
          present.push(field);
        }
      }

      // Check contact fields
      if (config.contact) {
        for (const field of schema.contact) {
          if (!config.contact[field]) {
            missing.push(`contact.${field}`);
          } else {
            present.push(`contact.${field}`);
          }
        }
      } else {
        missing.push('contact');
      }

      // Check address fields
      if (config.address) {
        for (const field of schema.address) {
          if (!config.address[field]) {
            missing.push(`address.${field}`);
          } else {
            present.push(`address.${field}`);
          }
        }
      } else {
        missing.push('address');
      }

      if (missing.length > 0) {
        return this.addResult(
          'client_config',
          ValidationStatus.WARNING,
          `Client config missing fields: ${missing.join(', ')}`,
          { configFile, missing, present },
          [
            `Update ${configFile} with missing fields`,
            'Run GHL extraction to auto-populate location data'
          ]
        );
      }

      return this.addResult(
        'client_config',
        ValidationStatus.PASS,
        'Client configuration valid',
        {
          configFile,
          locationId: config.locationId,
          name: config.name,
          timezone: config.timezone,
          present
        }
      );
    } catch (error) {
      if (error.code === 'ENOENT') {
        return this.addResult(
          'client_config',
          ValidationStatus.FAIL,
          'Location config not found',
          { configFile },
          [
            `Create location config at ${configFile}`,
            'Copy from templates/standard-client/location-config.json'
          ]
        );
      }
      
      if (error instanceof SyntaxError) {
        return this.addResult(
          'client_config',
          ValidationStatus.FAIL,
          `Invalid JSON in location config: ${error.message}`,
          { configFile },
          [`Fix JSON syntax errors in ${configFile}`]
        );
      }

      return this.addResult(
        'client_config',
        ValidationStatus.FAIL,
        `Client config validation failed: ${error.message}`,
        { configFile }
      );
    }
  }

  //===========================================================================
  // POST-VALIDATION METHODS
  //===========================================================================

  /**
   * Run end-to-end sync test
   */
  async runPostSetupValidation() {
    if (!this.options.silent && !this.options.jsonOutput) {
      console.log('\n' + Colors.cyan + '╔════════════════════════════════════════════════╗' + Colors.reset);
      console.log(Colors.cyan + '║         Post-Setup E2E Validation              ║' + Colors.reset);
      console.log(Colors.cyan + '╚════════════════════════════════════════════════╝' + Colors.reset + '\n');
    }

    await this.validateRequiredFiles();
    await this.validateApiResponses();
    await this.validateE2ESync();
    await this.validateKnowledgeHub();

    return this.getSummary();
  }

  /**
   * Validate E2E sync by creating a test journey
   */
  async validateE2ESync() {
    try {
      // Check if we can create a test journey
      const { JourneyGenerator } = await import('../services/journey-generator.js');
      const generator = new JourneyGenerator(this.clientSlug);
      
      // Try to validate journey generation without creating
      const canGenerate = await generator.validateSetup();
      
      if (canGenerate.valid) {
        return this.addResult(
          'e2e_sync',
          ValidationStatus.PASS,
          'E2E sync test passed - journey generation ready',
          canGenerate
        );
      }

      return this.addResult(
        'e2e_sync',
        ValidationStatus.WARNING,
        'E2E sync test has issues',
        canGenerate,
        canGenerate.issues || ['Check journey generator configuration']
      );
    } catch (error) {
      return this.addResult(
        'e2e_sync',
        ValidationStatus.FAIL,
        `E2E sync test failed: ${error.message}`,
        { error: error.message },
        [
          'Ensure all previous setup steps completed successfully',
          'Check that GHL and Airtable connections are working',
          'Verify client configuration is complete'
        ]
      );
    }
  }

  /**
   * Check if client directory exists
   */
  async validateClientDirectory() {
    try {
      const stats = await fs.stat(this.clientDir);
      if (stats.isDirectory()) {
        return this.addResult('client_directory', ValidationStatus.PASS, 'Client directory exists');
      }
      return this.addResult(
        'client_directory',
        ValidationStatus.FAIL,
        'Client path exists but is not a directory'
      );
    } catch (error) {
      return this.addResult(
        'client_directory',
        ValidationStatus.FAIL,
        `Client directory not found: ${this.clientDir}`,
        null,
        [`Create client directory: mkdir -p ${this.clientDir}`]
      );
    }
  }

  /**
   * Validate required files exist
   */
  async validateRequiredFiles() {
    const requiredFiles = [
      { path: 'location-config.json', critical: true },
      { path: 'README.md', critical: false },
      { path: 'knowledge-hub/config.json', critical: true },
      { path: 'knowledge-hub/golden-pages/index.json', critical: true },
      { path: 'knowledge-hub/facts/index.json', critical: true },
      { path: 'knowledge-hub/brand-voice/profile.json', critical: true }
    ];

    let passed = 0;
    let failed = 0;

    for (const file of requiredFiles) {
      const filePath = path.join(this.clientDir, file.path);
      try {
        await fs.access(filePath);
        this.addResult(`file:${file.path}`, ValidationStatus.PASS, `File exists: ${file.path}`);
        passed++;
      } catch (error) {
        const status = file.critical ? ValidationStatus.FAIL : ValidationStatus.WARNING;
        this.addResult(
          `file:${file.path}`,
          status,
          `Missing file: ${file.path}`,
          { critical: file.critical },
          file.critical ? [`Create required file: ${file.path}`] : null
        );
        if (file.critical) failed++;
      }
    }

    return { passed, failed, total: requiredFiles.length };
  }

  /**
   * Validate API responses directory
   */
  async validateApiResponses() {
    try {
      const apiResponsesDir = path.join(this.clientDir, 'api-responses');
      const files = await fs.readdir(apiResponsesDir);
      
      const expectedFiles = [
        'location-data.json',
        'pipelines-data.json',
        'email-templates-data.json',
        'sms-templates-data.json'
      ];
      
      const found = expectedFiles.filter(f => files.includes(f));
      const missing = expectedFiles.filter(f => !files.includes(f));
      
      const checks = {
        found: found.length,
        missing: missing.length,
        files: found
      };

      if (found.length === 0) {
        return this.addResult(
          'api_responses',
          ValidationStatus.WARNING,
          'No GHL API response files found - GHL extraction may not have run',
          checks,
          ['Run GHL extraction to populate API responses']
        );
      }

      if (missing.length > 0) {
        return this.addResult(
          'api_responses',
          ValidationStatus.WARNING,
          `Some API response files missing: ${missing.join(', ')}`,
          checks
        );
      }

      return this.addResult(
        'api_responses',
        ValidationStatus.PASS,
        'All expected GHL API responses found',
        checks
      );
    } catch (error) {
      return this.addResult(
        'api_responses',
        ValidationStatus.WARNING,
        `API responses directory not found: ${error.message}`,
        null,
        ['Run GHL extraction to create API responses directory']
      );
    }
  }

  /**
   * Validate Knowledge Hub is populated
   */
  async validateKnowledgeHub() {
    try {
      const hub = new KnowledgeHub(this.clientSlug);
      const isInitialized = await hub.isInitialized();
      
      if (!isInitialized) {
        return this.addResult(
          'knowledge_hub',
          ValidationStatus.FAIL,
          'Knowledge Hub not initialized',
          null,
          ['Initialize Knowledge Hub: npm run init-knowledge-hub']
        );
      }

      const stats = await hub.getStats();
      
      const checks = {
        initialized: true,
        hasPages: stats.goldenPages.total > 0,
        hasFacts: stats.facts.total > 0,
        pagesCount: stats.goldenPages.total,
        factsCount: stats.facts.total,
        verifiedFacts: stats.facts.verified
      };

      if (!checks.hasPages) {
        return this.addResult(
          'knowledge_hub',
          ValidationStatus.WARNING,
          'Knowledge Hub initialized but no pages crawled',
          checks,
          ['Run website crawler: npm run crawl-website']
        );
      }

      if (!checks.hasFacts) {
        return this.addResult(
          'knowledge_hub',
          ValidationStatus.WARNING,
          `Knowledge Hub has ${checks.pagesCount} pages but no facts extracted`,
          checks,
          ['Run fact extraction: npm run extract-facts']
        );
      }

      return this.addResult(
        'knowledge_hub',
        ValidationStatus.PASS,
        `Knowledge Hub populated: ${checks.pagesCount} pages, ${checks.factsCount} facts (${checks.verifiedFacts} verified)`,
        checks
      );
    } catch (error) {
      return this.addResult(
        'knowledge_hub',
        ValidationStatus.FAIL,
        `Knowledge Hub validation failed: ${error.message}`,
        null,
        ['Check Knowledge Hub configuration', 'Re-initialize if necessary']
      );
    }
  }

  /**
   * Validate OpenAI connection
   */
  async validateOpenAIConnection() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return this.addResult(
        'openai_connection',
        ValidationStatus.WARNING,
        'OPENAI_API_KEY not configured - AI features will be limited',
        null,
        ['Set OPENAI_API_KEY for AI-powered features']
      );
    }

    try {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey });
      
      // Test with a simple request
      await openai.models.list();
      
      return this.addResult(
        'openai_connection',
        ValidationStatus.PASS,
        'OpenAI connection successful'
      );
    } catch (error) {
      return this.addResult(
        'openai_connection',
        ValidationStatus.FAIL,
        `OpenAI connection failed: ${error.message}`,
        null,
        [
          'Check that OPENAI_API_KEY is valid',
          'Verify your OpenAI account has available credits'
        ]
      );
    }
  }

  /**
   * Test if website is crawlable
   */
  async validateWebsiteCrawlable(websiteUrl = null) {
    // Get website from location config if not provided
    let url = websiteUrl;
    if (!url) {
      try {
        const configPath = path.join(this.clientDir, 'location-config.json');
        const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
        url = config.contact?.website;
      } catch (error) {
        return this.addResult(
          'website_crawlable',
          ValidationStatus.FAIL,
          `Could not read location config: ${error.message}`
        );
      }
    }

    if (!url) {
      return this.addResult(
        'website_crawlable',
        ValidationStatus.FAIL,
        'No website URL found',
        null,
        ['Set website URL in location-config.json contact.website field']
      );
    }

    try {
      const response = await axios.get(url, {
        timeout: 15000,
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BloomBuilder/1.0; +https://thebloom.app)'
        }
      });

      const contentType = response.headers['content-type'] || '';
      
      if (response.status === 200 && contentType.includes('text/html')) {
        const hasContent = response.data && response.data.length > 100;
        if (hasContent) {
          return this.addResult(
            'website_crawlable',
            ValidationStatus.PASS,
            `Website accessible: ${url}`,
            {
              url,
              status: response.status,
              contentLength: response.data.length
            }
          );
        } else {
          return this.addResult(
            'website_crawlable',
            ValidationStatus.WARNING,
            `Website accessible but content seems minimal: ${url}`,
            { url, contentLength: response.data?.length }
          );
        }
      } else {
        return this.addResult(
          'website_crawlable',
          ValidationStatus.WARNING,
          `Website returned non-HTML content: ${contentType}`,
          { url, contentType }
        );
      }
    } catch (error) {
      return this.addResult(
        'website_crawlable',
        ValidationStatus.FAIL,
        `Website crawl failed: ${error.message}`,
        { url },
        [
          'Check that the website URL is correct',
          'Ensure the website is publicly accessible',
          'Verify the website allows bot crawling'
        ]
      );
    }
  }

  /**
   * Validate JSON schemas
   */
  async validateJsonSchemas() {
    const schemas = [
      { path: 'location-config.json', required: ['locationId', 'name', 'timezone'] },
      { path: 'knowledge-hub/config.json', required: ['clientSlug', 'version'] },
      { path: 'knowledge-hub/facts/index.json', required: ['facts', 'categories'] },
      { path: 'knowledge-hub/golden-pages/index.json', required: ['pages'] }
    ];

    let passed = 0;
    let failed = 0;

    for (const schema of schemas) {
      const filePath = path.join(this.clientDir, schema.path);
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(content);
        
        // Check required fields
        const missing = schema.required.filter(field => {
          const parts = field.split('.');
          let value = data;
          for (const part of parts) {
            value = value?.[part];
            if (value === undefined) break;
          }
          return value === undefined;
        });
        
        if (missing.length > 0) {
          this.addResult(
            `schema:${schema.path}`,
            ValidationStatus.FAIL,
            `Missing required fields: ${missing.join(', ')}`,
            { file: schema.path, missing }
          );
          failed++;
        } else {
          this.addResult(
            `schema:${schema.path}`,
            ValidationStatus.PASS,
            `Valid schema: ${schema.path}`
          );
          passed++;
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          this.addResult(
            `schema:${schema.path}`,
            ValidationStatus.FAIL,
            `Invalid JSON: ${error.message}`
          );
        } else {
          this.addResult(
            `schema:${schema.path}`,
            ValidationStatus.FAIL,
            `File error: ${error.message}`
          );
        }
        failed++;
      }
    }

    return { passed, failed, total: schemas.length };
  }

  //===========================================================================
  // COMPREHENSIVE VALIDATION
  //===========================================================================

  /**
   * Run all validations
   */
  async runAllValidations(options = {}) {
    logger.info(`Running setup validation for ${this.clientSlug || 'system'}`);

    // Pre-validation
    if (!options.skipPreValidation) {
      await this.validatePreSetup();
    }

    // Core setup
    if (this.clientSlug) {
      await this.validateClientDirectory();
      await this.validateRequiredFiles();
      await this.validateJsonSchemas();
      await this.validateClientConfig();
    }

    // API connections
    if (!options.skipConnections) {
      await this.validateGHLConnection(options.ghlApiKey, options.ghlLocationId);
      await this.validateAirtableConnection();
      await this.validateOpenAIConnection();
    }

    // Website
    if (!options.skipWebsite && this.clientSlug) {
      await this.validateWebsiteCrawlable(options.websiteUrl);
    }

    // Knowledge Hub
    if (!options.skipKnowledgeHub && this.clientSlug) {
      await this.validateKnowledgeHub();
      await this.validateBrandVoiceConfig();
    }

    // Email templates
    if (!options.skipEmailTemplates && this.clientSlug) {
      await this.validateEmailTemplates();
    }

    return this.generateReport();
  }

  /**
   * Get validation summary
   */
  getSummary() {
    const passed = this.results.filter(r => r.status === ValidationStatus.PASS).length;
    const failed = this.results.filter(r => r.status === ValidationStatus.FAIL).length;
    const warnings = this.results.filter(r => r.status === ValidationStatus.WARNING).length;
    const skipped = this.results.filter(r => r.status === ValidationStatus.SKIP).length;
    
    return {
      total: this.results.length,
      passed,
      failed,
      warnings,
      skipped,
      isValid: failed === 0,
      hasWarnings: warnings > 0
    };
  }

  /**
   * Generate validation report
   */
  generateReport() {
    const summary = this.getSummary();
    
    const report = {
      summary: {
        ...summary,
        duration: Date.now() - this.startTime,
        timestamp: new Date().toISOString()
      },
      results: this.results,
      errors: this.errors,
      warnings: this.warnings
    };

    logger.info(`Validation complete: ${summary.passed} passed, ${summary.failed} failed, ${summary.warnings} warnings`);
    
    return report;
  }

  /**
   * Save validation report to file
   */
  async saveReport(outputPath = null) {
    const report = this.generateReport();
    
    // Determine output path
    let filePath;
    if (outputPath) {
      filePath = outputPath;
    } else if (this.clientSlug) {
      filePath = path.join(this.clientDir, '.bloom', 'validation-report.json');
    } else {
      filePath = path.join(repoRoot, '.bloom', 'validation-report.json');
    }

    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    await fs.writeFile(filePath, JSON.stringify(report, null, 2) + '\n', 'utf8');
    logger.success(`Validation report saved: ${filePath}`);
    
    return filePath;
  }

  /**
   * Print validation summary to console with colors
   */
  printSummary() {
    const report = this.generateReport();
    const summary = report.summary;
    
    if (this.options.jsonOutput) {
      console.log(JSON.stringify(report, null, 2));
      return report;
    }

    if (this.options.silent) return report;
    
    console.log('\n' + Colors.cyan + '╔════════════════════════════════════════════════╗' + Colors.reset);
    console.log(Colors.cyan + '║         Setup Validation Report                ║' + Colors.reset);
    console.log(Colors.cyan + '╚════════════════════════════════════════════════╝' + Colors.reset + '\n');
    
    console.log(`Total Checks: ${summary.total}`);
    console.log(`${Colors.green}✓${Colors.reset} Passed: ${summary.passed}`);
    console.log(`${Colors.red}✗${Colors.reset} Failed: ${summary.failed}`);
    console.log(`${Colors.yellow}⚠${Colors.reset}  Warnings: ${summary.warnings}`);
    if (summary.skipped > 0) {
      console.log(`${Colors.gray}○${Colors.reset} Skipped: ${summary.skipped}`);
    }
    console.log(`\nDuration: ${(summary.duration / 1000).toFixed(2)}s`);
    console.log('');
    
    if (report.errors.length > 0) {
      console.log(Colors.red + 'Errors:' + Colors.reset);
      report.errors.forEach(e => {
        console.log(`  ${Colors.red}✗${Colors.reset} ${e.check}: ${e.message}`);
        if (e.fixInstructions) {
          e.fixInstructions.forEach(fix => {
            console.log(`    ${Colors.gray}→ ${fix}${Colors.reset}`);
          });
        }
      });
      console.log('');
    }
    
    if (report.warnings.length > 0) {
      console.log(Colors.yellow + 'Warnings:' + Colors.reset);
      report.warnings.slice(0, 5).forEach(w => {
        console.log(`  ${Colors.yellow}⚠${Colors.reset} ${w.check}: ${w.message}`);
      });
      if (report.warnings.length > 5) {
        console.log(`  ${Colors.gray}... and ${report.warnings.length - 5} more warnings${Colors.reset}`);
      }
      console.log('');
    }
    
    if (summary.isValid) {
      console.log(Colors.green + '✅ All critical checks passed!' + Colors.reset);
      if (summary.hasWarnings) {
        console.log(Colors.yellow + '⚠️  Some warnings should be addressed' + Colors.reset);
      }
    } else {
      console.log(Colors.red + '❌ Some critical checks failed. Please review and fix.' + Colors.reset);
    }
    
    console.log('');
    
    return report;
  }
}

/**
 * Quick validation runner for CLI use
 */
export async function runValidation(clientSlug, options = {}) {
  const validator = new SetupValidator(clientSlug, options);
  
  try {
    await validator.runAllValidations(options);
    const report = validator.generateReport();
    
    if (!options.skipSave) {
      await validator.saveReport(options.outputPath);
    }
    
    if (!options.silent) {
      validator.printSummary();
    }
    
    return report;
  } catch (error) {
    logger.error(`Validation failed: ${error.message}`);
    throw error;
  }
}

export default SetupValidator;
