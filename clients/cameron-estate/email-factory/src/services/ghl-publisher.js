import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../..');

/**
 * GHL Publisher Service
 * Pushes compiled HTML emails to GoHighLevel API
 * Enhanced with batch publishing, validation, and rollback support
 */

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';

/**
 * GHL API Client
 */
class GHLClient {
  constructor(apiKey, locationId) {
    this.apiKey = apiKey;
    this.locationId = locationId;
    this.headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28'
    };
    this.rateLimitDelay = 250; // 4 requests per second
  }

  async request(method, endpoint, data = null) {
    const url = `${GHL_BASE_URL}${endpoint}`;
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
    
    try {
      const config = {
        method,
        url,
        headers: this.headers
      };
      
      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`GHL API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Create an email template
   * POST /emails/builder
   * 
   * GHL API Note:
   * - Creates a new template with custom HTML
   * - Returns the template ID in the response
   */
  async createEmailTemplate(templateData) {
    const payload = {
      locationId: this.locationId,
      name: templateData.name,
      type: 'html',
      builderVersion: '1',
      subject: templateData.subject,
      metaDescription: templateData.previewText || '',
      body: templateData.html,
      html: templateData.html
    };

    const result = await this.request('POST', '/emails/builder', payload);
    // V1 builder returns redirect as the ID
    const id = result.id || result.redirect;
    return { id, ...result };
  }

  /**
   * Delete an email template
   * @param {string} templateId 
   */
  async deleteEmailTemplate(templateId) {
    // DELETE https://services.leadconnectorhq.com/emails/builder/:locationId/:templateId
    return await this.request('DELETE', `/emails/builder/${this.locationId}/${templateId}`);
  }

  /**
   * Update an existing email template
   * PUT /emails/builder/{templateId}
   */
  async updateEmailTemplate(templateId, templateData) {
    const payload = {
      locationId: this.locationId,
      name: templateData.name,
      type: 'html',
      subject: templateData.subject,
      metaDescription: templateData.previewText || '',
      body: templateData.html,
      html: templateData.html
    };

    return await this.request('PUT', `/emails/builder/${templateId}`, payload);
  }

  /**
   * Get all email templates
   * GET /emails/builder
   */
  async getEmailTemplates() {
    const response = await this.request('GET', `/emails/builder?locationId=${this.locationId}&limit=100`);
    return response.builders || [];
  }

  /**
   * Get a single email template
   * GET /emails/builder/{id}
   */
  async getEmailTemplate(id) {
    return await this.request('GET', `/emails/builder/${id}?locationId=${this.locationId}`);
  }

  /**
   * Get templates from the locations endpoint (Marketing > Templates)
   * GET /locations/{locationId}/templates
   */
  async getLocationTemplates(type) {
    // originId is required and seems to be the locationId for sub-accounts
    const query = `type=${type}&originId=${this.locationId}&limit=100`;
    const response = await this.request('GET', `/locations/${this.locationId}/templates?${query}`);
    return response.templates || [];
  }

  /**
   * Get SMS templates
   * GET /locations/{locationId}/templates?type=sms
   */
  async getSmsTemplates() {
    return this.getLocationTemplates('sms');
  }

  /**
   * Create an SMS template
   * POST /locations/{locationId}/templates
   */
  async createSmsTemplate(templateData) {
    const payload = {
      type: 'sms',
      name: templateData.name,
      body: templateData.content,
    };
    return await this.request('POST', `/locations/${this.locationId}/templates`, payload);
  }

  /**
   * Update an SMS template
   * PUT /locations/{locationId}/templates/{templateId}
   */
  async updateSmsTemplate(templateId, templateData) {
    const payload = {
      type: 'sms',
      name: templateData.name,
      body: templateData.content,
    };
    return await this.request('PUT', `/locations/${this.locationId}/templates/${templateId}`, payload);
  }



  /**
   * Get trigger links
   * GET /links
   */
  async getLinks() {
    const response = await this.request('GET', `/links?locationId=${this.locationId}`);
    return response.links || [];
  }

  /**
   * Create a trigger link
   * POST /links
   */
  async createLink(linkData) {
    return await this.request('POST', '/links', {
      locationId: this.locationId,
      ...linkData
    });
  }
}

/**
 * Validation result
 */
class ValidationResult {
  constructor() {
    this.isValid = true;
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  addError(message, touchpointId = null) {
    this.isValid = false;
    this.errors.push({ message, touchpointId, type: 'error' });
  }

  addWarning(message, touchpointId = null) {
    this.warnings.push({ message, touchpointId, type: 'warning' });
  }

  addInfo(message, touchpointId = null) {
    this.info.push({ message, touchpointId, type: 'info' });
  }

  merge(other) {
    this.errors.push(...other.errors);
    this.warnings.push(...other.warnings);
    this.info.push(...other.info);
    this.isValid = this.isValid && other.isValid;
    return this;
  }
}

/**
 * Deployment status tracker
 */
class DeploymentTracker {
  constructor(clientDir) {
    this.clientDir = clientDir;
    this.deploymentsDir = path.join(clientDir, 'deployments');
    this.ensureDirectory();
  }

  ensureDirectory() {
    if (!fs.existsSync(this.deploymentsDir)) {
      fs.mkdirSync(this.deploymentsDir, { recursive: true });
    }
  }

  getDeploymentFile(deploymentId) {
    return path.join(this.deploymentsDir, `${deploymentId}.json`);
  }

  createDeployment(journeyId, touchpoints) {
    const deploymentId = `deploy-${Date.now()}`;
    const deployment = {
      id: deploymentId,
      journeyId,
      status: 'in_progress',
      createdAt: new Date().toISOString(),
      completedAt: null,
      touchpoints: touchpoints.map(tp => ({
        id: tp.id,
        name: tp.name,
        type: tp.type || 'Email',
        status: 'pending',
        ghlTemplateId: null,
        error: null
      })),
      previousVersion: null,
      rollbackData: null
    };

    this.saveDeployment(deployment);
    return deployment;
  }

  saveDeployment(deployment) {
    const filePath = this.getDeploymentFile(deployment.id);
    fs.writeFileSync(filePath, JSON.stringify(deployment, null, 2));
  }

  loadDeployment(deploymentId) {
    const filePath = this.getDeploymentFile(deploymentId);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  updateTouchpointStatus(deploymentId, touchpointId, status, data = {}) {
    const deployment = this.loadDeployment(deploymentId);
    if (!deployment) return null;

    const tp = deployment.touchpoints.find(t => t.id === touchpointId);
    if (tp) {
      tp.status = status;
      Object.assign(tp, data);
    }

    // Check if all touchpoints are complete
    const allComplete = deployment.touchpoints.every(t => 
      t.status === 'published' || t.status === 'failed'
    );

    if (allComplete) {
      deployment.status = deployment.touchpoints.some(t => t.status === 'failed') 
        ? 'partial' 
        : 'completed';
      deployment.completedAt = new Date().toISOString();
    }

    this.saveDeployment(deployment);
    return deployment;
  }

  listDeployments(journeyId = null) {
    if (!fs.existsSync(this.deploymentsDir)) return [];

    const files = fs.readdirSync(this.deploymentsDir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const deployment = JSON.parse(
          fs.readFileSync(path.join(this.deploymentsDir, f), 'utf8')
        );
        return deployment;
      });

    if (journeyId) {
      return files.filter(d => d.journeyId === journeyId);
    }

    return files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

/**
 * Publisher class that uses GHLClient
 * Enhanced with batch publishing, validation, and rollback support
 */
class GHLPublisher {
  constructor(clientSlug = 'cameron-estate') {
    this.client = null;
    this.isConnected = false;
    this.clientSlug = clientSlug;
    this.clientDir = path.join(repoRoot, 'clients', clientSlug);
    this.tracker = new DeploymentTracker(this.clientDir);
    this.validationRules = [];
  }

  /**
   * Initialize the publisher with credentials
   */
  connect(apiKey, locationId) {
    this.client = new GHLClient(apiKey, locationId);
    this.isConnected = true;
    return this;
  }

  /**
   * Add a custom validation rule
   * @param {Function} rule - Validation function(touchpoint) => ValidationResult
   */
  addValidationRule(rule) {
    this.validationRules.push(rule);
  }

  /**
   * Validate a single touchpoint before publishing
   * @param {Object} touchpoint - Touchpoint data
   * @returns {ValidationResult} Validation result
   */
  validateTouchpoint(touchpoint) {
    const result = new ValidationResult();
    const content = touchpoint.content || {};

    // Check required fields based on type
    if (touchpoint.type === 'Email' || !touchpoint.type) {
      if (!content.subject || content.subject.trim().length === 0) {
        result.addError('Email subject is required', touchpoint.id);
      }
      if (!content.body || content.body.trim().length === 0) {
        result.addError('Email body is required', touchpoint.id);
      }

      // Check for common issues
      if (content.subject && content.subject.length > 150) {
        result.addWarning('Subject is very long (>150 chars)', touchpoint.id);
      }

      // Check for broken links
      if (content.body) {
        const linkMatches = content.body.match(/href=["']([^"']+)["']/g) || [];
        linkMatches.forEach(link => {
          const url = link.match(/href=["']([^"']+)["']/)?.[1];
          if (url && (url.includes('example.com') || url.includes('placeholder'))) {
            result.addWarning(`Possible placeholder link: ${url}`, touchpoint.id);
          }
        });
      }

      // Check for spam triggers
      const spamWords = ['FREE!!!', 'act now', 'limited time', 'click here'];
      const bodyLower = (content.body || '').toLowerCase();
      spamWords.forEach(word => {
        if (bodyLower.includes(word.toLowerCase())) {
          result.addWarning(`Possible spam trigger word: "${word}"`, touchpoint.id);
        }
      });
    }

    if (touchpoint.type === 'SMS') {
      const message = content.body || content.message || '';
      if (!message || message.trim().length === 0) {
        result.addError('SMS message is required', touchpoint.id);
      }
      if (message.length > 1600) {
        result.addError('SMS exceeds maximum length (1600 chars)', touchpoint.id);
      } else if (message.length > 320) {
        result.addWarning('SMS will be split into multiple messages (>320 chars)', touchpoint.id);
      }

      // Check for required opt-out
      if (!message.toLowerCase().includes('stop') && !message.toLowerCase().includes('opt-out')) {
        result.addWarning('SMS should include opt-out instructions', touchpoint.id);
      }
    }

    // Run custom validation rules
    this.validationRules.forEach(rule => {
      const ruleResult = rule(touchpoint);
      if (ruleResult) {
        result.merge(ruleResult);
      }
    });

    return result;
  }

  /**
   * Validate all touchpoints in a journey
   * @param {Array} touchpoints - Array of touchpoints
   * @returns {ValidationResult} Combined validation result
   */
  validateJourney(touchpoints) {
    const combinedResult = new ValidationResult();

    touchpoints.forEach(touchpoint => {
      const result = this.validateTouchpoint(touchpoint);
      combinedResult.merge(result);
    });

    combinedResult.addInfo(`Validated ${touchpoints.length} touchpoints`);
    return combinedResult;
  }

  /**
   * Save previous version for rollback capability
   * @param {string} deploymentId - Deployment ID
   * @param {Array} touchpoints - Current touchpoints
   */
  async savePreviousVersion(deploymentId, touchpoints) {
    const deployment = this.tracker.loadDeployment(deploymentId);
    if (!deployment) return;

    // Fetch current GHL templates to save as rollback data
    const rollbackData = [];
    
    for (const tp of touchpoints) {
      try {
        // Check if template exists in GHL
        const templates = await this.client.getEmailTemplates();
        const existing = templates.find(t => t.name === tp.name);
        
        if (existing) {
          const fullTemplate = await this.client.getEmailTemplate(existing.id);
          rollbackData.push({
            touchpointId: tp.id,
            ghlTemplateId: existing.id,
            templateData: {
              name: fullTemplate.name,
              subject: fullTemplate.subject,
              body: fullTemplate.html || fullTemplate.body,
              previewText: fullTemplate.metaDescription || ''
            }
          });
        }
      } catch (error) {
        console.warn(`Could not fetch previous version for ${tp.name}:`, error.message);
      }
    }

    deployment.previousVersion = rollbackData;
    this.tracker.saveDeployment(deployment);
    return rollbackData;
  }

  /**
   * Push a compiled email to GHL
   * @param {object} emailData - Email data to push
   * @param {string} emailData.id - Template ID (if updating)
   * @param {string} emailData.name - Template name
   * @param {string} emailData.subject - Email subject line
   * @param {string} emailData.previewText - Preview text (shown in inbox)
   * @param {string} emailData.html - Compiled HTML
   * @returns {object} - Result
   * 
   * Note: FROM field is controlled at the Location level in GHL.
   * To change the sender, update your GHL Location settings.
   */
  async pushEmail(emailData) {
    if (!this.isConnected) {
      throw new Error('Publisher not connected. Call connect() first.');
    }

    const { id, name, subject, previewText, html } = emailData;

    try {
      let templateId = id;

      // If no ID provided, try to find existing template by name
      if (!templateId) {
        const templates = await this.client.getEmailTemplates();
        const existing = templates.find(t => t.name === name);
        if (existing) {
          templateId = existing.id;
        }
      }

      if (templateId) {
        // Update existing template
        const result = await this.client.updateEmailTemplate(templateId, {
          name,
          subject,
          previewText,
          html
        });
        return { success: true, action: 'updated', templateId: result.id || templateId };
      } else {
        // Create new template
        const result = await this.client.createEmailTemplate({
          name,
          subject,
          previewText,
          html
        });
        return { success: true, action: 'created', templateId: result.id };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Push an SMS template to GHL
   * @param {object} smsData - SMS data to push
   * @param {string} smsData.id - Template ID (if updating, though usually we match by name for SMS)
   * @param {string} smsData.name - Template name
   * @param {string} smsData.content - SMS content
   * @returns {object} - Result
   */
  async pushSms(smsData) {
    if (!this.isConnected) {
      throw new Error('Publisher not connected. Call connect() first.');
    }

    const { id, name, content } = smsData;

    try {
      // For SMS, we might need to find by name first if no ID is provided
      // or if we want to ensure idempotency.
      // But for now, let's assume we pass ID if we have it (from a previous sync?)
      // Actually, SMS templates in GHL might not have stable IDs we track locally easily
      // unless we store them.
      
      // Strategy: Check if template exists by name, then update or create.
      // Fetch all SMS templates to find match
      const templates = await this.client.getSmsTemplates();
      const existing = templates.find(t => t.name === name);

      if (existing) {
        // Update
        const result = await this.client.updateSmsTemplate(existing.id, {
          name,
          content
        });
        return { success: true, action: 'updated', templateId: result.id };
      } else {
        // Create
        const result = await this.client.createSmsTemplate({
          name,
          content
        });
        return { success: true, action: 'created', templateId: result.id };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Push multiple emails
   * @param {array} emails - Array of email data
   * @returns {object} - Summary of results
   */
  async pushEmails(emails) {
    const results = {
      total: emails.length,
      successful: 0,
      failed: 0,
      templates: []
    };

    for (const email of emails) {
      const result = await this.pushEmail(email);
      if (result.success) {
        results.successful++;
        results.templates.push({ name: email.name, ...result });
      } else {
        results.failed++;
        results.templates.push({ name: email.name, error: result.error });
      }
    }

    return results;
  }

  /**
   * Get a single email template
   * @param {string} id 
   */
  async getEmailTemplate(id) {
    if (!this.isConnected) {
        throw new Error('Publisher not connected. Call connect() first.');
    }
    return await this.client.getEmailTemplate(id);
  }

  /**
   * Get location templates (Marketing)
   * @param {string} type - 'email' or 'sms'
   */
  async getLocationTemplates(type) {
    if (!this.isConnected) {
        throw new Error('Publisher not connected. Call connect() first.');
    }
    return await this.client.getLocationTemplates(type);
  }

  /**
   * Sync links from GHL
   * @returns {object} - Link map
   */
  async syncLinks() {
    if (!this.isConnected) {
      throw new Error('Publisher not connected. Call connect() first.');
    }

    const links = await this.client.getLinks();
    const linkMap = {};

    for (const link of links) {
      linkMap[link.name] = link.id;
    }

    return linkMap;
  }

  /**
   * Get all email templates
   */
  async getEmailTemplates() {
    if (!this.isConnected) {
      throw new Error('Publisher not connected. Call connect() first.');
    }
    return await this.client.getEmailTemplates();
  }

  /**
   * Delete an email template
   */
  async deleteEmailTemplate(templateId) {
    if (!this.isConnected) {
      throw new Error('Publisher not connected. Call connect() first.');
    }
    return await this.client.deleteEmailTemplate(templateId);
  }

  /**
   * Batch publish entire journey
   * @param {string} journeyId - Journey ID
   * @param {Array} touchpoints - Array of touchpoints to publish
   * @param {Object} options - Publishing options
   * @returns {Object} Deployment result
   */
  async batchPublishJourney(journeyId, touchpoints, options = {}) {
    if (!this.isConnected) {
      throw new Error('Publisher not connected. Call connect() first.');
    }

    const { 
      skipValidation = false, 
      dryRun = false,
      onProgress = null 
    } = options;

    // Create deployment tracker
    const deployment = this.tracker.createDeployment(journeyId, touchpoints);

    // Validate before publishing
    if (!skipValidation) {
      const validation = this.validateJourney(touchpoints);
      if (!validation.isValid) {
        deployment.status = 'failed';
        deployment.error = 'Validation failed';
        deployment.validationErrors = validation.errors;
        this.tracker.saveDeployment(deployment);
        return {
          success: false,
          deploymentId: deployment.id,
          validation,
          message: 'Validation failed. Fix errors before publishing.'
        };
      }
    }

    // Save previous versions for rollback
    if (!dryRun) {
      await this.savePreviousVersion(deployment.id, touchpoints);
    }

    const results = {
      deploymentId: deployment.id,
      total: touchpoints.length,
      published: 0,
      failed: 0,
      skipped: 0,
      touchpoints: []
    };

    // Publish each touchpoint
    for (let i = 0; i < touchpoints.length; i++) {
      const touchpoint = touchpoints[i];
      
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: touchpoints.length,
          touchpoint: touchpoint.name,
          status: 'publishing'
        });
      }

      if (dryRun) {
        results.skipped++;
        this.tracker.updateTouchpointStatus(deployment.id, touchpoint.id, 'skipped');
        results.touchpoints.push({
          id: touchpoint.id,
          name: touchpoint.name,
          status: 'skipped',
          message: 'Dry run - no changes made'
        });
        continue;
      }

      try {
        let publishResult;

        if (touchpoint.type === 'SMS' || touchpoint.type === 'sms') {
          publishResult = await this.pushSms({
            id: touchpoint.ghlTemplateId,
            name: touchpoint.name,
            content: touchpoint.content?.body || touchpoint.content?.message || ''
          });
        } else {
          // Default to email
          publishResult = await this.pushEmail({
            id: touchpoint.ghlTemplateId,
            name: touchpoint.name,
            subject: touchpoint.content?.subject || '',
            previewText: touchpoint.content?.previewText || '',
            html: touchpoint.content?.html || touchpoint.content?.body || ''
          });
        }

        if (publishResult.success) {
          results.published++;
          this.tracker.updateTouchpointStatus(deployment.id, touchpoint.id, 'published', {
            ghlTemplateId: publishResult.templateId,
            action: publishResult.action
          });
          results.touchpoints.push({
            id: touchpoint.id,
            name: touchpoint.name,
            status: 'published',
            ghlTemplateId: publishResult.templateId,
            action: publishResult.action
          });
        } else {
          results.failed++;
          this.tracker.updateTouchpointStatus(deployment.id, touchpoint.id, 'failed', {
            error: publishResult.error
          });
          results.touchpoints.push({
            id: touchpoint.id,
            name: touchpoint.name,
            status: 'failed',
            error: publishResult.error
          });
        }
      } catch (error) {
        results.failed++;
        this.tracker.updateTouchpointStatus(deployment.id, touchpoint.id, 'failed', {
          error: error.message
        });
        results.touchpoints.push({
          id: touchpoint.id,
          name: touchpoint.name,
          status: 'failed',
          error: error.message
        });
      }

      if (onProgress) {
        onProgress({
          current: i + 1,
          total: touchpoints.length,
          touchpoint: touchpoint.name,
          status: results.touchpoints[i].status
        });
      }
    }

    // Update final deployment status
    const finalDeployment = this.tracker.loadDeployment(deployment.id);
    finalDeployment.summary = results;
    this.tracker.saveDeployment(finalDeployment);

    return {
      success: results.failed === 0,
      deploymentId: deployment.id,
      dryRun,
      ...results
    };
  }

  /**
   * Get publish status for a deployment
   * @param {string} deploymentId - Deployment ID
   * @returns {Object} Deployment status
   */
  async getPublishStatus(deploymentId) {
    return this.tracker.loadDeployment(deploymentId);
  }

  /**
   * List all deployments for a journey
   * @param {string} journeyId - Journey ID
   * @returns {Array} Array of deployments
   */
  async listDeployments(journeyId = null) {
    return this.tracker.listDeployments(journeyId);
  }

  /**
   * Rollback a deployment
   * @param {string} deploymentId - Deployment ID to rollback
   * @returns {Object} Rollback result
   */
  async rollbackDeployment(deploymentId) {
    if (!this.isConnected) {
      throw new Error('Publisher not connected. Call connect() first.');
    }

    const deployment = this.tracker.loadDeployment(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment not found: ${deploymentId}`);
    }

    if (!deployment.previousVersion || deployment.previousVersion.length === 0) {
      throw new Error('No previous version available for rollback');
    }

    const results = {
      deploymentId,
      total: deployment.previousVersion.length,
      restored: 0,
      failed: 0,
      touchpoints: []
    };

    for (const rollbackItem of deployment.previousVersion) {
      try {
        if (rollbackItem.ghlTemplateId) {
          // Restore previous version
          await this.client.updateEmailTemplate(
            rollbackItem.ghlTemplateId,
            rollbackItem.templateData
          );
          results.restored++;
          results.touchpoints.push({
            touchpointId: rollbackItem.touchpointId,
            ghlTemplateId: rollbackItem.ghlTemplateId,
            status: 'restored'
          });
        }
      } catch (error) {
        results.failed++;
        results.touchpoints.push({
          touchpointId: rollbackItem.touchpointId,
          ghlTemplateId: rollbackItem.ghlTemplateId,
          status: 'failed',
          error: error.message
        });
      }
    }

    // Update deployment status
    deployment.status = 'rolled_back';
    deployment.rolledBackAt = new Date().toISOString();
    deployment.rollbackResults = results;
    this.tracker.saveDeployment(deployment);

    return {
      success: results.failed === 0,
      ...results
    };
  }

  /**
   * Get deployment report
   * @param {string} deploymentId - Deployment ID
   * @returns {Object} Detailed report
   */
  async getDeploymentReport(deploymentId) {
    const deployment = this.tracker.loadDeployment(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment not found: ${deploymentId}`);
    }

    return {
      id: deployment.id,
      journeyId: deployment.journeyId,
      status: deployment.status,
      createdAt: deployment.createdAt,
      completedAt: deployment.completedAt,
      duration: deployment.completedAt 
        ? new Date(deployment.completedAt) - new Date(deployment.createdAt)
        : null,
      touchpoints: deployment.touchpoints.map(tp => ({
        name: tp.name,
        type: tp.type,
        status: tp.status,
        ghlTemplateId: tp.ghlTemplateId,
        error: tp.error
      })),
      summary: {
        total: deployment.touchpoints.length,
        published: deployment.touchpoints.filter(t => t.status === 'published').length,
        failed: deployment.touchpoints.filter(t => t.status === 'failed').length,
        pending: deployment.touchpoints.filter(t => t.status === 'pending').length
      }
    };
  }

  /**
   * Validate links in content
   * @param {string} content - HTML content
   * @returns {Array} Array of link validation results
   */
  async validateLinks(content) {
    const linkMatches = content.match(/href=["']([^"']+)["']/g) || [];
    const results = [];

    for (const link of linkMatches) {
      const url = link.match(/href=["']([^"']+)["']/)?.[1];
      if (!url) continue;

      // Skip non-HTTP links
      if (!url.startsWith('http')) {
        results.push({ url, valid: true, type: 'internal' });
        continue;
      }

      try {
        // Check if URL is reachable
        const response = await axios.head(url, { 
          timeout: 5000,
          validateStatus: () => true // Don't throw on non-2xx
        });
        
        results.push({
          url,
          valid: response.status >= 200 && response.status < 400,
          status: response.status,
          type: 'external'
        });
      } catch (error) {
        results.push({
          url,
          valid: false,
          error: error.message,
          type: 'external'
        });
      }
    }

    return results;
  }

// Export instances
export const ghlPublisher = new GHLPublisher();
export default ghlPublisher;
