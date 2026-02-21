/**
 * Deployment Pipeline Service
 * Orchestrates full deployment from approval to GHL push
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { KnowledgeHub } from './knowledge-hub.js';
import { CommentSystem } from './comment-system.js';
import { compareJourneys } from '../utils/version-compare.js';
import airtableService from './airtable.js';
import ghlService from './ghl.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

/**
 * Deployment Pipeline
 * Manages the full deployment lifecycle
 */
export class DeployPipeline {
  constructor(clientSlug) {
    this.clientSlug = clientSlug;
    this.clientDir = path.join(repoRoot, 'clients', clientSlug);
    this.pipelineDir = path.join(this.clientDir, 'deployments');
    this.knowledgeHub = new KnowledgeHub(clientSlug);
    this.commentSystem = new CommentSystem(clientSlug);
    
    // Deployment state
    this.currentDeployment = null;
    this.steps = [];
  }

  /**
   * Initialize pipeline directories
   */
  async initialize() {
    await fs.mkdir(this.pipelineDir, { recursive: true });
    await this.knowledgeHub.initialize();
    await this.commentSystem.initialize();
    logger.info(`Deployment pipeline initialized for ${this.clientSlug}`);
  }

  /**
   * Check if pipeline is initialized
   */
  async isInitialized() {
    try {
      await fs.access(this.pipelineDir);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Start a new deployment
   * @param {Object} journey - Journey to deploy
   * @param {Object} options - Deployment options
   * @returns {Object} Deployment record
   */
  async startDeployment(journey, options = {}) {
    const deploymentId = `deploy-${uuidv4().split('-')[0]}`;
    
    this.currentDeployment = {
      id: deploymentId,
      clientSlug: this.clientSlug,
      journeyId: journey.id,
      journeyName: journey.name,
      status: 'preparing',
      startedAt: new Date().toISOString(),
      completedAt: null,
      steps: [],
      results: {},
      options: {
        dryRun: options.dryRun || false,
        skipValidation: options.skipValidation || false,
        skipApprovalCheck: options.skipApprovalCheck || false,
        ...options
      }
    };

    await this.saveDeployment();
    logger.info(`Started deployment ${deploymentId} for journey ${journey.id}`);
    
    return this.currentDeployment;
  }

  /**
   * Execute full deployment pipeline
   * @param {Object} journey - Journey data
   * @param {Array} touchpoints - Touchpoints to deploy
   * @returns {Object} Deployment result
   */
  async execute(journey, touchpoints) {
    await this.startDeployment(journey);

    try {
      // Step 1: Validate approval status
      if (!this.currentDeployment.options.skipApprovalCheck) {
        await this.runStep('approval-check', () => this.validateApprovalStatus(journey));
      }

      // Step 2: Verify facts
      if (!this.currentDeployment.options.skipValidation) {
        await this.runStep('fact-verification', () => this.verifyFacts(touchpoints));
      }

      // Step 3: Pre-deploy validation
      if (!this.currentDeployment.options.skipValidation) {
        await this.runStep('validation', () => this.runPreDeployValidation(touchpoints));
      }

      // Step 4: Build email templates (if using Email Factory)
      await this.runStep('build', () => this.buildTemplates(touchpoints));

      // Step 5: Deploy to GHL
      await this.runStep('deploy', () => this.deployToGHL(journey, touchpoints));

      // Step 6: Update Airtable
      await this.runStep('sync-airtable', () => this.updateAirtable(journey));

      // Step 7: Generate report
      await this.runStep('report', () => this.generateReport());

      // Mark as complete
      this.currentDeployment.status = 'completed';
      this.currentDeployment.completedAt = new Date().toISOString();
      await this.saveDeployment();

      logger.success(`Deployment ${this.currentDeployment.id} completed successfully`);
      
      return {
        success: true,
        deployment: this.currentDeployment,
        message: 'Deployment completed successfully'
      };

    } catch (error) {
      this.currentDeployment.status = 'failed';
      this.currentDeployment.error = error.message;
      this.currentDeployment.completedAt = new Date().toISOString();
      await this.saveDeployment();

      logger.error(`Deployment ${this.currentDeployment.id} failed`, { error: error.message });
      
      return {
        success: false,
        deployment: this.currentDeployment,
        error: error.message,
        step: this.currentDeployment.steps[this.currentDeployment.steps.length - 1]
      };
    }
  }

  /**
   * Run a pipeline step with error handling
   */
  async runStep(stepName, stepFn) {
    const step = {
      name: stepName,
      status: 'running',
      startedAt: new Date().toISOString(),
      completedAt: null,
      error: null
    };

    this.currentDeployment.steps.push(step);
    this.currentDeployment.status = stepName;
    await this.saveDeployment();

    logger.info(`Running deployment step: ${stepName}`);

    try {
      const result = await stepFn();
      step.status = 'completed';
      step.completedAt = new Date().toISOString();
      step.result = result;
      logger.success(`Step ${stepName} completed`);
    } catch (error) {
      step.status = 'failed';
      step.completedAt = new Date().toISOString();
      step.error = error.message;
      logger.error(`Step ${stepName} failed`, { error: error.message });
      throw error;
    }

    await this.saveDeployment();
  }

  /**
   * Validate that journey has been approved
   */
  async validateApprovalStatus(journey) {
    // Check journey status
    const approvedStatuses = ['Approved', 'Published'];
    
    if (!approvedStatuses.includes(journey.status)) {
      throw new Error(`Journey must be approved before deployment. Current status: ${journey.status}`);
    }

    // Check for unresolved comments
    const comments = await this.commentSystem.getCommentsForJourney(journey.id, {
      status: 'open'
    });

    if (comments.length > 0) {
      throw new Error(`Cannot deploy with ${comments.length} unresolved comments`);
    }

    return { approved: true, openComments: comments.length };
  }

  /**
   * Verify facts used in touchpoints
   */
  async verifyFacts(touchpoints) {
    const results = {
      verified: [],
      unverified: [],
      missing: []
    };

    // Get all facts from knowledge hub
    const facts = await this.knowledgeHub.getFacts();
    const verifiedFacts = facts.filter(f => f.verificationStatus === 'verified');

    for (const touchpoint of touchpoints) {
      const content = touchpoint.content || {};
      const text = `${content.subject || ''} ${content.body || ''}`;

      // Check for fact references in content
      for (const fact of facts) {
        if (text.toLowerCase().includes(fact.statement.toLowerCase().substring(0, 50))) {
          if (fact.verificationStatus === 'verified') {
            results.verified.push({ touchpoint: touchpoint.id, fact: fact.id });
          } else {
            results.unverified.push({ 
              touchpoint: touchpoint.id, 
              fact: fact.id,
              statement: fact.statement 
            });
          }
        }
      }
    }

    // Warn about unverified facts but don't fail
    if (results.unverified.length > 0) {
      logger.warn(`Found ${results.unverified.length} unverified facts`, results.unverified);
    }

    return results;
  }

  /**
   * Run pre-deployment validation
   */
  async runPreDeployValidation(touchpoints) {
    const errors = [];
    const warnings = [];

    for (const touchpoint of touchpoints) {
      const content = touchpoint.content || {};

      // Validate required fields
      if (touchpoint.type === 'Email' || !touchpoint.type) {
        if (!content.subject || content.subject.trim().length === 0) {
          errors.push({ touchpoint: touchpoint.id, field: 'subject', message: 'Subject is required' });
        }
        if (!content.body || content.body.trim().length === 0) {
          errors.push({ touchpoint: touchpoint.id, field: 'body', message: 'Body is required' });
        }

        // Check for broken links
        if (content.body) {
          const links = content.body.match(/href=["']([^"']+)["']/g) || [];
          for (const link of links) {
            const url = link.match(/href=["']([^"']+)["']/)?.[1];
            if (url && (url.includes('example.com') || url.includes('placeholder') || url.includes('undefined'))) {
              errors.push({ 
                touchpoint: touchpoint.id, 
                field: 'body', 
                message: `Invalid link found: ${url}` 
              });
            }
          }
        }
      }

      if (touchpoint.type === 'SMS') {
        const message = content.body || content.message || '';
        if (!message || message.trim().length === 0) {
          errors.push({ touchpoint: touchpoint.id, field: 'message', message: 'SMS message is required' });
        }
        if (message.length > 1600) {
          errors.push({ touchpoint: touchpoint.id, field: 'message', message: 'SMS exceeds 1600 characters' });
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.length} errors found. ${errors.map(e => `${e.touchpoint}: ${e.message}`).join(', ')}`);
    }

    return { 
      valid: true, 
      touchpointsChecked: touchpoints.length,
      errors: errors.length,
      warnings: warnings.length
    };
  }

  /**
   * Build templates using Email Factory
   */
  async buildTemplates(touchpoints) {
    const emailFactoryPath = path.join(this.clientDir, 'email-factory');
    
    // Check if Email Factory exists for this client
    try {
      await fs.access(emailFactoryPath);
    } catch {
      logger.info('Email Factory not configured for this client, skipping build');
      return { built: 0, skipped: touchpoints.length };
    }

    // Build each email template
    const results = [];
    for (const touchpoint of touchpoints) {
      if (touchpoint.type === 'Email' || !touchpoint.type) {
        // Email Factory build would happen here
        // This is a placeholder for the actual build process
        results.push({
          touchpoint: touchpoint.id,
          status: 'built'
        });
      }
    }

    return { built: results.length, results };
  }

  /**
   * Deploy to GHL
   */
  async deployToGHL(journey, touchpoints) {
    // Import the enhanced GHL publisher
    const { ghlPublisher } = await import(
      path.join(this.clientDir, 'email-factory/src/services/ghl-publisher.js')
    );

    // Connect to GHL
    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;
    
    if (!apiKey || !locationId) {
      throw new Error('GHL credentials not configured');
    }

    ghlPublisher.connect(apiKey, locationId);

    // Run batch publish
    const result = await ghlPublisher.batchPublishJourney(journey.id, touchpoints, {
      dryRun: this.currentDeployment.options.dryRun,
      skipValidation: true, // Already validated
      onProgress: (progress) => {
        logger.info(`Publishing progress: ${progress.current}/${progress.total} - ${progress.touchpoint}`);
      }
    });

    // Store deployment reference
    this.currentDeployment.ghlDeploymentId = result.deploymentId;

    return result;
  }

  /**
   * Update Airtable with deployment status
   */
  async updateAirtable(journey) {
    await airtableService.connect();

    // Update journey status to Published
    await airtableService.updateJourneySyncStatus(journey.id, 'Deployed', {
      'Status': 'Published',
      'Published At': new Date().toISOString()
    });

    // Create sync history record
    await airtableService.createSyncHistoryRecord(journey.id, {
      status: 'Success',
      type: 'deployment',
      ghlWorkflowId: this.currentDeployment.ghlDeploymentId,
      duration: Date.now() - new Date(this.currentDeployment.startedAt).getTime()
    });

    return { synced: true };
  }

  /**
   * Generate deployment report
   */
  async generateReport() {
    const report = {
      deployment: this.currentDeployment,
      summary: {
        stepsCompleted: this.currentDeployment.steps.filter(s => s.status === 'completed').length,
        stepsFailed: this.currentDeployment.steps.filter(s => s.status === 'failed').length,
        duration: Date.now() - new Date(this.currentDeployment.startedAt).getTime()
      },
      timestamp: new Date().toISOString()
    };

    // Save report to file
    const reportPath = path.join(this.pipelineDir, `${this.currentDeployment.id}-report.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  /**
   * Rollback a deployment
   * @param {string} deploymentId - Deployment ID to rollback
   */
  async rollback(deploymentId) {
    const deployment = await this.loadDeployment(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment not found: ${deploymentId}`);
    }

    // Import GHL publisher
    const { ghlPublisher } = await import(
      path.join(this.clientDir, 'email-factory/src/services/ghl-publisher.js')
    );

    ghlPublisher.connect(process.env.GHL_API_KEY, process.env.GHL_LOCATION_ID);

    // Execute rollback
    const result = await ghlPublisher.rollbackDeployment(deployment.ghlDeploymentId);

    // Update deployment status
    deployment.status = 'rolled_back';
    deployment.rolledBackAt = new Date().toISOString();
    await this.saveDeploymentRecord(deployment);

    return result;
  }

  /**
   * Get deployment history
   */
  async getDeploymentHistory(journeyId = null) {
    const files = await fs.readdir(this.pipelineDir);
    const deployments = [];

    for (const file of files) {
      if (file.endsWith('.json') && !file.includes('-report')) {
        const content = await fs.readFile(path.join(this.pipelineDir, file), 'utf8');
        const deployment = JSON.parse(content);
        
        if (!journeyId || deployment.journeyId === journeyId) {
          deployments.push(deployment);
        }
      }
    }

    return deployments.sort((a, b) => 
      new Date(b.startedAt) - new Date(a.startedAt)
    );
  }

  /**
   * Get deployment by ID
   */
  async getDeployment(deploymentId) {
    return this.loadDeployment(deploymentId);
  }

  // ==================== PRIVATE METHODS ====================

  async saveDeployment() {
    if (!this.currentDeployment) return;
    
    const filePath = path.join(this.pipelineDir, `${this.currentDeployment.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(this.currentDeployment, null, 2));
  }

  async loadDeployment(deploymentId) {
    const filePath = path.join(this.pipelineDir, `${deploymentId}.json`);
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async saveDeploymentRecord(deployment) {
    const filePath = path.join(this.pipelineDir, `${deployment.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(deployment, null, 2));
  }
}

/**
 * Create deployment pipeline for a client
 */
export function createDeployPipeline(clientSlug) {
  return new DeployPipeline(clientSlug);
}

export default DeployPipeline;