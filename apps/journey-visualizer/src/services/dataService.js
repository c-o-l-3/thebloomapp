/**
 * Unified Data Service
 * Provides a single interface for all data operations
 * Supports multiple backends: PostgreSQL API, Airtable (legacy), Local files
 */

import { getApiClient } from './apiClient';
import { createAirtableClient } from './airtable';
import {
  isLocalMode as checkLocalMode,
  getLocalClients,
  getLocalJourneys,
  getLocalJourney,
  createLocalJourney,
  updateLocalJourney,
  deleteLocalJourney
} from './localJourneys';

// Data source types
export const DATA_SOURCES = {
  API: 'api',           // PostgreSQL REST API (new default)
  AIRTABLE: 'airtable', // Legacy Airtable
  LOCAL: 'local'        // Local JSON files
};

// Get data source from environment
const DEFAULT_DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || DATA_SOURCES.API;

/**
 * Unified Data Service class
 */
class DataService {
  constructor(source = DEFAULT_DATA_SOURCE) {
    this.source = source;
    this.apiClient = null;
    this.airtableClient = null;
    this.initialized = false;
  }

  /**
   * Initialize the data service
   */
  async initialize() {
    if (this.initialized) return;

    switch (this.source) {
      case DATA_SOURCES.API:
        this.apiClient = getApiClient();
        // Test connection
        try {
          await this.apiClient.healthCheck();
          console.log('[DataService] Connected to PostgreSQL API');
        } catch (error) {
          console.warn('[DataService] API connection failed, falling back to local mode', error);
          this.source = DATA_SOURCES.LOCAL;
        }
        break;

      case DATA_SOURCES.AIRTABLE:
        const apiKey = import.meta.env.VITE_AIRTABLE_API_KEY;
        const baseId = import.meta.env.VITE_AIRTABLE_BASE_ID;
        if (apiKey && baseId) {
          this.airtableClient = createAirtableClient(apiKey, baseId);
          console.log('[DataService] Connected to Airtable (legacy mode)');
        } else {
          console.warn('[DataService] Airtable credentials missing, falling back to local mode');
          this.source = DATA_SOURCES.LOCAL;
        }
        break;

      case DATA_SOURCES.LOCAL:
        console.log('[DataService] Using local data source');
        break;

      default:
        throw new Error(`Unknown data source: ${this.source}`);
    }

    this.initialized = true;
  }

  /**
   * Get current data source
   */
  getSource() {
    return this.source;
  }

  /**
   * Check if using API mode
   */
  isApiMode() {
    return this.source === DATA_SOURCES.API;
  }

  /**
   * Check if using legacy Airtable mode
   */
  isAirtableMode() {
    return this.source === DATA_SOURCES.AIRTABLE;
  }

  /**
   * Check if using local mode
   */
  isLocalMode() {
    return this.source === DATA_SOURCES.LOCAL;
  }

  // ==================== CLIENTS ====================

  async getClients(options = {}) {
    await this.initialize();

    switch (this.source) {
      case DATA_SOURCES.API:
        return this.apiClient.getClients(options);

      case DATA_SOURCES.AIRTABLE:
        const records = await this.airtableClient.getClients();
        return records.map(r => ({
          id: r.id,
          name: r.fields.Name,
          slug: r.fields.Name?.toLowerCase().replace(/\s+/g, '-'),
          locationId: r.fields['Location ID'],
          status: r.fields.Status?.toLowerCase() || 'active'
        }));

      case DATA_SOURCES.LOCAL:
        return getLocalClients();

      default:
        throw new Error('Data source not initialized');
    }
  }

  async getClient(slug) {
    await this.initialize();

    switch (this.source) {
      case DATA_SOURCES.API:
        return this.apiClient.getClient(slug);

      case DATA_SOURCES.AIRTABLE:
        // Airtable doesn't support slug lookup directly
        const clients = await this.getClients();
        return clients.find(c => c.slug === slug);

      case DATA_SOURCES.LOCAL:
        const localClients = await getLocalClients();
        return localClients.find(c => c.slug === slug);

      default:
        throw new Error('Data source not initialized');
    }
  }

  // ==================== JOURNEYS ====================

  async getJourneys(options = {}) {
    await this.initialize();

    switch (this.source) {
      case DATA_SOURCES.API:
        return this.apiClient.getJourneys(options);

      case DATA_SOURCES.AIRTABLE:
        const records = await this.airtableClient.getJourneys(options.clientId, options.status);
        return records.map(r => this.transformAirtableJourney(r));

      case DATA_SOURCES.LOCAL:
        return getLocalJourneys(options.clientId || 'promise-farm');

      default:
        throw new Error('Data source not initialized');
    }
  }

  async getJourney(id) {
    await this.initialize();

    switch (this.source) {
      case DATA_SOURCES.API:
        return this.apiClient.getJourney(id);

      case DATA_SOURCES.AIRTABLE:
        const record = await this.airtableClient.getJourney(id);
        return this.transformAirtableJourney(record);

      case DATA_SOURCES.LOCAL:
        return getLocalJourney(id);

      default:
        throw new Error('Data source not initialized');
    }
  }

  async createJourney(journeyData) {
    await this.initialize();

    switch (this.source) {
      case DATA_SOURCES.API:
        return this.apiClient.createJourney(journeyData);

      case DATA_SOURCES.AIRTABLE:
        const record = await this.airtableClient.createJourney(journeyData);
        return this.transformAirtableJourney(record);

      case DATA_SOURCES.LOCAL:
        return createLocalJourney(journeyData);

      default:
        throw new Error('Data source not initialized');
    }
  }

  async updateJourney(id, journeyData) {
    await this.initialize();

    switch (this.source) {
      case DATA_SOURCES.API:
        return this.apiClient.updateJourney(id, journeyData);

      case DATA_SOURCES.AIRTABLE:
        const record = await this.airtableClient.updateJourney(id, journeyData);
        return this.transformAirtableJourney(record);

      case DATA_SOURCES.LOCAL:
        return updateLocalJourney(id, journeyData);

      default:
        throw new Error('Data source not initialized');
    }
  }

  async updateJourneyStatus(id, status) {
    await this.initialize();

    switch (this.source) {
      case DATA_SOURCES.API:
        return this.apiClient.updateJourneyStatus(id, status);

      case DATA_SOURCES.AIRTABLE:
        const record = await this.airtableClient.updateJourneyStatus(id, status);
        return this.transformAirtableJourney(record);

      case DATA_SOURCES.LOCAL:
        return updateLocalJourney(id, { status });

      default:
        throw new Error('Data source not initialized');
    }
  }

  async deleteJourney(id) {
    await this.initialize();

    switch (this.source) {
      case DATA_SOURCES.API:
        return this.apiClient.deleteJourney(id);

      case DATA_SOURCES.AIRTABLE:
        return this.airtableClient.deleteRecord('Journeys', id);

      case DATA_SOURCES.LOCAL:
        return deleteLocalJourney(id);

      default:
        throw new Error('Data source not initialized');
    }
  }

  async duplicateJourney(id, name) {
    await this.initialize();

    switch (this.source) {
      case DATA_SOURCES.API:
        return this.apiClient.duplicateJourney(id, name);

      case DATA_SOURCES.AIRTABLE:
        // Get original journey
        const original = await this.getJourney(id);
        // Create new with copied data
        return this.createJourney({
          ...original,
          name: name || `${original.name} (Copy)`,
          status: 'Draft'
        });

      case DATA_SOURCES.LOCAL:
        const localOriginal = await getLocalJourney(id);
        return createLocalJourney({
          ...localOriginal,
          name: name || `${localOriginal.name} (Copy)`
        });

      default:
        throw new Error('Data source not initialized');
    }
  }

  // ==================== TOUCHPOINTS ====================

  async getTouchpoints(journeyId) {
    await this.initialize();

    switch (this.source) {
      case DATA_SOURCES.API:
        return this.apiClient.getTouchpoints(journeyId);

      case DATA_SOURCES.AIRTABLE:
        const records = await this.airtableClient.getTouchpoints(journeyId);
        return records.map(r => this.transformAirtableTouchpoint(r));

      case DATA_SOURCES.LOCAL:
        const journey = await getLocalJourney(journeyId);
        return journey?.touchpoints || [];

      default:
        throw new Error('Data source not initialized');
    }
  }

  async createTouchpoint(touchpointData) {
    await this.initialize();

    switch (this.source) {
      case DATA_SOURCES.API:
        return this.apiClient.createTouchpoint(touchpointData);

      case DATA_SOURCES.AIRTABLE:
        const record = await this.airtableClient.createTouchpoint(touchpointData);
        return this.transformAirtableTouchpoint(record);

      case DATA_SOURCES.LOCAL:
        // Local mode doesn't support creating touchpoints
        console.warn('[DataService] Create touchpoint not supported in local mode');
        return touchpointData;

      default:
        throw new Error('Data source not initialized');
    }
  }

  async updateTouchpoint(id, touchpointData) {
    await this.initialize();

    switch (this.source) {
      case DATA_SOURCES.API:
        return this.apiClient.updateTouchpoint(id, touchpointData);

      case DATA_SOURCES.AIRTABLE:
        const record = await this.airtableClient.updateTouchpoint(id, touchpointData);
        return this.transformAirtableTouchpoint(record);

      case DATA_SOURCES.LOCAL:
        console.warn('[DataService] Update touchpoint not supported in local mode');
        return touchpointData;

      default:
        throw new Error('Data source not initialized');
    }
  }

  async deleteTouchpoint(id) {
    await this.initialize();

    switch (this.source) {
      case DATA_SOURCES.API:
        return this.apiClient.deleteTouchpoint(id);

      case DATA_SOURCES.AIRTABLE:
        return this.airtableClient.deleteTouchpoint(id);

      case DATA_SOURCES.LOCAL:
        console.warn('[DataService] Delete touchpoint not supported in local mode');
        return true;

      default:
        throw new Error('Data source not initialized');
    }
  }

  // ==================== TEMPLATES ====================

  async getTemplates(options = {}) {
    await this.initialize();

    switch (this.source) {
      case DATA_SOURCES.API:
        return this.apiClient.getTemplates(options);

      case DATA_SOURCES.AIRTABLE:
        // Airtable doesn't have a direct templates table in the schema
        console.warn('[DataService] Templates not available in Airtable mode');
        return [];

      case DATA_SOURCES.LOCAL:
        return [];

      default:
        throw new Error('Data source not initialized');
    }
  }

  // ==================== TRANSFORMERS ====================

  /**
   * Transform Airtable journey record to standard format
   */
  transformAirtableJourney(record) {
    return {
      id: record.id,
      name: record.fields.Name || record.fields['Journey Name'],
      description: record.fields.Description || '',
      status: (record.fields.Status || 'Draft').toLowerCase().replace(' ', '_'),
      clientId: record.fields.Client?.[0],
      client: record.fields.Client?.[0],
      category: record.fields.Type?.toLowerCase() || 'nurture',
      version: record.fields.Version || 1,
      pipelineId: record.fields.Pipeline?.[0],
      ghlWorkflowId: record.fields['GHL Workflow ID'],
      syncStatus: record.fields['Sync Status'],
      lastSync: record.fields['Last Sync'],
      touchpoints: [] // Loaded separately
    };
  }

  /**
   * Transform Airtable touchpoint record to standard format
   */
  transformAirtableTouchpoint(record) {
    const content = record.fields.Content 
      ? JSON.parse(record.fields.Content) 
      : {};

    return {
      id: record.id,
      name: record.fields.Name,
      type: record.fields.Type || 'Email',
      order: record.fields.Order || 0,
      journeyId: record.fields.Journey?.[0],
      content: {
        subject: content.subject || '',
        greeting: content.greeting || '',
        body: content.body || '',
        cta: content.cta || null,
        templateType: content.templateType || ''
      },
      config: {
        delay: record.fields.Delay || 0,
        delayUnit: record.fields['Delay Unit'] || 'hours',
        condition: record.fields.Condition || '',
        assignee: record.fields.Assignee || '',
        dueIn: record.fields['Due In'] || 24
      },
      position: {
        x: record.fields.PositionX || 0,
        y: record.fields.PositionY || 0
      },
      nextTouchpointId: record.fields['Next Touchpoint']?.[0] || null
    };
  }
}

// Singleton instance
let dataServiceInstance = null;

export function getDataService(source) {
  if (!dataServiceInstance) {
    dataServiceInstance = new DataService(source);
  }
  return dataServiceInstance;
}

export function createDataService(source) {
  return new DataService(source);
}

export default getDataService;