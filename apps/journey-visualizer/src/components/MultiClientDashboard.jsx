/**
 * MultiClientDashboard Component - MVP
 * Comprehensive multi-client management with:
 * - Support for 50+ concurrent clients (performance optimized)
 * - Real-time status updates
 * - Client filtering and sorting
 * - Bulk actions (publish, pause journeys)
 * - Health monitoring dashboard
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isLocalMode, getLocalClients } from '../services/localJourneys';
import { getApiClient } from '../services/apiClient';
import { FieldMappingManager } from './FieldMappingManager';
import './MultiClientDashboard.css';

// Status badge colors and icons
const STATUS_CONFIG = {
  active: { color: 'green', icon: '✅', label: 'Active' },
  inactive: { color: 'gray', icon: '⏸️', label: 'Inactive' },
  onboarding: { color: 'blue', icon: '🚀', label: 'Onboarding' },
  archived: { color: 'red', icon: '📦', label: 'Archived' },
  error: { color: 'red', icon: '❌', label: 'Error' },
  warning: { color: 'yellow', icon: '⚠️', label: 'Warning' }
};

const HEALTH_STATUS_CONFIG = {
  healthy: { color: 'green', icon: '💚', label: 'Healthy' },
  warning: { color: 'yellow', icon: '💛', label: 'Warning' },
  error: { color: 'red', icon: '❤️', label: 'Error' },
  inactive: { color: 'gray', icon: '🩶', label: 'Inactive' }
};

// Default mock clients (fallback)
const MOCK_CLIENTS = [
  { id: 'maison-albion', name: 'Maison Albion', pipelines: 4, workflows: 48, status: 'active', industry: 'Winery', region: 'California' },
  { id: 'cameron-estate', name: 'Cameron Estate', pipelines: 3, workflows: 32, status: 'active', industry: 'Winery', region: 'California' },
  { id: 'maravilla-gardens', name: 'Maravilla Gardens', pipelines: 3, workflows: 36, status: 'active', industry: 'Winery', region: 'California' },
  { id: 'maui-pineapple-chapel', name: 'Maui Pineapple Chapel', pipelines: 2, workflows: 24, status: 'active', industry: 'Winery', region: 'Hawaii' },
  { id: 'promise-farm', name: 'Promise Farm', pipelines: 3, workflows: 28, status: 'active', industry: 'Wedding Venue', region: 'Virginia' }
];

// Generate additional mock clients for testing (50+ clients)
const generateMockClients = (count = 55) => {
  const regions = ['California', 'New York', 'Texas', 'Florida', 'Hawaii', 'Virginia', 'Oregon', 'Washington'];
  const industries = ['Winery', 'Wedding Venue', 'Event Space', 'Hotel', 'Restaurant'];
  const statuses = ['active', 'active', 'active', 'active', 'active', 'onboarding', 'inactive', 'warning'];
  
  const clients = [...MOCK_CLIENTS];
  
  for (let i = 5; i < count; i++) {
    const region = regions[Math.floor(Math.random() * regions.length)];
    const industry = industries[Math.floor(Math.random() * industries.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    clients.push({
      id: `client-${i}`,
      name: `Client ${i + 1} - ${industry} ${region}`,
      pipelines: Math.floor(Math.random() * 5) + 1,
      workflows: Math.floor(Math.random() * 40) + 10,
      status,
      industry,
      region,
      lastActivity: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString()
    });
  }
  
  return clients;
};

// Debounce hook for search
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
}

// Virtual list hook for performance with large lists
function useVirtualList(items, itemHeight, containerHeight, overscan = 5) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const virtualItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      ...item,
      index: startIndex + index,
      style: {
        position: 'absolute',
        top: (startIndex + index) * itemHeight,
        height: itemHeight,
        left: 0,
        right: 0
      }
    }));
  }, [items, scrollTop, itemHeight, containerHeight, overscan]);
  
  const totalHeight = items.length * itemHeight;
  
  return { virtualItems, totalHeight, setScrollTop };
}

export function MultiClientDashboard() {
  // State management
  const [clients, setClients] = useState([]);
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clientStats, setClientStats] = useState({});
  
  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // Bulk selection state
  const [selectedClients, setSelectedClients] = useState(new Set());
  const [bulkActionInProgress, setBulkActionInProgress] = useState(false);
  const [bulkActionResult, setBulkActionResult] = useState(null);
  
  // View state
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list', 'health'
  const [showHealthPanel, setShowHealthPanel] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  
  // Pagination for performance
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // Field Mapping Modal state
  const [showFieldMappingModal, setShowFieldMappingModal] = useState(false);
  const [selectedMappingClient, setSelectedMappingClient] = useState(null);
  
  const navigate = useNavigate();
  const usingLocalMode = isLocalMode();
  const debouncedSearch = useDebounce(searchQuery, 300);
  const refreshIntervalRef = useRef(null);

  // Load clients data
  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      
      if (usingLocalMode) {
        // Local mode: use mock data with more clients
        const localClients = await getLocalClients();
        const mockClients = generateMockClients(55); // Generate 55+ clients for testing
        setClients(mockClients);
        
        // Generate mock stats
        const stats = {};
        mockClients.forEach(client => {
          stats[client.id] = {
            journeys: client.pipelines || 0,
            touchpoints: (client.pipelines || 0) * 5,
            templates: client.workflows || 0,
            workflows: client.workflows || 0,
            healthStatus: client.status === 'error' ? 'error' : client.status === 'warning' ? 'warning' : 'healthy'
          };
        });
        setClientStats(stats);
        
        // Generate mock health data
        setHealthData(generateMockHealthData(mockClients));
      } else {
        // API mode
        const apiClient = getApiClient();
        
        // Fetch clients and health data in parallel
        const [clientsData, healthDataResponse] = await Promise.all([
          apiClient.getClients(),
          apiClient.getClientsHealth().catch(() => null)
        ]);
        
        const transformedClients = clientsData.map(client => ({
          id: client.slug,
          name: client.name,
          slug: client.slug,
          pipelines: client._count?.journeys || 0,
          workflows: client._count?.templates || 0,
          industry: client.industry || 'Unknown',
          region: client.region || 'Unknown',
          status: client.status,
          _count: client._count
        }));
        
        setClients(transformedClients);
        
        if (healthDataResponse) {
          setHealthData(healthDataResponse);
          
          // Update client stats from health data
          const stats = {};
          healthDataResponse.clients.forEach(client => {
            stats[client.slug] = {
              journeys: client.counts?.journeys || 0,
              touchpoints: (client.counts?.journeys || 0) * 5,
              templates: client.counts?.templates || 0,
              workflows: client.counts?.workflows || 0,
              healthStatus: client.healthStatus
            };
          });
          setClientStats(stats);
        }
      }
      
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      console.error('Error loading clients:', err);
      setError(err.message);
      // Fallback to mock data
      const mockClients = generateMockClients(55);
      setClients(mockClients);
      setHealthData(generateMockHealthData(mockClients));
    } finally {
      setLoading(false);
    }
  }, [usingLocalMode]);

  // Generate mock health data
  const generateMockHealthData = (clients) => {
    const healthy = clients.filter(c => c.status === 'active').length;
    const warning = clients.filter(c => c.status === 'warning').length;
    const error = clients.filter(c => c.status === 'error').length;
    const inactive = clients.filter(c => c.status === 'inactive').length;
    
    return {
      summary: {
        total: clients.length,
        healthy,
        warning,
        error,
        inactive,
        healthPercentage: Math.round((healthy / clients.length) * 100)
      },
      clients: clients.map(c => ({
        id: c.id,
        slug: c.id,
        name: c.name,
        status: c.status,
        healthStatus: c.status === 'error' ? 'error' : c.status === 'warning' ? 'warning' : c.status === 'inactive' ? 'inactive' : 'healthy',
        counts: { journeys: c.pipelines, templates: c.workflows, workflows: c.workflows },
        syncStatus: {
          lastSync: Math.random() > 0.3 ? {
            status: Math.random() > 0.9 ? 'error' : 'success',
            time: new Date(Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000)).toISOString()
          } : null
        }
      }))
    };
  };

  // Initial load
  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Auto-refresh interval
  useEffect(() => {
    if (autoRefresh && !usingLocalMode) {
      refreshIntervalRef.current = setInterval(loadClients, 30000); // Refresh every 30 seconds
      return () => clearInterval(refreshIntervalRef.current);
    }
  }, [autoRefresh, loadClients, usingLocalMode]);

  // Filter and sort clients
  const filteredClients = useMemo(() => {
    let result = [...clients];
    
    // Apply search filter
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.id.toLowerCase().includes(query) ||
        (c.industry && c.industry.toLowerCase().includes(query))
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter);
    }
    
    // Apply region filter
    if (regionFilter !== 'all') {
      result = result.filter(c => c.region === regionFilter);
    }
    
    // Apply industry filter
    if (industryFilter !== 'all') {
      result = result.filter(c => c.industry === industryFilter);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        case 'region':
          comparison = (a.region || '').localeCompare(b.region || '');
          break;
        case 'industry':
          comparison = (a.industry || '').localeCompare(b.industry || '');
          break;
        case 'journeys':
          comparison = (a.pipelines || 0) - (b.pipelines || 0);
          break;
        case 'lastActivity':
          const dateA = a.lastActivity ? new Date(a.lastActivity) : new Date(0);
          const dateB = b.lastActivity ? new Date(b.lastActivity) : new Date(0);
          comparison = dateA - dateB;
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [clients, debouncedSearch, statusFilter, regionFilter, industryFilter, sortBy, sortOrder]);

  // Paginated clients
  const paginatedClients = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredClients.slice(startIndex, startIndex + pageSize);
  }, [filteredClients, page, pageSize]);

  const totalPages = Math.ceil(filteredClients.length / pageSize);

  // Calculate aggregated stats
  const aggregatedStats = useMemo(() => {
    const stats = {
      totalClients: clients.length,
      activeClients: clients.filter(c => c.status === 'active').length,
      warningClients: clients.filter(c => c.status === 'warning').length,
      errorClients: clients.filter(c => c.status === 'error').length,
      inactiveClients: clients.filter(c => c.status === 'inactive').length,
      totalJourneys: 0,
      totalTouchpoints: 0,
      totalTemplates: 0,
      totalWorkflows: 0
    };

    clients.forEach(client => {
      const clientStat = clientStats[client.id] || {};
      stats.totalJourneys += clientStat.journeys || client.pipelines || 0;
      stats.totalTouchpoints += clientStat.touchpoints || 0;
      stats.totalTemplates += clientStat.templates || client.workflows || 0;
      stats.totalWorkflows += clientStat.workflows || client.workflows || 0;
    });

    return stats;
  }, [clients, clientStats]);

  // Get unique regions and industries for filters
  const { regions, industries } = useMemo(() => ({
    regions: [...new Set(clients.map(c => c.region).filter(Boolean))].sort(),
    industries: [...new Set(clients.map(c => c.industry).filter(Boolean))].sort()
  }), [clients]);

  // Handle client selection
  const toggleClientSelection = useCallback((clientId) => {
    setSelectedClients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  }, []);

  const selectAllClients = useCallback(() => {
    if (selectedClients.size === filteredClients.length) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(filteredClients.map(c => c.id)));
    }
  }, [filteredClients, selectedClients.size]);

  // Bulk actions
  const executeBulkAction = useCallback(async (action) => {
    if (selectedClients.size === 0) return;
    
    setBulkActionInProgress(true);
    setBulkActionResult(null);
    
    try {
      if (usingLocalMode) {
        // Simulate bulk action in local mode
        await new Promise(resolve => setTimeout(resolve, 1500));
        setBulkActionResult({
          success: true,
          action,
          totalClients: selectedClients.size,
          processed: selectedClients.size,
          failed: 0,
          completedAt: new Date().toISOString()
        });
      } else {
        const apiClient = getApiClient();
        const result = await apiClient.bulkClientAction(
          Array.from(selectedClients),
          action
        );
        setBulkActionResult(result);
      }
      
      // Refresh data after bulk action
      loadClients();
      setSelectedClients(new Set());
    } catch (err) {
      setBulkActionResult({
        success: false,
        error: err.message
      });
    } finally {
      setBulkActionInProgress(false);
    }
  }, [selectedClients, usingLocalMode, loadClients]);

  const handleClientClick = useCallback((clientId) => {
    navigate(`/?client=${clientId}`);
  }, [navigate]);

  const handleOpenFieldMapping = useCallback((client) => {
    setSelectedMappingClient(client);
    setShowFieldMappingModal(true);
  }, []);

  const handleCloseFieldMapping = useCallback(() => {
    setShowFieldMappingModal(false);
    setSelectedMappingClient(null);
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setRegionFilter('all');
    setIndustryFilter('all');
    setSortBy('name');
    setSortOrder('asc');
    setPage(1);
  }, []);

  // Render status badge
  const StatusBadge = ({ status }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.inactive;
    return (
      <span className={`mcd-status mcd-status--${config.color}`}>
        <span className="mcd-status__icon">{config.icon}</span>
        <span className="mcd-status__label">{config.label}</span>
      </span>
    );
  };

  // Render health status badge
  const HealthBadge = ({ status }) => {
    const config = HEALTH_STATUS_CONFIG[status] || HEALTH_STATUS_CONFIG.inactive;
    return (
      <span className={`mcd-health mcd-health--${config.color}`} title={config.label}>
        {config.icon}
      </span>
    );
  };

  if (loading && clients.length === 0) {
    return (
      <div className="multi-client-dashboard">
        <div className="mcd-loading">
          <div className="mcd-loading__spinner"></div>
          <p>Loading clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="multi-client-dashboard">
      {/* Header */}
      <header className="mcd-header">
        <div className="mcd-header__content">
          <div className="mcd-header__logo">
            <span className="mcd-header__logo-icon">🌸</span>
            <h1 className="mcd-header__title">Bloom Dashboard</h1>
            <span className="mcd-header__client-count">
              {aggregatedStats.totalClients} Clients
            </span>
          </div>
          <div className="mcd-header__actions">
            {usingLocalMode && (
              <span className="mcd-header__mode-badge" title="Local file mode">
                📁 Local Mode
              </span>
            )}
            <button
              className={`mcd-header__refresh-btn ${autoRefresh ? 'mcd-header__refresh-btn--active' : ''}`}
              onClick={() => setAutoRefresh(!autoRefresh)}
              title={autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
            >
              {autoRefresh ? '🔄' : '⏸️'}
            </button>
            <button
              className={`mcd-header__health-btn ${showHealthPanel ? 'mcd-header__health-btn--active' : ''}`}
              onClick={() => setShowHealthPanel(!showHealthPanel)}
            >
              💓 Health
            </button>
            <button
              className="mcd-header__refresh-btn"
              onClick={loadClients}
              disabled={loading}
            >
              {loading ? '⏳' : '🔄'} Refresh
            </button>
          </div>
        </div>
        {lastRefresh && (
          <div className="mcd-header__last-refresh">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
        )}
      </header>

      {/* Health Panel */}
      {showHealthPanel && healthData && (
        <section className="mcd-health-panel">
          <div className="mcd-health-panel__header">
            <h2>System Health Overview</h2>
            <button 
              className="mcd-health-panel__close"
              onClick={() => setShowHealthPanel(false)}
            >
              ✕
            </button>
          </div>
          <div className="mcd-health-panel__summary">
            <div className="mcd-health-card mcd-health-card--overall">
              <div className="mcd-health-card__value">
                {healthData.summary.healthPercentage}%
              </div>
              <div className="mcd-health-card__label">System Health</div>
            </div>
            <div className="mcd-health-card mcd-health-card--healthy">
              <div className="mcd-health-card__value">{healthData.summary.healthy}</div>
              <div className="mcd-health-card__label">Healthy</div>
            </div>
            <div className="mcd-health-card mcd-health-card--warning">
              <div className="mcd-health-card__value">{healthData.summary.warning}</div>
              <div className="mcd-health-card__label">Warning</div>
            </div>
            <div className="mcd-health-card mcd-health-card--error">
              <div className="mcd-health-card__value">{healthData.summary.error}</div>
              <div className="mcd-health-card__label">Error</div>
            </div>
            <div className="mcd-health-card mcd-health-card--inactive">
              <div className="mcd-health-card__value">{healthData.summary.inactive}</div>
              <div className="mcd-health-card__label">Inactive</div>
            </div>
          </div>
        </section>
      )}

      {/* Aggregated Stats */}
      <section className="mcd-stats">
        <div className="mcd-stat-card mcd-stat-card--primary">
          <div className="mcd-stat-card__icon">🏢</div>
          <div className="mcd-stat-card__content">
            <span className="mcd-stat-card__value">{aggregatedStats.totalClients}</span>
            <span className="mcd-stat-card__label">Total Clients</span>
          </div>
        </div>
        
        <div className="mcd-stat-card">
          <div className="mcd-stat-card__icon">✅</div>
          <div className="mcd-stat-card__content">
            <span className="mcd-stat-card__value">{aggregatedStats.activeClients}</span>
            <span className="mcd-stat-card__label">Active</span>
          </div>
        </div>
        
        {aggregatedStats.warningClients > 0 && (
          <div className="mcd-stat-card mcd-stat-card--warning">
            <div className="mcd-stat-card__icon">⚠️</div>
            <div className="mcd-stat-card__content">
              <span className="mcd-stat-card__value">{aggregatedStats.warningClients}</span>
              <span className="mcd-stat-card__label">Warning</span>
            </div>
          </div>
        )}
        
        {aggregatedStats.errorClients > 0 && (
          <div className="mcd-stat-card mcd-stat-card--error">
            <div className="mcd-stat-card__icon">❌</div>
            <div className="mcd-stat-card__content">
              <span className="mcd-stat-card__value">{aggregatedStats.errorClients}</span>
              <span className="mcd-stat-card__label">Error</span>
            </div>
          </div>
        )}
        
        <div className="mcd-stat-card">
          <div className="mcd-stat-card__icon">🛤️</div>
          <div className="mcd-stat-card__content">
            <span className="mcd-stat-card__value">{aggregatedStats.totalJourneys}</span>
            <span className="mcd-stat-card__label">Journeys</span>
          </div>
        </div>
        
        <div className="mcd-stat-card">
          <div className="mcd-stat-card__icon">📬</div>
          <div className="mcd-stat-card__content">
            <span className="mcd-stat-card__value">{aggregatedStats.totalTouchpoints}</span>
            <span className="mcd-stat-card__label">Touchpoints</span>
          </div>
        </div>
        
        <div className="mcd-stat-card">
          <div className="mcd-stat-card__icon">📄</div>
          <div className="mcd-stat-card__content">
            <span className="mcd-stat-card__value">{aggregatedStats.totalTemplates}</span>
            <span className="mcd-stat-card__label">Templates</span>
          </div>
        </div>
      </section>

      {/* Error Message */}
      {error && (
        <div className="mcd-error">
          <p>⚠️ {error}</p>
          <button onClick={loadClients}>Retry</button>
        </div>
      )}

      {/* Filters and Search */}
      <section className="mcd-filters">
        <div className="mcd-filters__row">
          <div className="mcd-filters__search">
            <span className="mcd-filters__search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search clients by name, ID, or industry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mcd-filters__search-input"
            />
            {searchQuery && (
              <button 
                className="mcd-filters__clear-btn"
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>
          
          <div className="mcd-filters__group">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mcd-filters__select"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="onboarding">Onboarding</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
            
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="mcd-filters__select"
            >
              <option value="all">All Regions</option>
              {regions.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
            
            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="mcd-filters__select"
            >
              <option value="all">All Industries</option>
              {industries.map(industry => (
                <option key={industry} value={industry}>{industry}</option>
              ))}
            </select>
            
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
              className="mcd-filters__select"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="status-asc">Status</option>
              <option value="region-asc">Region</option>
              <option value="industry-asc">Industry</option>
              <option value="journeys-desc">Journeys (High-Low)</option>
              <option value="lastActivity-desc">Last Activity</option>
            </select>
          </div>
        </div>
        
        {(searchQuery || statusFilter !== 'all' || regionFilter !== 'all' || industryFilter !== 'all') && (
          <div className="mcd-filters__active">
            <span>Active filters:</span>
            {searchQuery && (
              <span className="mcd-filters__tag">
                Search: {searchQuery}
                <button onClick={() => setSearchQuery('')}>✕</button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="mcd-filters__tag">
                Status: {statusFilter}
                <button onClick={() => setStatusFilter('all')}>✕</button>
              </span>
            )}
            {regionFilter !== 'all' && (
              <span className="mcd-filters__tag">
                Region: {regionFilter}
                <button onClick={() => setRegionFilter('all')}>✕</button>
              </span>
            )}
            {industryFilter !== 'all' && (
              <span className="mcd-filters__tag">
                Industry: {industryFilter}
                <button onClick={() => setIndustryFilter('all')}>✕</button>
              </span>
            )}
            <button className="mcd-filters__clear-all" onClick={clearFilters}>
              Clear all
            </button>
          </div>
        )}
        
        <div className="mcd-filters__results">
          Showing {filteredClients.length} of {clients.length} clients
          {filteredClients.length !== clients.length && (
            <span className="mcd-filters__filtered-indicator">
              (filtered)
            </span>
          )}
        </div>
      </section>

      {/* Bulk Actions Bar */}
      {selectedClients.size > 0 && (
        <section className="mcd-bulk-actions">
          <div className="mcd-bulk-actions__info">
            <input
              type="checkbox"
              checked={selectedClients.size === filteredClients.length}
              onChange={selectAllClients}
              className="mcd-bulk-actions__checkbox"
            />
            <span className="mcd-bulk-actions__count">
              {selectedClients.size} selected
            </span>
          </div>
          <div className="mcd-bulk-actions__buttons">
            <button
              className="mcd-bulk-actions__btn mcd-bulk-actions__btn--publish"
              onClick={() => executeBulkAction('publish_journeys')}
              disabled={bulkActionInProgress}
            >
              {bulkActionInProgress ? '⏳' : '🚀'} Publish Journeys
            </button>
            <button
              className="mcd-bulk-actions__btn mcd-bulk-actions__btn--pause"
              onClick={() => executeBulkAction('pause_journeys')}
              disabled={bulkActionInProgress}
            >
              {bulkActionInProgress ? '⏳' : '⏸️'} Pause Journeys
            </button>
            <button
              className="mcd-bulk-actions__btn mcd-bulk-actions__btn--activate"
              onClick={() => executeBulkAction('activate')}
              disabled={bulkActionInProgress}
            >
              {bulkActionInProgress ? '⏳' : '✅'} Activate
            </button>
            <button
              className="mcd-bulk-actions__btn mcd-bulk-actions__btn--deactivate"
              onClick={() => executeBulkAction('deactivate')}
              disabled={bulkActionInProgress}
            >
              {bulkActionInProgress ? '⏳' : '⏸️'} Deactivate
            </button>
            <button
              className="mcd-bulk-actions__btn mcd-bulk-actions__btn--clear"
              onClick={() => setSelectedClients(new Set())}
              disabled={bulkActionInProgress}
            >
              Clear
            </button>
          </div>
        </section>
      )}

      {/* Bulk Action Result */}
      {bulkActionResult && (
        <section className={`mcd-bulk-result ${bulkActionResult.success ? 'mcd-bulk-result--success' : 'mcd-bulk-result--error'}`}>
          <button 
            className="mcd-bulk-result__close"
            onClick={() => setBulkActionResult(null)}
          >
            ✕
          </button>
          {bulkActionResult.success ? (
            <>
              <span className="mcd-bulk-result__icon">✅</span>
              <span className="mcd-bulk-result__message">
                Successfully processed {bulkActionResult.processed} clients
                {bulkActionResult.failed > 0 && ` (${bulkActionResult.failed} failed)`}
              </span>
            </>
          ) : (
            <>
              <span className="mcd-bulk-result__icon">❌</span>
              <span className="mcd-bulk-result__message">
                Bulk action failed: {bulkActionResult.error}
              </span>
            </>
          )}
        </section>
      )}

      {/* Client List */}
      <section className="mcd-clients">
        <div className="mcd-clients__header">
          <h2 className="mcd-clients__title">
            <input
              type="checkbox"
              checked={selectedClients.size === filteredClients.length && filteredClients.length > 0}
              onChange={selectAllClients}
              className="mcd-clients__select-all"
            />
            Clients
          </h2>
          <div className="mcd-clients__view-toggle">
            <button
              className={`mcd-clients__view-btn ${viewMode === 'grid' ? 'mcd-clients__view-btn--active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              ⊞ Grid
            </button>
            <button
              className={`mcd-clients__view-btn ${viewMode === 'list' ? 'mcd-clients__view-btn--active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              ☰ List
            </button>
          </div>
        </div>
        
        {filteredClients.length === 0 ? (
          <div className="mcd-clients__empty">
            <div className="mcd-clients__empty-icon">🔍</div>
            <p>No clients found matching your filters.</p>
            <button onClick={clearFilters} className="mcd-clients__empty-action">
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <div className={`mcd-clients__${viewMode}`}>
              {paginatedClients.map((client) => {
                const stats = clientStats[client.id] || {};
                const journeys = stats.journeys || client.pipelines || 0;
                const templates = stats.templates || client.workflows || 0;
                const isSelected = selectedClients.has(client.id);
                const healthStatus = stats.healthStatus || 'healthy';
                
                return (
                  <div
                    key={client.id}
                    className={`mcd-client-card ${isSelected ? 'mcd-client-card--selected' : ''}`}
                    onClick={(e) => {
                      if (e.target.type !== 'checkbox') {
                        handleClientClick(client.id);
                      }
                    }}
                  >
                    <div className="mcd-client-card__select">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleClientSelection(client.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    
                    <div className="mcd-client-card__header">
                      <h3 className="mcd-client-card__name">{client.name}</h3>
                      <div className="mcd-client-card__badges">
                        <HealthBadge status={healthStatus} />
                        <StatusBadge status={client.status} />
                      </div>
                    </div>
                    
                    <div className="mcd-client-card__meta">
                      {client.industry && (
                        <span className="mcd-client-card__industry">{client.industry}</span>
                      )}
                      {client.region && (
                        <span className="mcd-client-card__region">📍 {client.region}</span>
                      )}
                    </div>
                    
                    <div className="mcd-client-card__stats">
                      <div className="mcd-client-card__stat">
                        <span className="mcd-client-card__stat-value">{journeys}</span>
                        <span className="mcd-client-card__stat-label">Journeys</span>
                      </div>
                      <div className="mcd-client-card__stat">
                        <span className="mcd-client-card__stat-value">{templates}</span>
                        <span className="mcd-client-card__stat-label">Templates</span>
                      </div>
                      <div className="mcd-client-card__stat">
                        <span className="mcd-client-card__stat-value">{stats.touchpoints || 0}</span>
                        <span className="mcd-client-card__stat-label">Touchpoints</span>
                      </div>
                    </div>
                    
                    <div className="mcd-client-card__actions">
                      <button
                        className="mcd-client-card__action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenFieldMapping(client);
                        }}
                        title="Configure Field Mappings"
                      >
                        🔄 Field Mappings
                      </button>
                      <span className="mcd-client-card__view-link">
                        View Journeys →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mcd-pagination">
                <button
                  className="mcd-pagination__btn"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ← Previous
                </button>
                <span className="mcd-pagination__info">
                  Page {page} of {totalPages}
                </span>
                <button
                  className="mcd-pagination__btn"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next →
                </button>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="mcd-pagination__size"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
              </div>
            )}
          </>
        )}
      </section>

      {/* Quick Actions */}
      <section className="mcd-actions">
        <h2 className="mcd-actions__title">Quick Actions</h2>
        <div className="mcd-actions__buttons">
          <Link to="/analytics" className="mcd-actions__btn">
            📊 Analytics Dashboard
          </Link>
          <Link to="/touchpoints" className="mcd-actions__btn">
            📬 View All Touchpoints
          </Link>
          <Link to="/email-editor" className="mcd-actions__btn">
            ✉️ Email Editor
          </Link>
          <Link to="/templates" className="mcd-actions__btn">
            📄 Template Library
          </Link>
        </div>
      </section>

      {/* Field Mapping Modal */}
      {showFieldMappingModal && selectedMappingClient && (
        <div className="mcd-modal-overlay" onClick={handleCloseFieldMapping}>
          <div className="mcd-modal-content" onClick={(e) => e.stopPropagation()}>
            <FieldMappingManager
              clientId={selectedMappingClient.id}
              clientName={selectedMappingClient.name}
              onClose={handleCloseFieldMapping}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default MultiClientDashboard;
