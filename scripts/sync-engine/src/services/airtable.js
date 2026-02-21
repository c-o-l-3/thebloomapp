import Airtable from 'airtable';
import logger from '../utils/logger.js';

class AirtableService {
  constructor() {
    this.apiKey = process.env.AIRTABLE_API_KEY;
    this.baseId = process.env.AIRTABLE_BASE_ID;
    this.base = null;
    this.isConnected = false;
  }

  /**
   * Get the Airtable base instance
   * Throws error if not connected
   */
  getBase() {
    if (!this.base) {
      throw new Error('Airtable not connected. Call connect() first.');
    }
    return this.base;
  }

  async connect() {
    try {
      Airtable.configure({
        apiKey: this.apiKey
      });
      this.base = Airtable.base(this.baseId);
      await this.base('Journeys').select({ maxRecords: 1 }).firstPage();
      this.isConnected = true;
      logger.success('Connected to Airtable');
      return true;
    } catch (error) {
      logger.error('Failed to connect to Airtable', { error: error.message });
      return false;
    }
  }

  async getPublishedJourneys(clientId = null) {
    try {
      const filterFormula = clientId 
        ? `{Status} = 'Published' AND {Client} = '${clientId}'`
        : `{Status} = 'Published'`;

      const records = await this.base('Journeys')
        .select({
          filterByFormula: filterFormula,
          sort: [{ field: 'Last Modified', direction: 'desc' }]
        })
        .all();

      logger.info(`Found ${records.length} published journeys`, { clientId });
      return records.map(record => this.transformJourney(record));
    } catch (error) {
      logger.error('Failed to fetch published journeys', { error: error.message });
      throw error;
    }
  }

  async getJourneyById(journeyId) {
    try {
      const record = await this.base('Journeys').find(journeyId);
      return this.transformJourney(record);
    } catch (error) {
      logger.error('Failed to fetch journey', { journeyId, error: error.message });
      throw error;
    }
  }

  async getTouchpointsForJourney(journeyId) {
    try {
      const records = await this.base('Touchpoints')
        .select({
          filterByFormula: `{Journey} = '${journeyId}'`,
          sort: [{ field: 'Order', direction: 'asc' }]
        })
        .all();

      logger.info(`Found ${records.length} touchpoints for journey`, { journeyId });
      return records.map(record => this.transformTouchpoint(record));
    } catch (error) {
      logger.error('Failed to fetch touchpoints', { journeyId, error: error.message });
      throw error;
    }
  }

  async getVersionHistory(journeyId) {
    try {
      const records = await this.base('SyncHistory')
        .select({
          filterByFormula: `{Journey} = '${journeyId}'`,
          sort: [{ field: 'Created', direction: 'desc' }],
          maxRecords: 20
        })
        .all();

      return records.map(record => this.transformSyncHistory(record));
    } catch (error) {
      logger.error('Failed to fetch version history', { journeyId, error: error.message });
      throw error;
    }
  }

  async createSyncHistoryRecord(journeyId, syncData) {
    try {
      const record = await this.base('SyncHistory').create({
        Journey: [journeyId],
        Status: syncData.status,
        SyncType: syncData.type,
        GHLWorkflowId: syncData.ghlWorkflowId || '',
        ErrorDetails: syncData.error || '',
        Duration: syncData.duration || 0
      });
      
      logger.info('Created sync history record', { journeyId, syncId: record.id });
      return record;
    } catch (error) {
      logger.error('Failed to create sync history record', { error: error.message });
      throw error;
    }
  }

  async updateJourneySyncStatus(journeyId, status, additionalFields = {}) {
    try {
      const updateData = {
        'Sync Status': status,
        'Last Sync': new Date().toISOString(),
        ...additionalFields
      };

      const record = await this.base('Journeys').update(journeyId, updateData);
      logger.info('Updated journey sync status', { journeyId, status });
      return this.transformJourney(record);
    } catch (error) {
      logger.error('Failed to update journey sync status', { journeyId, error: error.message });
      throw error;
    }
  }

  async updateJourneyGHLId(journeyId, ghlWorkflowId) {
    try {
      const record = await this.base('Journeys').update(journeyId, {
        'GHL Workflow ID': ghlWorkflowId
      });
      logger.info('Updated journey GHL ID', { journeyId, ghlWorkflowId });
      return this.transformJourney(record);
    } catch (error) {
      logger.error('Failed to update journey GHL ID', { journeyId, error: error.message });
      throw error;
    }
  }

  transformJourney(record) {
    return {
      id: record.id,
      name: record.get('Name') || '',
      description: record.get('Description') || '',
      status: record.get('Status') || 'Draft',
      client: record.get('Client') || '',
      version: record.get('Version') || 1,
      lastModified: record.get('Last Modified') || null,
      ghlWorkflowId: record.get('GHL Workflow ID') || null,
      syncStatus: record.get('Sync Status') || 'Not Synced',
      lastSync: record.get('Last Sync') || null,
      touchpoints: [],
      tags: record.get('Tags') || [],
      category: record.get('Category') || ''
    };
  }

  transformTouchpoint(record) {
    return {
      id: record.id,
      journeyId: record.get('Journey')?.[0] || null,
      name: record.get('Name') || '',
      type: record.get('Type') || 'Email',
      order: record.get('Order') || 0,
      config: {
        delay: record.get('Delay') || 0,
        delayUnit: record.get('Delay Unit') || 'hours',
        content: record.get('Content') || '',
        templateId: record.get('Template ID') || '',
        condition: record.get('Condition') || '',
        assignee: record.get('Assignee') || '',
        dueIn: record.get('Due In') || 24
      },
      nextTouchpointId: record.get('Next Touchpoint')?.[0] || null
    };
  }

  transformSyncHistory(record) {
    return {
      id: record.id,
      journeyId: record.get('Journey')?.[0] || null,
      status: record.get('Status') || 'Unknown',
      syncType: record.get('SyncType') || 'Unknown',
      ghlWorkflowId: record.get('GHLWorkflowId') || null,
      errorDetails: record.get('ErrorDetails') || '',
      duration: record.get('Duration') || 0,
      created: record.get('Created') || null
    };
  }

  async testConnection() {
    try {
      await this.base('Journeys').select({ maxRecords: 1 }).firstPage();
      return { success: true, message: 'Airtable connection successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

export const airtableService = new AirtableService();
export default airtableService;
