import axios from 'axios';
import logger from '../utils/logger.js';

class GHLService {
  constructor() {
    this.apiKey = process.env.GHL_API_KEY;
    this.locationId = process.env.GHL_LOCATION_ID;
    this.baseUrl = 'https://services.leadconnectorhq.com';
    this.isConnected = false;
    this.rateLimitDelay = 250; // 4 requests per second default
    this.maxRetries = parseInt(process.env.SYNC_MAX_RETRIES) || 3;
    this.retryDelay = parseInt(process.env.SYNC_RETRY_DELAY) || 5000;
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28'
    };
  }

  async connect() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/locations/${this.locationId}`,
        { headers: this.getHeaders() }
      );
      this.isConnected = true;
      logger.success('Connected to GoHighLevel', { locationId: this.locationId });
      return true;
    } catch (error) {
      logger.error('Failed to connect to GoHighLevel', { error: error.message });
      return false;
    }
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
      if (error.response?.status === 429 && retries < this.maxRetries) {
        logger.warn('Rate limit hit, retrying', { endpoint, retry: retries + 1 });
        await this.sleep(this.retryDelay * (retries + 1));
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

  throttle() {
    return new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Workflow Operations
  async getWorkflows() {
    try {
      const response = await this.request('GET', `/locations/${this.locationId}/workflows`);
      return response.workflows || [];
    } catch (error) {
      logger.error('Failed to fetch workflows', { error: error.message });
      throw error;
    }
  }

  async getWorkflowById(workflowId) {
    try {
      const response = await this.request('GET', `/workflows/${workflowId}`);
      return response;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async createWorkflow(workflowData) {
    try {
      const response = await this.request('POST', `/locations/${this.locationId}/workflows`, {
        name: workflowData.name,
        description: workflowData.description || '',
        status: workflowData.status || 'active',
        steps: workflowData.steps || []
      });

      logger.success('Created workflow', { workflowId: response.id, name: workflowData.name });
      return response;
    } catch (error) {
      logger.error('Failed to create workflow', { name: workflowData.name, error: error.message });
      throw error;
    }
  }

  async updateWorkflow(workflowId, workflowData) {
    try {
      const response = await this.request('PUT', `/workflows/${workflowId}`, {
        name: workflowData.name,
        description: workflowData.description || '',
        status: workflowData.status || 'active',
        steps: workflowData.steps || []
      });

      logger.success('Updated workflow', { workflowId, name: workflowData.name });
      return response;
    } catch (error) {
      logger.error('Failed to update workflow', { workflowId, error: error.message });
      throw error;
    }
  }

  async deleteWorkflow(workflowId) {
    try {
      await this.request('DELETE', `/workflows/${workflowId}`);
      logger.success('Deleted workflow', { workflowId });
      return true;
    } catch (error) {
      logger.error('Failed to delete workflow', { workflowId, error: error.message });
      throw error;
    }
  }

  async activateWorkflow(workflowId) {
    try {
      const response = await this.request('POST', `/workflows/${workflowId}/activate`);
      logger.success('Activated workflow', { workflowId });
      return response;
    } catch (error) {
      logger.error('Failed to activate workflow', { workflowId, error: error.message });
      throw error;
    }
  }

  async pauseWorkflow(workflowId) {
    try {
      const response = await this.request('POST', `/workflows/${workflowId}/pause`);
      logger.success('Paused workflow', { workflowId });
      return response;
    } catch (error) {
      logger.error('Failed to pause workflow', { workflowId, error: error.message });
      throw error;
    }
  }

  // Email Template Operations (per Technical Specification)
  // Endpoint: POST /emails/builder to create, PUT /emails/builder/{id} to update
  async createEmailTemplate(templateData) {
    try {
      const response = await this.request('POST', `/emails/builder`, {
        locationId: this.locationId,
        title: templateData.name,
        name: templateData.name,
        type: 'html',
        subject: templateData.subject,
        body: `<html><body>${templateData.body}</body></html>`
      });

      logger.success('Created email template', { templateId: response.id, name: templateData.name });
      return response;
    } catch (error) {
      logger.error('Failed to create email template', { name: templateData.name, error: error.message });
      throw error;
    }
  }

  async updateEmailTemplate(templateId, templateData) {
    try {
      const response = await this.request('PUT', `/emails/builder/${templateId}`, {
        locationId: this.locationId,
        title: templateData.name,
        name: templateData.name,
        type: 'html',
        subject: templateData.subject,
        body: `<html><body>${templateData.body}</body></html>`
      });

      logger.success('Updated email template', { templateId, name: templateData.name });
      return response;
    } catch (error) {
      logger.error('Failed to update email template', { templateId, name: templateData.name, error: error.message });
      throw error;
    }
  }

  async getEmailTemplates() {
    try {
      const response = await this.request('GET', `/emails/builder?locationId=${this.locationId}`);
      return response.emails || [];
    } catch (error) {
      logger.error('Failed to fetch email templates', { error: error.message });
      throw error;
    }
  }

  // SMS Template Operations (per Technical Specification)
  // Endpoint: POST /locations/{locationId}/templates to create, PUT /locations/{locationId}/templates/{id} to update
  async createSMSTemplate(templateData) {
    try {
      const response = await this.request('POST', `/locations/${this.locationId}/templates`, {
        name: templateData.name,
        type: 'sms',
        templateType: 'sms',
        body: templateData.body,
        attachments: []
      });

      logger.success('Created SMS template', { templateId: response.id, name: templateData.name });
      return response;
    } catch (error) {
      logger.error('Failed to create SMS template', { name: templateData.name, error: error.message });
      throw error;
    }
  }

  async updateSMSTemplate(templateId, templateData) {
    try {
      const response = await this.request('PUT', `/locations/${this.locationId}/templates/${templateId}`, {
        name: templateData.name,
        type: 'sms',
        templateType: 'sms',
        body: templateData.body,
        attachments: []
      });

      logger.success('Updated SMS template', { templateId, name: templateData.name });
      return response;
    } catch (error) {
      logger.error('Failed to update SMS template', { templateId, name: templateData.name, error: error.message });
      throw error;
    }
  }

  async getSMSTemplates() {
    try {
      const response = await this.request('GET', `/locations/${this.locationId}/templates`);
      return response.templates || [];
    } catch (error) {
      logger.error('Failed to fetch SMS templates', { error: error.message });
      throw error;
    }
  }

  // Contact Operations
  async getContacts(limit = 100, offset = 0) {
    try {
      const response = await this.request('GET', `/locations/${this.locationId}/contacts`, {
        limit,
        startAfterId: offset
      });
      return response.contacts || [];
    } catch (error) {
      logger.error('Failed to fetch contacts', { error: error.message });
      throw error;
    }
  }

  // Pipeline Operations
  async getPipelines() {
    try {
      const response = await this.request('GET', `/locations/${this.locationId}/pipelines`);
      return response.pipelines || [];
    } catch (error) {
      logger.error('Failed to fetch pipelines', { error: error.message });
      throw error;
    }
  }

  // Opportunity Operations
  async createOpportunity(pipelineId, opportunityData) {
    try {
      const response = await this.request('POST', `/locations/${this.locationId}/opportunities`, {
        pipelineId,
        name: opportunityData.name,
        contactId: opportunityData.contactId,
        value: opportunityData.value,
        stageId: opportunityData.stageId
      });

      logger.success('Created opportunity', { opportunityId: response.id });
      return response;
    } catch (error) {
      logger.error('Failed to create opportunity', { error: error.message });
      throw error;
    }
  }

  async testConnection() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/locations/${this.locationId}`,
        { headers: this.getHeaders() }
      );
      return { 
        success: true, 
        message: 'GHL connection successful',
        locationName: response.data.name
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  setRateLimit(delay) {
    this.rateLimitDelay = delay;
  }
}

export const ghlService = new GHLService();
export default ghlService;
