/**
 * Webhook Manager Component
 * P1 Q3 2026 - Real-time sync with GoHighLevel webhooks
 * 
 * Provides UI for:
 * - Managing webhook configurations
 * - Viewing webhook delivery logs
 * - Monitoring webhook statistics
 * - Testing webhooks
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  RefreshCw, 
  Plus, 
  Settings, 
  Eye, 
  EyeOff, 
  Trash2, 
  Edit2, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Copy,
  Play,
  Pause,
  RotateCcw,
  Webhook,
  Activity,
  Clock,
  CheckSquare,
  Server
} from 'lucide-react';
import { getApiClient } from '../services/apiClient';
const apiClient = getApiClient().client;
import './WebhookManager.css';

const WebhookManager = ({ clientId, clientName }) => {
  // State
  const [configs, setConfigs] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [stats, setStats] = useState(null);
  const [eventTypes, setEventTypes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('configs');
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [newSecret, setNewSecret] = useState('');
  const [testPayload, setTestPayload] = useState('');
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState('ContactCreate');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    webhookUrl: '',
    secretKey: '',
    subscribedEvents: [],
    status: 'active',
    maxRetries: 3,
    retryDelayMs: 5000,
    rateLimitPerMinute: 100
  });

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!clientId) return;
    
    setLoading(true);
    try {
      const [configsRes, statsRes, eventTypesRes] = await Promise.all([
        apiClient.get(`/webhooks/configs?clientId=${clientId}`),
        apiClient.get(`/webhooks/stats/${clientId}?period=24h`),
        apiClient.get('/webhooks/event-types')
      ]);
      
      setConfigs(configsRes.data || []);
      setStats(statsRes.data);
      setEventTypes(eventTypesRes.data || {});
      
      // Fetch recent deliveries
      const deliveriesRes = await apiClient.get(`/webhooks/deliveries?clientId=${clientId}&limit=20`);
      setDeliveries(deliveriesRes.data?.data || []);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching webhook data:', err);
      setError('Failed to load webhook data');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handleCreateConfig = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/webhooks/configs', {
        ...formData,
        clientId
      });
      setShowConfigModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      alert('Failed to create webhook config: ' + err.message);
    }
  };

  const handleUpdateConfig = async (e) => {
    e.preventDefault();
    try {
      await apiClient.put(`/webhooks/configs/${selectedConfig.id}`, formData);
      setShowConfigModal(false);
      setSelectedConfig(null);
      resetForm();
      fetchData();
    } catch (err) {
      alert('Failed to update webhook config: ' + err.message);
    }
  };

  const handleDeleteConfig = async (configId) => {
    if (!confirm('Are you sure you want to delete this webhook configuration?')) return;
    
    try {
      await apiClient.delete(`/webhooks/configs/${configId}`);
      fetchData();
    } catch (err) {
      alert('Failed to delete webhook config: ' + err.message);
    }
  };

  const handleToggleStatus = async (configId) => {
    try {
      await apiClient.post(`/webhooks/configs/${configId}/toggle`);
      fetchData();
    } catch (err) {
      alert('Failed to toggle webhook status: ' + err.message);
    }
  };

  const handleRegenerateSecret = async (configId) => {
    try {
      const response = await apiClient.post(`/webhooks/configs/${configId}/regenerate-secret`);
      setNewSecret(response.data.secretKey);
      setShowSecretModal(true);
      fetchData();
    } catch (err) {
      alert('Failed to regenerate secret: ' + err.message);
    }
  };

  const handleTestWebhook = async (e) => {
    e.preventDefault();
    try {
      const payload = JSON.parse(testPayload);
      const response = await apiClient.post(`/webhooks/test/${clientId}`, {
        eventType: selectedEventType,
        payload
      });
      alert('Test webhook sent successfully!\n\n' + JSON.stringify(response.data, null, 2));
      setShowTestModal(false);
    } catch (err) {
      alert('Failed to test webhook: ' + err.message);
    }
  };

  const handleRetryDelivery = async (deliveryId) => {
    try {
      await apiClient.post(`/webhooks/deliveries/${deliveryId}/retry`);
      fetchData();
    } catch (err) {
      alert('Failed to retry delivery: ' + err.message);
    }
  };

  // Helper functions
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      webhookUrl: '',
      secretKey: '',
      subscribedEvents: [],
      status: 'active',
      maxRetries: 3,
      retryDelayMs: 5000,
      rateLimitPerMinute: 100
    });
  };

  const openEditModal = (config) => {
    setSelectedConfig(config);
    setFormData({
      name: config.name,
      description: config.description || '',
      webhookUrl: config.webhookUrl,
      secretKey: '', // Don't populate secret
      subscribedEvents: config.subscribedEvents || [],
      status: config.status,
      maxRetries: config.maxRetries,
      retryDelayMs: config.retryDelayMs,
      rateLimitPerMinute: config.rateLimitPerMinute
    });
    setShowConfigModal(true);
  };

  const openCreateModal = () => {
    setSelectedConfig(null);
    resetForm();
    setShowConfigModal(true);
  };

  const openTestModal = () => {
    setTestPayload(JSON.stringify({
      contact: {
        id: 'test-contact-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '+1234567890'
      }
    }, null, 2));
    setShowTestModal(true);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const toggleEventSubscription = (eventType) => {
    const current = formData.subscribedEvents;
    if (current.includes(eventType)) {
      setFormData({
        ...formData,
        subscribedEvents: current.filter(e => e !== eventType)
      });
    } else {
      setFormData({
        ...formData,
        subscribedEvents: [...current, eventType]
      });
    }
  };

  // Render helpers
  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="status-icon active" />;
      case 'paused':
        return <Pause className="status-icon paused" />;
      case 'disabled':
        return <XCircle className="status-icon disabled" />;
      case 'completed':
        return <CheckCircle className="status-icon success" />;
      case 'failed':
        return <XCircle className="status-icon error" />;
      case 'pending':
      case 'processing':
        return <Clock className="status-icon pending" />;
      default:
        return <AlertCircle className="status-icon" />;
    }
  };

  const getWebhookUrl = (configId) => {
    const baseUrl = window.location.origin.replace('3000', '8080');
    return `${baseUrl}/api/webhooks/ghl/${clientId}`;
  };

  if (loading) {
    return (
      <div className="webhook-manager loading">
        <RefreshCw className="spinner" />
        <p>Loading webhook configuration...</p>
      </div>
    );
  }

  return (
    <div className="webhook-manager">
      {/* Header */}
      <div className="webhook-header">
        <div className="header-title">
          <Webhook className="header-icon" />
          <div>
            <h2>Webhook Management</h2>
            <p className="subtitle">{clientName || 'Client'} - Real-time sync with GoHighLevel</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={fetchData}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="btn-primary" onClick={openCreateModal}>
            <Plus size={16} />
            Add Webhook
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon total">
              <Activity size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Total Deliveries (24h)</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon success">
              <CheckSquare size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.successful}</span>
              <span className="stat-label">Successful</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon error">
              <AlertCircle size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.failed}</span>
              <span className="stat-label">Failed</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon info">
              <Server size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.successRate}%</span>
              <span className="stat-label">Success Rate</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'configs' ? 'active' : ''}`}
          onClick={() => setActiveTab('configs')}
        >
          <Settings size={16} />
          Configurations
        </button>
        <button
          className={`tab ${activeTab === 'deliveries' ? 'active' : ''}`}
          onClick={() => setActiveTab('deliveries')}
        >
          <Activity size={16} />
          Delivery Logs
        </button>
      </div>

      {/* Configurations Tab */}
      {activeTab === 'configs' && (
        <div className="configs-section">
          {configs.length === 0 ? (
            <div className="empty-state">
              <Webhook size={48} />
              <h3>No webhook configurations</h3>
              <p>Create a webhook configuration to start receiving real-time events from GoHighLevel.</p>
              <button className="btn-primary" onClick={openCreateModal}>
                <Plus size={16} />
                Create Webhook
              </button>
            </div>
          ) : (
            <div className="configs-list">
              {configs.map(config => (
                <div key={config.id} className={`config-card ${config.status}`}>
                  <div className="config-header">
                    <div className="config-title">
                      {getStatusIcon(config.status)}
                      <div>
                        <h4>{config.name}</h4>
                        <span className="config-status">{config.status}</span>
                      </div>
                    </div>
                    <div className="config-actions">
                      <button
                        className="btn-icon"
                        onClick={() => handleToggleStatus(config.id)}
                        title={config.status === 'active' ? 'Pause' : 'Activate'}
                      >
                        {config.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => openEditModal(config)}
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn-icon danger"
                        onClick={() => handleDeleteConfig(config.id)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="config-details">
                    <div className="detail-row">
                      <span className="detail-label">Webhook URL:</span>
                      <div className="detail-value url-with-copy">
                        <code>{getWebhookUrl(config.id)}</code>
                        <button 
                          className="btn-icon small"
                          onClick={() => copyToClipboard(getWebhookUrl(config.id))}
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                    
                    {config.description && (
                      <div className="detail-row">
                        <span className="detail-label">Description:</span>
                        <span className="detail-value">{config.description}</span>
                      </div>
                    )}
                    
                    <div className="detail-row">
                      <span className="detail-label">Subscribed Events:</span>
                      <span className="detail-value">
                        {(config.subscribedEvents || []).length > 0 
                          ? config.subscribedEvents.join(', ')
                          : 'All events'
                        }
                      </span>
                    </div>
                    
                    <div className="detail-row">
                      <span className="detail-label">Total Deliveries:</span>
                      <span className="detail-value">{config._count?.deliveries || 0}</span>
                    </div>
                    
                    <div className="detail-row">
                      <span className="detail-label">Secret Key:</span>
                      <div className="detail-value secret-row">
                        <code>{config.secretKey}</code>
                        <button
                          className="btn-secondary small"
                          onClick={() => handleRegenerateSecret(config.id)}
                        >
                          Regenerate
                        </button>
                      </div>
                    </div>
                    
                    {config.lastSuccessAt && (
                      <div className="detail-row">
                        <span className="detail-label">Last Success:</span>
                        <span className="detail-value">
                          {new Date(config.lastSuccessAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Deliveries Tab */}
      {activeTab === 'deliveries' && (
        <div className="deliveries-section">
          <div className="section-header">
            <h3>Recent Deliveries</h3>
            <button className="btn-secondary" onClick={openTestModal}>
              <Play size={16} />
              Test Webhook
            </button>
          </div>
          
          {deliveries.length === 0 ? (
            <div className="empty-state">
              <Activity size={48} />
              <h3>No deliveries yet</h3>
              <p>Webhook deliveries will appear here once events are received.</p>
            </div>
          ) : (
            <div className="deliveries-table-wrapper">
              <table className="deliveries-table">
                <thead>
                  <tr>
                    <th>Event Type</th>
                    <th>Status</th>
                    <th>Time</th>
                    <th>Processing Time</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map(delivery => (
                    <tr key={delivery.id} className={delivery.status}>
                      <td>
                        <span className="event-type">{delivery.eventType}</span>
                      </td>
                      <td>
                        <span className={`status-badge ${delivery.status}`}>
                          {getStatusIcon(delivery.status)}
                          {delivery.status}
                        </span>
                      </td>
                      <td>{new Date(delivery.createdAt).toLocaleString()}</td>
                      <td>
                        {delivery.processingTimeMs 
                          ? `${delivery.processingTimeMs}ms`
                          : '-'
                        }
                      </td>
                      <td>
                        {delivery.status === 'failed' && (
                          <button
                            className="btn-icon"
                            onClick={() => handleRetryDelivery(delivery.id)}
                            title="Retry"
                          >
                            <RotateCcw size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Config Modal */}
      {showConfigModal && (
        <div className="modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedConfig ? 'Edit Webhook' : 'Create Webhook'}</h3>
              <button className="btn-close" onClick={() => setShowConfigModal(false)}>×</button>
            </div>
            
            <form onSubmit={selectedConfig ? handleUpdateConfig : handleCreateConfig}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                  placeholder="e.g., Production Webhook"
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Brief description of this webhook"
                  rows={2}
                />
              </div>
              
              <div className="form-group">
                <label>Secret Key {!selectedConfig && '*'}</label>
                <input
                  type="password"
                  value={formData.secretKey}
                  onChange={e => setFormData({...formData, secretKey: e.target.value})}
                  required={!selectedConfig}
                  placeholder={selectedConfig ? 'Leave blank to keep current' : 'Enter secret key'}
                />
                <small>Used to verify webhook signatures from GoHighLevel</small>
              </div>
              
              <div className="form-group">
                <label>Subscribed Events</label>
                <div className="event-checkboxes">
                  {Object.entries(eventTypes.eventTypes || {}).map(([key, value]) => (
                    <label key={key} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.subscribedEvents.includes(value)}
                        onChange={() => toggleEventSubscription(value)}
                      />
                      <span>{value}</span>
                    </label>
                  ))}
                </div>
                <small>Leave empty to subscribe to all events</small>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Max Retries</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={formData.maxRetries}
                    onChange={e => setFormData({...formData, maxRetries: parseInt(e.target.value)})}
                  />
                </div>
                
                <div className="form-group">
                  <label>Retry Delay (ms)</label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={formData.retryDelayMs}
                    onChange={e => setFormData({...formData, retryDelayMs: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Rate Limit (per minute)</label>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={formData.rateLimitPerMinute}
                  onChange={e => setFormData({...formData, rateLimitPerMinute: parseInt(e.target.value)})}
                />
              </div>
              
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowConfigModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {selectedConfig ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Secret Modal */}
      {showSecretModal && (
        <div className="modal-overlay" onClick={() => setShowSecretModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Secret Key Generated</h3>
              <button className="btn-close" onClick={() => setShowSecretModal(false)}>×</button>
            </div>
            
            <div className="modal-content">
              <div className="alert alert-warning">
                <AlertCircle size={20} />
                <p>Store this secret securely. It will not be shown again.</p>
              </div>
              
              <div className="secret-display">
                <code>{newSecret}</code>
                <button
                  className="btn-secondary"
                  onClick={() => copyToClipboard(newSecret)}
                >
                  <Copy size={16} />
                  Copy
                </button>
              </div>
            </div>
            
            <div className="modal-actions">
              <button className="btn-primary" onClick={() => setShowSecretModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Modal */}
      {showTestModal && (
        <div className="modal-overlay" onClick={() => setShowTestModal(false)}>
          <div className="modal large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Test Webhook</h3>
              <button className="btn-close" onClick={() => setShowTestModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleTestWebhook}>
              <div className="form-group">
                <label>Event Type</label>
                <select
                  value={selectedEventType}
                  onChange={e => setSelectedEventType(e.target.value)}
                >
                  {Object.entries(eventTypes.eventTypes || {}).map(([key, value]) => (
                    <option key={key} value={value}>{value}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Payload (JSON)</label>
                <textarea
                  value={testPayload}
                  onChange={e => setTestPayload(e.target.value)}
                  rows={15}
                  className="code-editor"
                  placeholder="Enter JSON payload"
                />
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowTestModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <Play size={16} />
                  Send Test
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebhookManager;