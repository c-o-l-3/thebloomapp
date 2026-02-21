/**
 * Setup Validation System
 * Comprehensive validation for client onboarding
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import logger from './logger.js';
import { KnowledgeHub } from '../services/knowledge-hub.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../..');

export class SetupValidator {
  constructor(clientSlug) {
    this.clientSlug = clientSlug;
    this.clientDir = path.join(repoRoot, 'clients', clientSlug);
    this.results = [];
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Add a validation result
   */
  addResult(check, status, message, details = null) {
    const result = {
      check,
      status, // 'pass', 'fail', 'warning'
      message,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.results.push(result);
    
    if (status === 'fail') {
      this.errors.push(result);
    } else if (status === 'warning') {
      this.warnings.push(result);
    }
    
    return result;
  }

  /**
   * Check if client directory exists
   */
  async validateClientDirectory() {
    try {
      const stats = await fs.stat(this.clientDir);
      if (stats.isDirectory()) {
        return this.addResult('client_directory', 'pass', 'Client directory exists');
      }
      return this.addResult('client_directory', 'fail', 'Client path exists but is not a directory');
    } catch (error) {
      return this.addResult('client_directory', 'fail', `Client directory not found: ${this.clientDir}`);
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
        this.addResult(`file:${file.path}`, 'pass', `File exists: ${file.path}`);
        passed++;
      } catch (error) {
        const status = file.critical ? 'fail' : 'warning';
        this.addResult(`file:${file.path}`, status, `Missing file: ${file.path}`, { critical: file.critical });
        if (file.critical) failed++;
      }
    }

    return {
      passed,
      failed,
      total: requiredFiles.length
    };
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
        const missing = schema.required.filter(field => !(field in data));
        if (missing.length > 0) {
          this.addResult(`schema:${schema.path}`, 'fail', `Missing required fields: ${missing.join(', ')}`);
          failed++;
        } else {
          this.addResult(`schema:${schema.path}`, 'pass', `Valid schema: ${schema.path}`);
          passed++;
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          this.addResult(`schema:${schema.path}`, 'fail', `Invalid JSON: ${error.message}`);
        } else {
          this.addResult(`schema:${schema.path}`, 'fail', `File error: ${error.message}`);
        }
        failed++;
      }
    }

    return { passed, failed, total: schemas.length };
  }

  /**
   * Validate GHL API key works
   */
  async validateGHLConnection(apiKey = null, locationId = null) {
    const key = apiKey || process.env.GHL_API_KEY;
    const locId = locationId || process.env.GHL_LOCATION_ID;

    if (!key) {
      return this.addResult('ghl_connection', 'fail', 'GHL_API_KEY not configured');
    }

    if (!locId) {
      return this.addResult('ghl_connection', 'fail', 'GHL_LOCATION_ID not configured');
    }

    try {
      const response = await axios.get(
        `https://services.leadconnectorhq.com/locations/${locId}`,
        {
          headers: {
            'Authorization': `Bearer ${key}`,
            'Version': '2021-07-28'
          },
          timeout: 10000
        }
      );

      return this.addResult('ghl_connection', 'pass', `GHL connection successful: ${response.data.name}`, {
        locationName: response.data.name
      });
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      return this.addResult('ghl_connection', 'fail', `GHL connection failed: ${message}`);
    }
  }

  /**
   * Validate Airtable connection
   */
  async validateAirtableConnection() {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (!apiKey) {
      return this.addResult('airtable_connection', 'fail', 'AIRTABLE_API_KEY not configured');
    }

    if (!baseId) {
      return this.addResult('airtable_connection', 'fail', 'AIRTABLE_BASE_ID not configured');
    }

    try {
      const { default: Airtable } = await import('airtable');
      
      Airtable.configure({ apiKey });
      const base = Airtable.base(baseId);
      
      // Test by fetching one record from Journeys table
      const records = await base('Journeys').select({ maxRecords: 1 }).firstPage();
      
      return this.addResult('airtable_connection', 'pass', 'Airtable connection successful', {
        tablesAccessible: ['Journeys']
      });
    } catch (error) {
      return this.addResult('airtable_connection', 'fail', `Airtable connection failed: ${error.message}`);
    }
  }

  /**
   * Validate OpenAI connection
   */
  async validateOpenAIConnection() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return this.addResult('openai_connection', 'warning', 'OPENAI_API_KEY not configured - AI features will be limited');
    }

    try {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey });
      
      // Test with a simple request
      await openai.models.list();
      
      return this.addResult('openai_connection', 'pass', 'OpenAI connection successful');
    } catch (error) {
      return this.addResult('openai_connection', 'fail', `OpenAI connection failed: ${error.message}`);
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
        return this.addResult('website_crawlable', 'fail', `Could not read location config: ${error.message}`);
      }
    }

    if (!url) {
      return this.addResult('website_crawlable', 'fail', 'No website URL found');
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
          return this.addResult('website_crawlable', 'pass', `Website accessible: ${url}`, {
            url,
            status: response.status,
            contentLength: response.data.length
          });
        } else {
          return this.addResult('website_crawlable', 'warning', `Website accessible but content seems minimal: ${url}`);
        }
      } else {
        return this.addResult('website_crawlable', 'warning', `Website returned non-HTML content: ${contentType}`);
      }
    } catch (error) {
      return this.addResult('website_crawlable', 'fail', `Website crawl failed: ${error.message}`, { url });
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
        return this.addResult('knowledge_hub', 'fail', 'Knowledge Hub not initialized');
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
        return this.addResult('knowledge_hub', 'warning', 'Knowledge Hub initialized but no pages crawled', checks);
      }

      if (!checks.hasFacts) {
        return this.addResult('knowledge_hub', 'warning', `Knowledge Hub has ${checks.pagesCount} pages but no facts extracted`, checks);
      }

      return this.addResult('knowledge_hub', 'pass', 
        `Knowledge Hub populated: ${checks.pagesCount} pages, ${checks.factsCount} facts (${checks.verifiedFacts} verified)`, 
        checks
      );
    } catch (error) {
      return this.addResult('knowledge_hub', 'fail', `Knowledge Hub validation failed: ${error.message}`);
    }
  }

  /**
   * Validate brand voice profile
   */
  async validateBrandVoice() {
    try {
      const hub = new KnowledgeHub(this.clientSlug);
      const profile = await hub.getBrandVoice();
      
      const checks = {
        hasVoiceAdjectives: profile.voice?.adjectives?.length > 0,
        hasPersonality: !!profile.voice?.personality,
        hasDos: profile.voice?.do?.length > 0,
        hasDonts: profile.voice?.dont?.length > 0,
        adjectivesCount: profile.voice?.adjectives?.length || 0
      };

      if (!checks.hasVoiceAdjectives) {
        return this.addResult('brand_voice', 'warning', 'Brand voice profile missing adjectives', checks);
      }

      return this.addResult('brand_voice', 'pass', 
        `Brand voice profile ready with ${checks.adjectivesCount} adjectives`, 
        checks
      );
    } catch (error) {
      return this.addResult('brand_voice', 'fail', `Brand voice validation failed: ${error.message}`);
    }
  }

  /**
   * Validate AI extraction results
   */
  async validateAIExtraction() {
    try {
      const hub = new KnowledgeHub(this.clientSlug);
      const facts = await hub.getFacts();
      
      const aiExtracted = facts.filter(f => f.verificationStatus === 'ai-extracted');
      const verified = facts.filter(f => f.verificationStatus === 'verified');
      
      const checks = {
        totalFacts: facts.length,
        aiExtracted: aiExtracted.length,
        verified: verified.length,
        needsVerification: facts.filter(f => f.confidence < 0.9).length
      };

      if (facts.length === 0) {
        return this.addResult('ai_extraction', 'warning', 'No facts found - AI extraction may not have run', checks);
      }

      if (aiExtracted.length === 0) {
        return this.addResult('ai_extraction', 'warning', 'No AI-extracted facts found', checks);
      }

      return this.addResult('ai_extraction', 'pass', 
        `AI extraction successful: ${aiExtracted.length} facts extracted, ${verified.length} verified`, 
        checks
      );
    } catch (error) {
      return this.addResult('ai_extraction', 'fail', `AI extraction validation failed: ${error.message}`);
    }
  }

  /**
   * Validate location config
   */
  async validateLocationConfig() {
    try {
      const configPath = path.join(this.clientDir, 'location-config.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
      
      const checks = {
        hasLocationId: !!config.locationId,
        hasName: !!config.name,
        hasTimezone: !!config.timezone,
        hasContactEmail: !!config.contact?.email,
        hasContactPhone: !!config.contact?.phone,
        hasWebsite: !!config.contact?.website,
        hasAddress: !!config.address?.city && !!config.address?.state
      };

      const missing = Object.entries(checks)
        .filter(([, value]) => !value)
        .map(([key]) => key);

      if (missing.length > 0) {
        return this.addResult('location_config', 'warning', 
          `Location config missing fields: ${missing.join(', ')}`, 
          checks
        );
      }

      return this.addResult('location_config', 'pass', 'Location config complete', checks);
    } catch (error) {
      return this.addResult('location_config', 'fail', `Location config validation failed: ${error.message}`);
    }
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
        return this.addResult('api_responses', 'warning', 'No GHL API response files found - GHL extraction may not have run', checks);
      }

      if (missing.length > 0) {
        return this.addResult('api_responses', 'warning', 
          `Some API response files missing: ${missing.join(', ')}`, 
          checks
        );
      }

      return this.addResult('api_responses', 'pass', 'All expected GHL API responses found', checks);
    } catch (error) {
      return this.addResult('api_responses', 'warning', `API responses directory not found: ${error.message}`);
    }
  }

  /**
   * Run all validations
   */
  async runAllValidations(options = {}) {
    logger.info(`Running setup validation for ${this.clientSlug}`);

    // Core setup
    await this.validateClientDirectory();
    await this.validateRequiredFiles();
    await this.validateJsonSchemas();
    await this.validateLocationConfig();

    // API connections
    if (!options.skipConnections) {
      await this.validateGHLConnection(options.ghlApiKey, options.ghlLocationId);
      await this.validateAirtableConnection();
      await this.validateOpenAIConnection();
    }

    // Website
    if (!options.skipWebsite) {
      await this.validateWebsiteCrawlable(options.websiteUrl);
    }

    // Knowledge Hub
    if (!options.skipKnowledgeHub) {
      await this.validateKnowledgeHub();
      await this.validateBrandVoice();
      await this.validateAIExtraction();
    }

    // API responses
    await this.validateApiResponses();

    return this.generateReport();
  }

  /**
   * Generate validation report
   */
  generateReport() {
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    
    const report = {
      summary: {
        total: this.results.length,
        passed,
        failed,
        warnings,
        isValid: failed === 0
      },
      results: this.results,
      errors: this.errors,
      warnings: this.warnings,
      timestamp: new Date().toISOString()
    };

    logger.info(`Validation complete: ${passed} passed, ${failed} failed, ${warnings} warnings`);
    
    return report;
  }

  /**
   * Save validation report to file
   */
  async saveReport(outputPath = null) {
    const report = this.generateReport();
    const filePath = outputPath || path.join(this.clientDir, 'setup-validation-report.json');
    
    await fs.writeFile(filePath, JSON.stringify(report, null, 2) + '\n', 'utf8');
    logger.success(`Validation report saved: ${filePath}`);
    
    return filePath;
  }

  /**
   * Print validation summary to console
   */
  printSummary() {
    const report = this.generateReport();
    
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║         Setup Validation Report                ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    
    console.log(`Total Checks: ${report.summary.total}`);
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`⚠️  Warnings: ${report.summary.warnings}\n`);
    
    if (report.errors.length > 0) {
      console.log('Errors:');
      report.errors.forEach(e => {
        console.log(`  ❌ ${e.check}: ${e.message}`);
      });
      console.log('');
    }
    
    if (report.warnings.length > 0) {
      console.log('Warnings:');
      report.warnings.forEach(w => {
        console.log(`  ⚠️  ${w.check}: ${w.message}`);
      });
      console.log('');
    }
    
    console.log(report.summary.isValid 
      ? '✅ All critical checks passed!'
      : '❌ Some critical checks failed. Please review and fix.'
    );
    
    return report;
  }
}

export default SetupValidator;
