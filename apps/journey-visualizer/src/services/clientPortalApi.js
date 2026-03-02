/**
 * Client Portal API Client
 * Handles all API calls for the client self-service portal
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://bloom-backend.zeabur.app/api';

/**
 * ClientPortalApi class for interacting with the client portal API
 */
export class ClientPortalApi {
  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/portal`,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor for auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('client_portal_token');
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
          // Handle unauthorized - clear token and redirect to login
          localStorage.removeItem('client_portal_token');
          localStorage.removeItem('client_portal_user');
          window.location.href = '/portal/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // ============================================
  // Authentication
  // ============================================

  async login(email, password, clientSlug) {
    const response = await this.client.post('/auth/login', { email, password, clientSlug });
    const { token, user } = response.data;
    localStorage.setItem('client_portal_token', token);
    localStorage.setItem('client_portal_user', JSON.stringify(user));
    return { token, user };
  }

  async logout() {
    try {
      await this.client.post('/auth/logout');
    } finally {
      localStorage.removeItem('client_portal_token');
      localStorage.removeItem('client_portal_user');
    }
  }

  async getCurrentUser() {
    const response = await this.client.get('/auth/me');
    return response.data.user;
  }

  isAuthenticated() {
    return !!localStorage.getItem('client_portal_token');
  }

  getStoredUser() {
    const user = localStorage.getItem('client_portal_user');
    return user ? JSON.parse(user) : null;
  }

  // ============================================
  // Client Info
  // ============================================

  async getClientInfo() {
    const response = await this.client.get('/client');
    return response.data;
  }

  // ============================================
  // Journeys
  // ============================================

  async getJourneys(options = {}) {
    const { status } = options;
    const params = new URLSearchParams();
    if (status) params.append('status', status);

    const response = await this.client.get(`/journeys?${params}`);
    return response.data;
  }

  async getJourney(id) {
    const response = await this.client.get(`/journeys/${id}`);
    return response.data;
  }

  // ============================================
  // Change Requests
  // ============================================

  async getChangeRequests(options = {}) {
    const { status, journeyId } = options;
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (journeyId) params.append('journeyId', journeyId);

    const response = await this.client.get(`/change-requests?${params}`);
    return response.data;
  }

  async getChangeRequest(id) {
    const response = await this.client.get(`/change-requests/${id}`);
    return response.data;
  }

  async createChangeRequest(data) {
    const response = await this.client.post('/change-requests', data);
    return response.data;
  }

  async addComment(changeRequestId, text) {
    const response = await this.client.post(`/change-requests/${changeRequestId}/comments`, { text });
    return response.data;
  }

  async cancelChangeRequest(changeRequestId) {
    const response = await this.client.put(`/change-requests/${changeRequestId}/cancel`);
    return response.data;
  }

  // ============================================
  // Analytics
  // ============================================

  async getAnalyticsDashboard(days = 30) {
    const response = await this.client.get(`/analytics/dashboard?days=${days}`);
    return response.data;
  }

  async getJourneyAnalytics(journeyId, days = 30) {
    const response = await this.client.get(`/analytics/journeys/${journeyId}?days=${days}`);
    return response.data;
  }

  // ============================================
  // Brand Voice
  // ============================================

  async getBrandVoiceSettings() {
    const response = await this.client.get('/brand-voice');
    return response.data;
  }

  async updateBrandVoiceSettings(settings) {
    const response = await this.client.put('/brand-voice', settings);
    return response.data;
  }

  // ============================================
  // Assets
  // ============================================

  async getAssets(options = {}) {
    const { type, category } = options;
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (category) params.append('category', category);

    const response = await this.client.get(`/assets?${params}`);
    return response.data;
  }

  async getAsset(id) {
    const response = await this.client.get(`/assets/${id}`);
    return response.data;
  }

  async createAsset(assetData) {
    const response = await this.client.post('/assets', assetData);
    return response.data;
  }

  async updateAsset(id, assetData) {
    const response = await this.client.put(`/assets/${id}`, assetData);
    return response.data;
  }

  async deleteAsset(id) {
    await this.client.delete(`/assets/${id}`);
  }
}

// Singleton instance
let clientPortalApiInstance = null;

export function getClientPortalApi() {
  if (!clientPortalApiInstance) {
    clientPortalApiInstance = new ClientPortalApi();
  }
  return clientPortalApiInstance;
}

export default getClientPortalApi;