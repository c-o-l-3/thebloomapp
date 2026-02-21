/**
 * GHL Auto-Extraction Service
 * Automatically extracts all data from GoHighLevel for a location
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../..');

export class GHLAutoExtractionService {
  constructor(clientSlug, ghlLocationId, apiKey = null) {
    this.clientSlug = clientSlug;
    this.locationId = ghlLocationId;
    this.apiKey = apiKey || process.env.GHL_API_KEY;
    this.baseUrl = 'https://services.leadconnectorhq.com';
    this.clientDir = path.join(repoRoot, 'clients', clientSlug);
    this.apiResponsesDir = path.join(this.clientDir, 'api-responses');
    this.rateLimitDelay = 250; // 4 requests per second
    this.lastRequestTime = 0;
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28'
    };
  }

  async throttle() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

  async request(method, endpoint, data = null, retries = 0) {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      await this.throttle();
      
      const response = await axios({
        method,
        url,
        headers: this.getHeaders(),
        data
      });

      return response.data;
    } catch (error) {
      if (error.response?.status === 429 && retries < 3) {
        logger.warn('Rate limit hit, retrying', { endpoint, retry: retries + 1 });
        await new Promise(resolve => setTimeout(resolve, 5000 * (retries + 1)));
        return this.request(method, endpoint, data, retries + 1);
      }

      if (error.response?.status === 404 && method === 'GET') {
        return null;
      }

      logger.error('GHL API request failed', { 
        method, 
        endpoint, 
        error: error.message,
        status: error.response?.status 
      });
      throw error;
    }
  }

  /**
   * Initialize directories for API responses
   */
  async initializeDirectories() {
    await fs.mkdir(this.apiResponsesDir, { recursive: true });
    logger.debug(`Initialized API responses directory: ${this.apiResponsesDir}`);
  }

  /**
   * Save API response to file
   */
  async saveApiResponse(filename, data) {
    const filePath = path.join(this.apiResponsesDir, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    logger.debug(`Saved API response: ${filename}`);
    return filePath;
  }

  /**
   * Extract location details
   */
  async extractLocationDetails() {
    logger.info('Extracting location details...');
    
    try {
      const data = await this.request('GET', `/locations/${this.locationId}`);
      
      if (!data) {
        throw new Error(`Location not found: ${this.locationId}`);
      }

      await this.saveApiResponse('location-data.json', {
        extractedAt: new Date().toISOString(),
        locationId: this.locationId,
        data
      });

      logger.success(`Extracted location: ${data.name}`);
      
      return {
        success: true,
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email,
        logoUrl: data.logoUrl,
        website: data.website,
        timezone: data.timezone,
        data
      };
    } catch (error) {
      logger.error('Failed to extract location details', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract pipelines and stages
   */
  async extractPipelines() {
    logger.info('Extracting pipelines...');
    
    try {
      const data = await this.request('GET', `/locations/${this.locationId}/pipelines`);
      const pipelines = data.pipelines || [];
      
      await this.saveApiResponse('pipelines-data.json', {
        extractedAt: new Date().toISOString(),
        locationId: this.locationId,
        count: pipelines.length,
        pipelines
      });

      logger.success(`Extracted ${pipelines.length} pipelines`);
      
      return {
        success: true,
        count: pipelines.length,
        pipelines: pipelines.map(p => ({
          id: p.id,
          name: p.name,
          stages: p.stages?.map(s => ({
            id: s.id,
            name: s.name,
            position: s.position
          })) || []
        })),
        raw: pipelines
      };
    } catch (error) {
      logger.error('Failed to extract pipelines', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract email templates
   */
  async extractEmailTemplates() {
    logger.info('Extracting email templates...');
    
    try {
      const data = await this.request('GET', `/emails/builder?locationId=${this.locationId}`);
      const templates = data.emails || [];
      
      await this.saveApiResponse('email-templates-data.json', {
        extractedAt: new Date().toISOString(),
        locationId: this.locationId,
        count: templates.length,
        templates
      });

      logger.success(`Extracted ${templates.length} email templates`);
      
      return {
        success: true,
        count: templates.length,
        templates: templates.map(t => ({
          id: t.id,
          name: t.name,
          subject: t.subject,
          type: t.type
        })),
        raw: templates
      };
    } catch (error) {
      logger.error('Failed to extract email templates', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract SMS templates
   */
  async extractSMSTemplates() {
    logger.info('Extracting SMS templates...');
    
    try {
      const data = await this.request('GET', `/locations/${this.locationId}/templates`);
      const allTemplates = data.templates || [];
      const smsTemplates = allTemplates.filter(t => t.type === 'sms' || t.templateType === 'sms');
      
      await this.saveApiResponse('sms-templates-data.json', {
        extractedAt: new Date().toISOString(),
        locationId: this.locationId,
        count: smsTemplates.length,
        templates: smsTemplates
      });

      logger.success(`Extracted ${smsTemplates.length} SMS templates`);
      
      return {
        success: true,
        count: smsTemplates.length,
        templates: smsTemplates.map(t => ({
          id: t.id,
          name: t.name,
          body: t.body?.substring(0, 100) + (t.body?.length > 100 ? '...' : '')
        })),
        raw: smsTemplates
      };
    } catch (error) {
      logger.error('Failed to extract SMS templates', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract custom fields
   */
  async extractCustomFields() {
    logger.info('Extracting custom fields...');
    
    try {
      const data = await this.request('GET', `/locations/${this.locationId}/customFields`);
      const fields = data.customFields || [];
      
      await this.saveApiResponse('custom-fields-data.json', {
        extractedAt: new Date().toISOString(),
        locationId: this.locationId,
        count: fields.length,
        fields
      });

      logger.success(`Extracted ${fields.length} custom fields`);
      
      return {
        success: true,
        count: fields.length,
        fields: fields.map(f => ({
          id: f.id,
          name: f.name,
          fieldKey: f.fieldKey,
          dataType: f.dataType,
          model: f.model // contact, opportunity, etc.
        })),
        raw: fields
      };
    } catch (error) {
      logger.error('Failed to extract custom fields', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract calendars
   */
  async extractCalendars() {
    logger.info('Extracting calendars...');
    
    try {
      const data = await this.request('GET', `/locations/${this.locationId}/calendars`);
      const calendars = data.calendars || [];
      
      await this.saveApiResponse('calendars-data.json', {
        extractedAt: new Date().toISOString(),
        locationId: this.locationId,
        count: calendars.length,
        calendars
      });

      logger.success(`Extracted ${calendars.length} calendars`);
      
      return {
        success: true,
        count: calendars.length,
        calendars: calendars.map(c => ({
          id: c.id,
          name: c.name,
          description: c.description,
          type: c.type
        })),
        raw: calendars
      };
    } catch (error) {
      logger.error('Failed to extract calendars', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract forms
   */
  async extractForms() {
    logger.info('Extracting forms...');
    
    try {
      const data = await this.request('GET', `/locations/${this.locationId}/forms`);
      const forms = data.forms || [];
      
      await this.saveApiResponse('forms-data.json', {
        extractedAt: new Date().toISOString(),
        locationId: this.locationId,
        count: forms.length,
        forms
      });

      logger.success(`Extracted ${forms.length} forms`);
      
      return {
        success: true,
        count: forms.length,
        forms: forms.map(f => ({
          id: f.id,
          name: f.name,
          type: f.type,
          status: f.status
        })),
        raw: forms
      };
    } catch (error) {
      logger.error('Failed to extract forms', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract workflows
   */
  async extractWorkflows() {
    logger.info('Extracting workflows...');
    
    try {
      const data = await this.request('GET', `/locations/${this.locationId}/workflows`);
      const workflows = data.workflows || [];
      
      await this.saveApiResponse('workflows-data.json', {
        extractedAt: new Date().toISOString(),
        locationId: this.locationId,
        count: workflows.length,
        workflows
      });

      logger.success(`Extracted ${workflows.length} workflows`);
      
      return {
        success: true,
        count: workflows.length,
        workflows: workflows.map(w => ({
          id: w.id,
          name: w.name,
          status: w.status,
          type: w.type
        })),
        raw: workflows
      };
    } catch (error) {
      logger.error('Failed to extract workflows', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract tags
   */
  async extractTags() {
    logger.info('Extracting tags...');
    
    try {
      const data = await this.request('GET', `/locations/${this.locationId}/tags`);
      const tags = data.tags || [];
      
      await this.saveApiResponse('tags-data.json', {
        extractedAt: new Date().toISOString(),
        locationId: this.locationId,
        count: tags.length,
        tags
      });

      logger.success(`Extracted ${tags.length} tags`);
      
      return {
        success: true,
        count: tags.length,
        tags: tags.map(t => ({
          id: t.id,
          name: t.name,
          color: t.color
        })),
        raw: tags
      };
    } catch (error) {
      logger.error('Failed to extract tags', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Build structured location config from extracted data
   */
  buildLocationConfig(extractionResults) {
    const location = extractionResults.location?.data || {};
    const pipelines = extractionResults.pipelines?.pipelines || [];
    const customFields = extractionResults.customFields?.fields || [];
    const calendars = extractionResults.calendars?.calendars || [];

    // Find the main inquiry/contact pipeline
    const inquiryPipeline = pipelines.find(p => 
      p.name.toLowerCase().includes('inquiry') || 
      p.name.toLowerCase().includes('lead')
    ) || pipelines[0];

    // Find tour booking calendar
    const tourCalendar = calendars.find(c => 
      c.name.toLowerCase().includes('tour') ||
      c.name.toLowerCase().includes('visit')
    ) || calendars[0];

    const config = {
      version: '1.0.0',
      locationId: this.locationId,
      name: location.name || '',
      industry: 'wedding-venue',
      timezone: location.timezone || 'America/New_York',
      
      address: {
        street: location.address?.address || location.address?.street || '',
        city: location.address?.city || '',
        state: location.address?.state || '',
        postalCode: location.address?.postalCode || location.address?.zip || '',
        country: location.address?.country || 'US'
      },
      
      contact: {
        email: location.email || '',
        phone: location.phone || '',
        website: location.website || ''
      },
      
      logoUrl: location.logoUrl || '',
      
      businessHours: location.businessHours || {
        monday: { open: '09:00', close: '17:00', closed: false },
        tuesday: { open: '09:00', close: '17:00', closed: false },
        wednesday: { open: '09:00', close: '17:00', closed: false },
        thursday: { open: '09:00', close: '17:00', closed: false },
        friday: { open: '09:00', close: '17:00', closed: false },
        saturday: { open: '10:00', close: '16:00', closed: false },
        sunday: { closed: true }
      },
      
      pipelines: {
        inquiry: inquiryPipeline?.id || '',
        stages: inquiryPipeline?.stages?.reduce((acc, stage) => {
          acc[stage.name.toLowerCase().replace(/\s+/g, '_')] = stage.id;
          return acc;
        }, {}) || {}
      },
      
      calendars: {
        tourBooking: tourCalendar?.id || ''
      },
      
      customFields: customFields
        .filter(f => f.model === 'contact')
        .reduce((acc, field) => {
          acc[field.fieldKey] = {
            id: field.id,
            name: field.name,
            dataType: field.dataType
          };
          return acc;
        }, {}),
      
      extractedAt: new Date().toISOString(),
      ghlData: {
        pipelinesCount: extractionResults.pipelines?.count || 0,
        emailTemplatesCount: extractionResults.emailTemplates?.count || 0,
        smsTemplatesCount: extractionResults.smsTemplates?.count || 0,
        customFieldsCount: extractionResults.customFields?.count || 0,
        calendarsCount: extractionResults.calendars?.count || 0,
        formsCount: extractionResults.forms?.count || 0,
        workflowsCount: extractionResults.workflows?.count || 0
      }
    };

    return config;
  }

  /**
   * Save location config to file
   */
  async saveLocationConfig(config) {
    const configPath = path.join(this.clientDir, 'location-config.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
    logger.success(`Saved location config: ${configPath}`);
    return configPath;
  }

  /**
   * Run complete extraction
   */
  async runFullExtraction(options = {}) {
    logger.info(`Starting GHL auto-extraction for ${this.clientSlug}`);
    logger.info(`Location ID: ${this.locationId}`);

    await this.initializeDirectories();

    const results = {
      timestamp: new Date().toISOString(),
      locationId: this.locationId,
      steps: {}
    };

    // Extract location details
    results.steps.location = await this.extractLocationDetails();
    if (!results.steps.location.success) {
      throw new Error(`Failed to extract location: ${results.steps.location.error}`);
    }

    // Extract all other data in parallel where possible
    const extractionPromises = [
      this.extractPipelines().then(r => results.steps.pipelines = r),
      this.extractEmailTemplates().then(r => results.steps.emailTemplates = r),
      this.extractSMSTemplates().then(r => results.steps.smsTemplates = r),
      this.extractCustomFields().then(r => results.steps.customFields = r),
      this.extractCalendars().then(r => results.steps.calendars = r),
      this.extractForms().then(r => results.steps.forms = r),
      this.extractWorkflows().then(r => results.steps.workflows = r),
      this.extractTags().then(r => results.steps.tags = r)
    ];

    await Promise.all(extractionPromises);

    // Build and save structured config
    const config = this.buildLocationConfig(results.steps);
    await this.saveLocationConfig(config);
    results.locationConfig = config;

    // Save extraction summary
    await this.saveApiResponse('extraction-summary.json', {
      ...results,
      success: true,
      completedAt: new Date().toISOString()
    });

    logger.success('GHL auto-extraction complete');
    
    return results;
  }

  /**
   * Test GHL connection
   */
  async testConnection() {
    try {
      const data = await this.request('GET', `/locations/${this.locationId}`);
      return {
        success: true,
        message: `Connected to: ${data.name}`,
        locationName: data.name
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}

export default GHLAutoExtractionService;
