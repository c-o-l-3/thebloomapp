/**
 * Airtable API Client Service
 * Handles CRUD operations for Journeys, Touchpoints, Approvals, and Versions
 */

import axios from 'axios';

const AIRTABLE_API_VERSION = 'v0';
const BASE_URL = `https://api.airtable.com/${AIRTABLE_API_VERSION}`;

/**
 * AirtableClient class for interacting with Airtable REST API
 */
export class AirtableClient {
  constructor(apiKey, baseId) {
    this.apiKey = apiKey;
    this.baseId = baseId;
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Generic CRUD operations
  async getRecords(tableName, options = {}) {
    const { filterByFormula, maxRecords, view, sort } = options;
    const params = new URLSearchParams();
    
    if (filterByFormula) params.append('filterByFormula', filterByFormula);
    if (maxRecords) params.append('maxRecords', maxRecords);
    if (view) params.append('view', view);
    if (sort) params.append('sort', JSON.stringify(sort));

    try {
      const response = await this.client.get(`/bases/${this.baseId}/tables/${tableName}/records`, {
        params
      });
      return response.data.records;
    } catch (error) {
      console.error(`Error fetching records from ${tableName}:`, error);
      throw error;
    }
  }

  async getRecord(tableName, recordId) {
    try {
      const response = await this.client.get(`/bases/${this.baseId}/tables/${tableName}/records/${recordId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching record ${recordId} from ${tableName}:`, error);
      throw error;
    }
  }

  async createRecord(tableName, fields) {
    try {
      const response = await this.client.post(`/bases/${this.baseId}/tables/${tableName}/records`, {
        fields
      });
      return response.data;
    } catch (error) {
      console.error(`Error creating record in ${tableName}:`, error);
      throw error;
    }
  }

  async updateRecord(tableName, recordId, fields) {
    try {
      const response = await this.client.patch(`/bases/${this.baseId}/tables/${tableName}/records/${recordId}`, {
        fields
      });
      return response.data;
    } catch (error) {
      console.error(`Error updating record ${recordId} in ${tableName}:`, error);
      throw error;
    }
  }

  async deleteRecord(tableName, recordId) {
    try {
      const response = await this.client.delete(`/bases/${this.baseId}/tables/${tableName}/records/${recordId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting record ${recordId} from ${tableName}:`, error);
      throw error;
    }
  }

  // Journey-specific operations
  async getJourneys(clientId = null, status = null) {
    const filters = [];
    if (clientId) filters.push(`{Client} = '${clientId}'`);
    if (status) filters.push(`{Status} = '${status}'`);
    
    const formula = filters.length > 0 ? `AND(${filters.join(',')})` : '';
    return this.getRecords('Journeys', { filterByFormula: formula, sort: [{ field: 'Updated', direction: 'desc' }] });
  }

  async getJourney(journeyId) {
    return this.getRecord('Journeys', journeyId);
  }

  async createJourney(journeyData) {
    return this.createRecord('Journeys', {
      Name: journeyData.name,
      Description: journeyData.description,
      Client: [journeyData.clientId],
      Pipeline: [journeyData.pipelineId],
      Status: journeyData.status || 'Draft',
      Version: journeyData.version || 1
    });
  }

  async updateJourney(journeyId, journeyData) {
    return this.updateRecord('Journeys', journeyId, {
      Name: journeyData.name,
      Description: journeyData.description,
      Status: journeyData.status,
      Version: journeyData.version
    });
  }

  async updateJourneyStatus(journeyId, status) {
    return this.updateJourney(journeyId, { status });
  }

  // Touchpoint-specific operations
  async getTouchpoints(journeyId) {
    return this.getRecords('Touchpoints', {
      filterByFormula: `{Journey} = '${journeyId}'`,
      sort: [{ field: 'Order', direction: 'asc' }]
    });
  }

  async createTouchpoint(touchpointData) {
    return this.createRecord('Touchpoints', {
      Name: touchpointData.name,
      Type: touchpointData.type,
      Journey: [touchpointData.journeyId],
      Content: JSON.stringify(touchpointData.content),
      Order: touchpointData.order,
      PositionX: touchpointData.position.x,
      PositionY: touchpointData.position.y
    });
  }

  async updateTouchpoint(touchpointId, touchpointData) {
    return this.updateRecord('Touchpoints', touchpointId, {
      Name: touchpointData.name,
      Type: touchpointData.type,
      Content: JSON.stringify(touchpointData.content),
      Order: touchpointData.order,
      PositionX: touchpointData.position.x,
      PositionY: touchpointData.position.y
    });
  }

  async deleteTouchpoint(touchpointId) {
    return this.deleteRecord('Touchpoints', touchpointId);
  }

  // Approval-specific operations
  async getApprovals(journeyId) {
    return this.getRecords('Approvals', {
      filterByFormula: `{Journey} = '${journeyId}'`,
      sort: [{ field: 'Reviewed At', direction: 'desc' }]
    });
  }

  async createApproval(approvalData) {
    return this.createRecord('Approvals', {
      Journey: [approvalData.journeyId],
      Status: approvalData.status,
      Comments: approvalData.comments,
      'Requested By': approvalData.requestedBy,
      'Reviewed By': approvalData.reviewedBy,
      Version: approvalData.version
    });
  }

  // Version-specific operations
  async getVersions(journeyId) {
    return this.getRecords('Versions', {
      filterByFormula: `{Journey} = '${journeyId}'`,
      sort: [{ field: 'Version', direction: 'desc' }]
    });
  }

  async createVersion(versionData) {
    return this.createRecord('Versions', {
      Journey: [versionData.journeyId],
      Version: versionData.version,
      Snapshot: JSON.stringify(versionData.snapshot),
      'Created By': versionData.createdBy,
      'Change Log': versionData.changeLog
    });
  }

  // Client-specific operations
  async getClients() {
    return this.getRecords('Clients', {
      sort: [{ field: 'Name', direction: 'asc' }]
    });
  }

  async getClient(clientId) {
    return this.getRecord('Clients', clientId);
  }
}

// Factory function for creating client instances
export function createAirtableClient(apiKey, baseId) {
  if (!apiKey || !baseId) {
    throw new Error('Airtable API key and Base ID are required');
  }
  return new AirtableClient(apiKey, baseId);
}

// Export default instance creator
export default createAirtableClient;
