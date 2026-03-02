/**
 * Unified Data Service
 * Provides a single interface for all data operations
 * Uses PostgreSQL API exclusively (Airtable migration completed)
 */

import { getApiClient } from './apiClient';
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
  API: 'api',           // PostgreSQL REST API (default)
  LOCAL: 'local'        // Local JSON files (fallback only)
};

// Get data source from environment
const DEFAULT_DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || DATA_SOURCES.API;

/**
 * Unified Data Service class
 * PostgreSQL-only after Airtable-to-Postgres migration (P0 Q3 2026)
 */
class DataService {
  constructor(source = DEFAULT_DATA_SOURCE) {
    this.source = source;
    this.apiClient = null;
    this.initialized = false;
  }

  /**
   * Initialize the data service
   */
  async initialize() {
    if (this.initialized) return;

    console.log('[DataService] Initializing with source:', this.source);

    switch (this.source) {
      case DATA_SOURCES.API:
        this.apiClient = getApiClient();
        // Test connection
        try {
          console.log('[DataService] Testing API connection...');
          await this.apiClient.healthCheck();
          console.log('[DataService] Connected to PostgreSQL API');
        } catch (error) {
          console.warn('[DataService] API connection failed, falling back to local mode', error.message);
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

      case DATA_SOURCES.LOCAL:
        return [];

      default:
        throw new Error('Data source not initialized');
    }
  }

  // ==================== APPROVALS ====================

  async getApprovals(journeyId) {
    await this.initialize();

    switch (this.source) {
      case DATA_SOURCES.API:
        return this.apiClient.getApprovals(journeyId);

      default:
        console.warn('[DataService] Approvals not supported in local mode');
        return [];
    }
  }

  async requestApproval(journeyId, comments) {
    await this.initialize();

    switch (this.source) {
      case DATA_SOURCES.API:
        return this.apiClient.requestApproval(journeyId, comments);

      default:
        console.warn('[DataService] Request approval not supported in local mode');
        return null;
    }
  }

  async approveJourney(journeyId, comments) {
    await this.initialize();

    switch (this.source) {
      case DATA_SOURCES.API:
        return this.apiClient.approveJourney(journeyId, comments);

      default:
        console.warn('[DataService] Approve journey not supported in local mode');
        return null;
    }
  }

  async rejectJourney(journeyId, comments) {
    await this.initialize();

    switch (this.source) {
      case DATA_SOURCES.API:
        return this.apiClient.rejectJourney(journeyId, comments);

      default:
        console.warn('[DataService] Reject journey not supported in local mode');
        return null;
    }
  }

  // ==================== ANALYTICS ====================

  async getJourneyAnalytics(journeyId, options = {}) {
    await this.initialize();

    switch (this.source) {
      case DATA_SOURCES.API:
        return this.apiClient.getJourneyAnalytics(journeyId, options);

      default:
        console.warn('[DataService] Analytics not supported in local mode');
        return null;
    }
  }

  async getClientAnalytics(clientId, options = {}) {
    await this.initialize();

    switch (this.source) {
      case DATA_SOURCES.API:
        return this.apiClient.getClientAnalytics(clientId, options);

      default:
        console.warn('[DataService] Analytics not supported in local mode');
        return null;
    }
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