/**
 * PostgreSQL API Client Service
 * Handles CRUD operations via the Journey REST API
 * Replaces direct Airtable integration
 */

import axios from 'axios';

// Use production API URL by default, fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://bloom-backend.zeabur.app/api';

/**
 * Custom error class for 409 Conflict responses
 */
export class ConflictError extends Error {
  constructor(message, serverData, currentVersion, submittedVersion) {
    super(message);
    this.name = 'ConflictError';
    this.serverData = serverData;
    this.currentVersion = currentVersion;
    this.submittedVersion = submittedVersion;
    this.statusCode = 409;
  }
}

/**
 * ApiClient class for interacting with the PostgreSQL REST API
 */
export class ApiClient {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor for auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - redirect to login
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Authentication
   */
  async login(email, name) {
    const response = await this.client.post('/auth/login', { email, name });
    const { token, user } = response.data;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    return { token, user };
  }

  async getCurrentUser() {
    const response = await this.client.get('/auth/me');
    return response.data.user;
  }

  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  }

  /**
   * Clients
   */
  async getClients(options = {}) {
    const { status, search } = options;
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);

    const queryString = params.toString();
    const endpoint = queryString ? `/clients?${queryString}` : '/clients';
    
    const response = await this.client.get(endpoint);
    return response.data;
  }

  async getClient(slug) {
    const response = await this.client.get(`/clients/${slug}`);
    return response.data;
  }

  async createClient(clientData) {
    const response = await this.client.post('/clients', clientData);
    return response.data;
  }

  async updateClient(id, clientData) {
    const response = await this.client.put(`/clients/${id}`, clientData);
    return response.data;
  }

  async deleteClient(id) {
    await this.client.delete(`/clients/${id}`);
  }

  async getClientStats(id) {
    const response = await this.client.get(`/clients/${id}/stats`);
    return response.data;
  }

  async getClientsHealth() {
    const response = await this.client.get('/clients/health/all');
    return response.data;
  }

  async getClientHealth(id) {
    const response = await this.client.get(`/clients/${id}/health`);
    return response.data;
  }

  async bulkClientAction(clientIds, action, filters) {
    const response = await this.client.post('/clients/bulk-action', {
      clientIds,
      action,
      filters
    });
    return response.data;
  }

  async bulkJourneyStatusUpdate(journeyIds, status) {
    const response = await this.client.post('/clients/journeys/bulk-status', {
      journeyIds,
      status
    });
    return response.data;
  }

  /**
   * Journeys
   */
  async getJourneys(options = {}) {
    const { clientId, status, category, search } = options;
    const params = new URLSearchParams();
    
    // Determine if clientId is a slug (non-UUID) or UUID
    if (clientId) {
      // Check if it's a UUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(clientId)) {
        params.append('clientId', clientId);
      } else {
        // It's a slug, use clientSlug parameter
        params.append('clientSlug', clientId);
      }
    }
    if (status) params.append('status', status);
    if (category) params.append('category', category);
    if (search) params.append('search', search);

    const response = await this.client.get(`/journeys?${params}`);
    return response.data;
  }

  async getJourney(id) {
    const response = await this.client.get(`/journeys/${id}`);
    return response.data;
  }

  async createJourney(journeyData) {
    const response = await this.client.post('/journeys', journeyData);
    return response.data;
  }

  async updateJourney(id, journeyData) {
    try {
      const response = await this.client.put(`/journeys/${id}`, journeyData);
      return response.data;
    } catch (error) {
      // Handle 409 Conflict for optimistic locking
      if (error.response?.status === 409) {
        const { currentVersion, submittedVersion, journey } = error.response.data;
        throw new ConflictError(
          'The journey has been modified by another user. Please review the changes and try again.',
          journey,
          currentVersion,
          submittedVersion
        );
      }
      throw error;
    }
  }

  async updateJourneyStatus(id, status) {
    const response = await this.client.put(`/journeys/${id}/status`, { status });
    return response.data;
  }

  async duplicateJourney(id, name) {
    const response = await this.client.post(`/journeys/${id}/duplicate`, { name });
    return response.data;
  }

  async deleteJourney(id) {
    await this.client.delete(`/journeys/${id}`);
  }

  async getJourneyVersions(id) {
    const response = await this.client.get(`/journeys/${id}/versions`);
    return response.data;
  }

  async createJourneyVersion(id, data) {
    const response = await this.client.post(`/journeys/${id}/versions`, data);
    return response.data;
  }

  /**
   * Touchpoints
   */
  async getTouchpoints(journeyId) {
    // Only include journeyId if it's defined
    const params = journeyId ? `?journeyId=${journeyId}` : '';
    const response = await this.client.get(`/touchpoints${params}`);
    return response.data;
  }

  async getTouchpoint(id) {
    const response = await this.client.get(`/touchpoints/${id}`);
    return response.data;
  }

  async createTouchpoint(touchpointData) {
    const response = await this.client.post('/touchpoints', touchpointData);
    return response.data;
  }

  async updateTouchpoint(id, touchpointData) {
    const response = await this.client.put(`/touchpoints/${id}`, touchpointData);
    return response.data;
  }

  async reorderTouchpoints(orders) {
    // orders: [{ id, orderIndex }, ...]
    const response = await this.client.put('/touchpoints/reorder', { items: orders });
    return response.data;
  }

  async deleteTouchpoint(id) {
    await this.client.delete(`/touchpoints/${id}`);
  }

  async publishTouchpoint(id) {
    const response = await this.client.post(`/touchpoints/${id}/publish`);
    return response.data;
  }

  /**
   * Templates
   */
  async getTemplates(options = {}) {
    const { clientId, type, search } = options;
    const params = new URLSearchParams();
    if (clientId) params.append('clientId', clientId);
    if (type) params.append('type', type);
    if (search) params.append('search', search);

    const response = await this.client.get(`/templates?${params}`);
    return response.data;
  }

  async getTemplate(id) {
    const response = await this.client.get(`/templates/${id}`);
    return response.data;
  }

  async createTemplate(templateData) {
    const response = await this.client.post('/templates', templateData);
    return response.data;
  }

  async updateTemplate(id, templateData) {
    const response = await this.client.put(`/templates/${id}`, templateData);
    return response.data;
  }

  async syncTemplateToGHL(id) {
    const response = await this.client.post(`/templates/${id}/sync-to-ghl`);
    return response.data;
  }

  async deleteTemplate(id) {
    await this.client.delete(`/templates/${id}`);
  }

  /**
   * Workflows
   */
  async getWorkflows(options = {}) {
    const { clientId, status, search } = options;
    const params = new URLSearchParams();
    if (clientId) params.append('clientId', clientId);
    if (status) params.append('status', status);
    if (search) params.append('search', search);

    const response = await this.client.get(`/workflows?${params}`);
    return response.data;
  }

  async getWorkflow(id) {
    const response = await this.client.get(`/workflows/${id}`);
    return response.data;
  }

  async createWorkflow(workflowData) {
    const response = await this.client.post('/workflows', workflowData);
    return response.data;
  }

  async updateWorkflow(id, workflowData) {
    const response = await this.client.put(`/workflows/${id}`, workflowData);
    return response.data;
  }

  async deleteWorkflow(id) {
    await this.client.delete(`/workflows/${id}`);
  }

  /**
   * Health check
   */
  async healthCheck() {
    const response = await this.client.get('/health');
    return response.data;
  }

  /**
   * Analytics - Advanced Journey Analytics (P1 Q2 2026)
   */
  async getAnalyticsDashboard(params = {}) {
    const { days, clientId, startDate, endDate } = params;
    const queryParams = new URLSearchParams();
    if (days) queryParams.append('days', days);
    if (clientId) queryParams.append('clientId', clientId);
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);

    const response = await this.client.get(`/analytics/dashboard?${queryParams}`);
    return response.data;
  }

  async getJourneyMetrics(journeyId, params = {}) {
    const { days, startDate, endDate } = params;
    const queryParams = new URLSearchParams();
    if (days) queryParams.append('days', days);
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);

    const response = await this.client.get(`/analytics/journeys/${journeyId}/metrics?${queryParams}`);
    return response.data;
  }

  async getJourneyPerformance(params = {}) {
    const { clientId, category, limit, days, startDate, endDate } = params;
    const queryParams = new URLSearchParams();
    if (clientId) queryParams.append('clientId', clientId);
    if (category) queryParams.append('category', category);
    if (limit) queryParams.append('limit', limit);
    if (days) queryParams.append('days', days);
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);

    const response = await this.client.get(`/analytics/journeys/performance?${queryParams}`);
    return response.data;
  }

  async getTouchpointEngagement(params = {}) {
    const { journeyId, clientId, type, days, startDate, endDate } = params;
    const queryParams = new URLSearchParams();
    if (journeyId) queryParams.append('journeyId', journeyId);
    if (clientId) queryParams.append('clientId', clientId);
    if (type) queryParams.append('type', type);
    if (days) queryParams.append('days', days);
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);

    const response = await this.client.get(`/analytics/touchpoints/engagement?${queryParams}`);
    return response.data;
  }

  async getABTests(params = {}) {
    const { journeyId, clientId, status, days, startDate, endDate } = params;
    const queryParams = new URLSearchParams();
    if (journeyId) queryParams.append('journeyId', journeyId);
    if (clientId) queryParams.append('clientId', clientId);
    if (status) queryParams.append('status', status);
    if (days) queryParams.append('days', days);
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);

    const response = await this.client.get(`/analytics/ab-tests?${queryParams}`);
    return response.data;
  }

  async getDropOffAnalysis(params = {}) {
    const { journeyId, clientId, days, startDate, endDate } = params;
    const queryParams = new URLSearchParams();
    if (journeyId) queryParams.append('journeyId', journeyId);
    if (clientId) queryParams.append('clientId', clientId);
    if (days) queryParams.append('days', days);
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);

    const response = await this.client.get(`/analytics/drop-offs?${queryParams}`);
    return response.data;
  }

  async getClientAnalyticsSummary(clientId, params = {}) {
    const { days, startDate, endDate } = params;
    const queryParams = new URLSearchParams();
    if (days) queryParams.append('days', days);
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);

    const response = await this.client.get(`/analytics/clients/${clientId}/summary?${queryParams}`);
    return response.data;
  }

  async getRealtimeAnalytics(params = {}) {
    const { clientId, journeyId } = params;
    const queryParams = new URLSearchParams();
    if (clientId) queryParams.append('clientId', clientId);
    if (journeyId) queryParams.append('journeyId', journeyId);

    const response = await this.client.get(`/analytics/realtime?${queryParams}`);
    return response.data;
  }

  async trackEvent(eventData) {
    const response = await this.client.post('/analytics/events', eventData);
    return response.data;
  }

  async trackEventsBatch(events) {
    const response = await this.client.post('/analytics/events/batch', { events });
    return response.data;
  }

  async getAnalyticsEvents(params = {}) {
    const { journeyId, touchpointId, clientId, eventType, contactId, limit, offset, days, startDate, endDate } = params;
    const queryParams = new URLSearchParams();
    if (journeyId) queryParams.append('journeyId', journeyId);
    if (touchpointId) queryParams.append('touchpointId', touchpointId);
    if (clientId) queryParams.append('clientId', clientId);
    if (eventType) queryParams.append('eventType', eventType);
    if (contactId) queryParams.append('contactId', contactId);
    if (limit) queryParams.append('limit', limit);
    if (offset) queryParams.append('offset', offset);
    if (days) queryParams.append('days', days);
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);

    const response = await this.client.get(`/analytics/events?${queryParams}`);
    return response.data;
  }

  /**
   * Field Mappings - Custom Field Mapping UI (P1 Q2 2026)
   */
  async getFieldMappings(clientId, options = {}) {
    const { targetSystem, isActive } = options;
    const params = new URLSearchParams();
    if (targetSystem) params.append('targetSystem', targetSystem);
    if (isActive !== undefined) params.append('isActive', isActive);

    const response = await this.client.get(`/clients/${clientId}/field-mappings?${params}`);
    return response.data;
  }

  async getFieldMapping(clientId, mappingId) {
    const response = await this.client.get(`/clients/${clientId}/field-mappings/${mappingId}`);
    return response.data;
  }

  async createFieldMapping(clientId, mappingData) {
    const response = await this.client.post(`/clients/${clientId}/field-mappings`, mappingData);
    return response.data;
  }

  async updateFieldMapping(clientId, mappingId, mappingData) {
    const response = await this.client.put(`/clients/${clientId}/field-mappings/${mappingId}`, mappingData);
    return response.data;
  }

  async deleteFieldMapping(clientId, mappingId) {
    await this.client.delete(`/clients/${clientId}/field-mappings/${mappingId}`);
  }

  async createBulkFieldMappings(clientId, mappings) {
    const response = await this.client.post(`/clients/${clientId}/field-mappings/bulk`, { mappings });
    return response.data;
  }

  async getFieldMappingMetadata() {
    const response = await this.client.get('/field-mappings/metadata');
    return response.data;
  }

  async validateFieldData(clientId, data) {
    const response = await this.client.post(`/clients/${clientId}/field-mappings/validate`, { data });
    return response.data;
  }

  async transformFieldData(clientId, data, targetSystem = 'gohighlevel') {
    const response = await this.client.post(`/clients/${clientId}/field-mappings/transform`, { data, targetSystem });
    return response.data;
  }

  async syncGhlFieldMappings(clientId, customFields) {
    const response = await this.client.post(`/clients/${clientId}/field-mappings/sync-ghl`, { customFields });
    return response.data;
  }

  /**
   * A/B Testing - P1 Q3 2026
   */
  async getABTestingDashboard(clientId, params = {}) {
    const { days } = params;
    const queryParams = new URLSearchParams();
    queryParams.append('clientId', clientId);
    if (days) queryParams.append('days', days);

    const response = await this.client.get(`/ab-testing/dashboard?${queryParams}`);
    return response.data;
  }

  async getABTests(clientId, params = {}) {
    const { journeyId, status, limit, offset } = params;
    const queryParams = new URLSearchParams();
    queryParams.append('clientId', clientId);
    if (journeyId) queryParams.append('journeyId', journeyId);
    if (status) queryParams.append('status', status);
    if (limit) queryParams.append('limit', limit);
    if (offset) queryParams.append('offset', offset);

    const response = await this.client.get(`/ab-testing/tests?${queryParams}`);
    return response.data;
  }

  async getABTest(testId) {
    const response = await this.client.get(`/ab-testing/tests/${testId}`);
    return response.data;
  }

  async createABTest(testData) {
    const response = await this.client.post('/ab-testing/tests', testData);
    return response.data;
  }

  async updateABTest(testId, testData) {
    const response = await this.client.put(`/ab-testing/tests/${testId}`, testData);
    return response.data;
  }

  async deleteABTest(testId) {
    await this.client.delete(`/ab-testing/tests/${testId}`);
  }

  async startABTest(testId) {
    const response = await this.client.post(`/ab-testing/tests/${testId}/start`);
    return response.data;
  }

  async pauseABTest(testId) {
    const response = await this.client.post(`/ab-testing/tests/${testId}/pause`);
    return response.data;
  }

  async stopABTest(testId, winnerVariantId = null) {
    const response = await this.client.post(`/ab-testing/tests/${testId}/stop`, {
      winnerVariantId
    });
    return response.data;
  }

  async getABTestResults(testId) {
    const response = await this.client.get(`/ab-testing/tests/${testId}/results`);
    return response.data;
  }

  async getABTestDailyStats(testId, params = {}) {
    const { days } = params;
    const queryParams = new URLSearchParams();
    if (days) queryParams.append('days', days);

    const response = await this.client.get(`/ab-testing/tests/${testId}/daily-stats?${queryParams}`);
    return response.data;
  }

  async getABTestParticipants(testId, params = {}) {
    const { limit, offset, variantId, converted } = params;
    const queryParams = new URLSearchParams();
    if (limit) queryParams.append('limit', limit);
    if (offset) queryParams.append('offset', offset);
    if (variantId) queryParams.append('variantId', variantId);
    if (converted !== undefined) queryParams.append('converted', converted);

    const response = await this.client.get(`/ab-testing/tests/${testId}/participants?${queryParams}`);
    return response.data;
  }

  async assignABTestParticipant(testId, contactId, sessionId = null, metadata = {}) {
    const response = await this.client.post(`/ab-testing/tests/${testId}/assign`, {
      contactId,
      sessionId,
      metadata
    });
    return response.data;
  }

  async recordABTestConversion(testId, contactId, eventData = {}) {
    const response = await this.client.post(`/ab-testing/tests/${testId}/convert`, {
      contactId,
      ...eventData
    });
    return response.data;
  }

  async recordABTestEvent(testId, contactId, eventType, eventData = {}) {
    const response = await this.client.post(`/ab-testing/tests/${testId}/events`, {
      contactId,
      eventType,
      eventData
    });
    return response.data;
  }

  async getActiveABTests(journeyId, clientId = null) {
    const queryParams = new URLSearchParams();
    queryParams.append('journeyId', journeyId);
    if (clientId) queryParams.append('clientId', clientId);

    const response = await this.client.get(`/ab-testing/active-tests?${queryParams}`);
    return response.data;
  }

  async getSampleSizeCalculator(params = {}) {
    const { baselineRate, minimumDetectableEffect, confidenceLevel, power } = params;
    const queryParams = new URLSearchParams();
    if (baselineRate) queryParams.append('baselineRate', baselineRate);
    if (minimumDetectableEffect) queryParams.append('minimumDetectableEffect', minimumDetectableEffect);
    if (confidenceLevel) queryParams.append('confidenceLevel', confidenceLevel);
    if (power) queryParams.append('power', power);

    const response = await this.client.get(`/ab-testing/sample-size-calculator?${queryParams}`);
    return response.data;
  }

  async autoCheckABTestWinner(testId) {
    const response = await this.client.post(`/ab-testing/tests/${testId}/auto-check`);
    return response.data;
  }

  async runAutoWinnerChecks() {
    const response = await this.client.post('/ab-testing/run-auto-checks');
    return response.data;
  }

  async updateVariantTraffic(variantId, trafficPercentage) {
    const response = await this.client.put(`/ab-testing/variants/${variantId}/traffic`, {
      trafficPercentage
    });
    return response.data;
  }
}

// Singleton instance
let apiClientInstance = null;

export function getApiClient() {
  if (!apiClientInstance) {
    apiClientInstance = new ApiClient();
  }
  return apiClientInstance;
}

// Export factory function
export function createApiClient() {
  return new ApiClient();
}

export default getApiClient;