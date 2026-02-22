/**
 * PostgreSQL API Client Service
 * Handles CRUD operations via the Journey REST API
 * Replaces direct Airtable integration
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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

    const response = await this.client.get(`/clients?${params}`);
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

  /**
   * Journeys
   */
  async getJourneys(options = {}) {
    const { clientId, status, category, search } = options;
    const params = new URLSearchParams();
    if (clientId) params.append('clientId', clientId);
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
    const response = await this.client.get(`/touchpoints?journeyId=${journeyId}`);
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