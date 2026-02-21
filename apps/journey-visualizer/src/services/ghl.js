/**
 * GoHighLevel API Service
 * Handles integration with GoHighLevel CRM for journey synchronization
 */

import axios from 'axios';

const GHL_API_VERSION = 'v2';
const BASE_URL = `https://api.gohighlevel.com/${GHL_API_VERSION}`;

/**
 * GHLClient class for interacting with GoHighLevel REST API
 */
export class GHLClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Location operations
  async getLocations() {
    try {
      const response = await this.client.get('/locations');
      return response.data.locations;
    } catch (error) {
      console.error('Error fetching locations:', error);
      throw error;
    }
  }

  async getLocation(locationId) {
    try {
      const response = await this.client.get(`/locations/${locationId}`);
      return response.data.location;
    } catch (error) {
      console.error(`Error fetching location ${locationId}:`, error);
      throw error;
    }
  }

  // Pipeline operations
  async getPipelines(locationId) {
    try {
      const response = await this.client.get(`/locations/${locationId}/pipelines`);
      return response.data.pipelines;
    } catch (error) {
      console.error(`Error fetching pipelines for location ${locationId}:`, error);
      throw error;
    }
  }

  async getPipeline(locationId, pipelineId) {
    try {
      const response = await this.client.get(`/locations/${locationId}/pipelines/${pipelineId}`);
      return response.data.pipeline;
    } catch (error) {
      console.error(`Error fetching pipeline ${pipelineId}:`, error);
      throw error;
    }
  }

  // Workflow operations
  async getWorkflows(locationId) {
    try {
      const response = await this.client.get(`/locations/${locationId}/workflows`);
      return response.data.workflows;
    } catch (error) {
      console.error(`Error fetching workflows for location ${locationId}:`, error);
      throw error;
    }
  }

  async createWorkflow(locationId, workflowData) {
    try {
      const response = await this.client.post(`/locations/${locationId}/workflows`, {
        name: workflowData.name,
        status: workflowData.status || 'active',
        triggerType: workflowData.triggerType,
        settings: workflowData.settings
      });
      return response.data.workflow;
    } catch (error) {
      console.error(`Error creating workflow for location ${locationId}:`, error);
      throw error;
    }
  }

  async updateWorkflow(locationId, workflowId, workflowData) {
    try {
      const response = await this.client.put(`/locations/${locationId}/workflows/${workflowId}`, {
        name: workflowData.name,
        status: workflowData.status,
        settings: workflowData.settings
      });
      return response.data.workflow;
    } catch (error) {
      console.error(`Error updating workflow ${workflowId}:`, error);
      throw error;
    }
  }

  async deleteWorkflow(locationId, workflowId) {
    try {
      const response = await this.client.delete(`/locations/${locationId}/workflows/${workflowId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting workflow ${workflowId}:`, error);
      throw error;
    }
  }

  // Contact operations
  async getContacts(locationId, options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit);
      if (options.after) params.append('after', options.after);
      if (options.before) params.append('before', options.before);
      
      const response = await this.client.get(`/locations/${locationId}/contacts`, { params });
      return response.data.contacts;
    } catch (error) {
      console.error(`Error fetching contacts for location ${locationId}:`, error);
      throw error;
    }
  }

  // SMS operations
  async sendSMS(locationId, messageData) {
    try {
      const response = await this.client.post(`/locations/${locationId}/messages/sms`, {
        to: messageData.to,
        body: messageData.body,
        from: messageData.from
      });
      return response.data;
    } catch (error) {
      console.error(`Error sending SMS from location ${locationId}:`, error);
      throw error;
    }
  }

  // Email operations
  async sendEmail(locationId, emailData) {
    try {
      const response = await this.client.post(`/locations/${locationId}/messages/email`, {
        to: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
        from: emailData.from
      });
      return response.data;
    } catch (error) {
      console.error(`Error sending email from location ${locationId}:`, error);
      throw error;
    }
  }

  // Task operations
  async createTask(locationId, taskData) {
    try {
      const response = await this.client.post(`/locations/${locationId}/tasks`, {
        title: taskData.title,
        dueDate: taskData.dueDate,
        assignee: taskData.assignee,
        body: taskData.body
      });
      return response.data.task;
    } catch (error) {
      console.error(`Error creating task for location ${locationId}:`, error);
      throw error;
    }
  }

  // Opportunity operations
  async createOpportunity(locationId, opportunityData) {
    try {
      const response = await this.client.post(`/locations/${locationId}/opportunities`, {
        name: opportunityData.name,
        pipelineId: opportunityData.pipelineId,
        statusId: opportunityData.statusId,
        contactId: opportunityData.contactId,
        value: opportunityData.value,
        note: opportunityData.note
      });
      return response.data.opportunity;
    } catch (error) {
      console.error(`Error creating opportunity for location ${locationId}:`, error);
      throw error;
    }
  }

  async updateOpportunity(locationId, opportunityId, opportunityData) {
    try {
      const response = await this.client.put(`/locations/${locationId}/opportunities/${opportunityId}`, {
        name: opportunityData.name,
        statusId: opportunityData.statusId,
        value: opportunityData.value,
        note: opportunityData.note
      });
      return response.data.opportunity;
    } catch (error) {
      console.error(`Error updating opportunity ${opportunityId}:`, error);
      throw error;
    }
  }
}

// Factory function for creating client instances
export function createGHLClient(apiKey) {
  if (!apiKey) {
    throw new Error('GoHighLevel API key is required');
  }
  return new GHLClient(apiKey);
}

// Export default instance creator
export default createGHLClient;
