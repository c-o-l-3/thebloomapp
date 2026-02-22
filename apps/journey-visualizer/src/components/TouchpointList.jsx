/**
 * TouchpointList Component
 * Table view of all touchpoints with filtering, search, and login gate
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Printer, 
  Edit3, 
  Eye, 
  Mail, 
  MessageSquare, 
  Phone,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  LogOut,
  User,
  UploadCloud,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { getApiClient } from '../services/apiClient';
import { StatusBadge } from './StatusBadge';
import './TouchpointList.css';

const apiClient = getApiClient();

const TOUCHPOINT_TYPES = [
  { value: 'all', label: 'All Types', icon: null },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'sms', label: 'SMS', icon: MessageSquare },
  { value: 'call', label: 'Call', icon: Phone },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
];

/**
 * TouchpointList - Main touchpoint management interface
 */
export function TouchpointList() {
  const navigate = useNavigate();
  const [touchpoints, setTouchpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  
  // Publish state
  const [publishingIds, setPublishingIds] = useState(new Set());
  const [notification, setNotification] = useState(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Sort state
  const [sortField, setSortField] = useState('updatedAt');
  const [sortDirection, setSortDirection] = useState('desc');

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user');
    
    if (token) {
      setIsAuthenticated(true);
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } else {
      // Redirect to login
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  // Fetch touchpoints
  const fetchTouchpoints = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const options = {};
      if (typeFilter !== 'all') options.type = typeFilter;
      if (statusFilter !== 'all') options.status = statusFilter;
      
      const data = await apiClient.getTouchpoints(options);
      setTouchpoints(data);
    } catch (err) {
      console.error('Failed to fetch touchpoints:', err);
      setError('Failed to load touchpoints. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, typeFilter, statusFilter]);

  useEffect(() => {
    fetchTouchpoints();
  }, [fetchTouchpoints]);

  // Handle logout
  const handleLogout = useCallback(() => {
    apiClient.logout();
    setIsAuthenticated(false);
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  // Handle sort
  const handleSort = useCallback((field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  // Filtered and sorted touchpoints
  const filteredTouchpoints = useMemo(() => {
    let result = [...touchpoints];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(tp => 
        tp.name.toLowerCase().includes(query) ||
        tp.journey?.name?.toLowerCase().includes(query)
      );
    }
    
    // Sort
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (sortField === 'updatedAt' || sortField === 'createdAt') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [touchpoints, searchQuery, sortField, sortDirection]);

  // Get type icon
  const getTypeIcon = (type) => {
    const typeConfig = TOUCHPOINT_TYPES.find(t => t.value === type);
    if (typeConfig?.icon) {
      const Icon = typeConfig.icon;
      return <Icon size={16} />;
    }
    return <span className="touchpoint-list__type-badge">{type}</span>;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle actions
  const handlePrint = (id) => {
    navigate(`/touchpoints/${id}/print`);
  };

  const handleEdit = (id) => {
    navigate(`/touchpoints/${id}/edit`);
  };

  const handleView = (id) => {
    navigate(`/touchpoints/${id}`);
  };

  const handlePublish = async (touchpoint) => {
    // Only allow publishing email and SMS touchpoints
    const publishableTypes = ['email', 'sms'];
    if (!publishableTypes.includes(touchpoint.type?.toLowerCase())) {
      showNotification('error', `Cannot publish ${touchpoint.type} touchpoints to GHL`);
      return;
    }

    setPublishingIds(prev => new Set(prev).add(touchpoint.id));
    
    try {
      const result = await apiClient.publishTouchpoint(touchpoint.id);
      
      // Update touchpoint in list with new status
      setTouchpoints(prev => prev.map(tp => 
        tp.id === touchpoint.id 
          ? { ...tp, status: 'published', ghlTemplateId: result.publishResult?.ghlTemplateId }
          : tp
      ));
      
      showNotification('success', `Published "${touchpoint.name}" to GHL successfully`);
    } catch (err) {
      console.error('Failed to publish touchpoint:', err);
      const errorMessage = err.response?.data?.details || err.response?.data?.error || 'Failed to publish to GHL';
      showNotification('error', errorMessage);
    } finally {
      setPublishingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(touchpoint.id);
        return newSet;
      });
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    // Auto-dismiss after 5 seconds
    setTimeout(() => setNotification(null), 5000);
  };

  const dismissNotification = () => {
    setNotification(null);
  };

  // Check if touchpoint can be published
  const canPublish = (touchpoint) => {
    const publishableTypes = ['email', 'sms'];
    return publishableTypes.includes(touchpoint.type?.toLowerCase());
  };

  // Get publish status display
  const getPublishStatus = (touchpoint) => {
    if (touchpoint.status === 'published' || touchpoint.ghlTemplateId) {
      return { label: 'Published', className: 'status-published' };
    }
    return { label: 'Draft', className: 'status-draft' };
  };

  if (!isAuthenticated) {
    return (
      <div className="touchpoint-list__loading">
        <div className="touchpoint-list__spinner" />
        <p>Checking authentication...</p>
      </div>
    );
  }

  return (
    <div className="touchpoint-list">
      {/* Header */}
      <header className="touchpoint-list__header">
        <div className="touchpoint-list__header-left">
          <h1 className="touchpoint-list__title">
            <Mail size={24} />
            Touchpoint Management
          </h1>
          <p className="touchpoint-list__subtitle">
            Manage and organize your journey touchpoints
          </p>
        </div>
        
        <div className="touchpoint-list__header-right">
          {user && (
            <div className="touchpoint-list__user">
              <User size={18} />
              <span>{user.name || user.email}</span>
            </div>
          )}
          <button 
            className="touchpoint-list__logout-btn"
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="touchpoint-list__toolbar">
        <div className="touchpoint-list__search">
          <Search size={18} className="touchpoint-list__search-icon" />
          <input
            type="text"
            className="touchpoint-list__search-input"
            placeholder="Search touchpoints by name or journey..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="touchpoint-list__search-clear"
              onClick={() => setSearchQuery('')}
            >
              ×
            </button>
          )}
        </div>

        <div className="touchpoint-list__filters">
          <button 
            className={`touchpoint-list__filter-toggle ${showFilters ? 'touchpoint-list__filter-toggle--active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
            Filters
            {(typeFilter !== 'all' || statusFilter !== 'all') && (
              <span className="touchpoint-list__filter-badge">
                {(typeFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="touchpoint-list__filter-panel">
          <div className="touchpoint-list__filter-group">
            <label className="touchpoint-list__filter-label">Type</label>
            <select 
              className="touchpoint-list__filter-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              {TOUCHPOINT_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="touchpoint-list__filter-group">
            <label className="touchpoint-list__filter-label">Status</label>
            <select 
              className="touchpoint-list__filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <button 
            className="touchpoint-list__filter-clear"
            onClick={() => {
              setTypeFilter('all');
              setStatusFilter('all');
            }}
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Results Count */}
      <div className="touchpoint-list__results">
        <span className="touchpoint-list__count">
          {filteredTouchpoints.length} touchpoint{filteredTouchpoints.length !== 1 ? 's' : ''}
        </span>
        {(typeFilter !== 'all' || statusFilter !== 'all' || searchQuery) && (
          <span className="touchpoint-list__filter-info">
            (filtered)
          </span>
        )}
      </div>

      {/* Table */}
      <div className="touchpoint-list__table-container">
        {loading ? (
          <div className="touchpoint-list__loading">
            <div className="touchpoint-list__spinner" />
            <p>Loading touchpoints...</p>
          </div>
        ) : error ? (
          <div className="touchpoint-list__error">
            <p>{error}</p>
            <button onClick={fetchTouchpoints} className="touchpoint-list__retry-btn">
              Retry
            </button>
          </div>
        ) : filteredTouchpoints.length === 0 ? (
          <div className="touchpoint-list__empty">
            <Mail size={48} className="touchpoint-list__empty-icon" />
            <h3>No touchpoints found</h3>
            <p>
              {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters or search query'
                : 'Get started by creating your first touchpoint'}
            </p>
          </div>
        ) : (
          <table className="touchpoint-list__table">
            <thead className="touchpoint-list__thead">
              <tr>
                <th 
                  className="touchpoint-list__th touchpoint-list__th--sortable"
                  onClick={() => handleSort('name')}
                >
                  Name
                  {sortField === 'name' && (
                    sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </th>
                <th className="touchpoint-list__th">Type</th>
                <th className="touchpoint-list__th">Journey</th>
                <th className="touchpoint-list__th">Status</th>
                <th 
                  className="touchpoint-list__th touchpoint-list__th--sortable"
                  onClick={() => handleSort('updatedAt')}
                >
                  Last Modified
                  {sortField === 'updatedAt' && (
                    sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </th>
                <th className="touchpoint-list__th touchpoint-list__th--actions">Actions</th>
              </tr>
            </thead>
            <tbody className="touchpoint-list__tbody">
              {filteredTouchpoints.map((touchpoint) => (
                <tr key={touchpoint.id} className="touchpoint-list__row">
                  <td className="touchpoint-list__td touchpoint-list__td--name">
                    <div className="touchpoint-list__name-cell">
                      <span className="touchpoint-list__name">{touchpoint.name}</span>
                      {touchpoint.content?.subject && (
                        <span className="touchpoint-list__subject">
                          {touchpoint.content.subject}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="touchpoint-list__td">
                    <div className="touchpoint-list__type-cell">
                      {getTypeIcon(touchpoint.type)}
                      <span className="touchpoint-list__type-label">
                        {touchpoint.type}
                      </span>
                    </div>
                  </td>
                  <td className="touchpoint-list__td">
                    <span className="touchpoint-list__journey">
                      {touchpoint.journey?.name || '-'}
                    </span>
                  </td>
                  <td className="touchpoint-list__td">
                    <StatusBadge status={touchpoint.status} size="small" />
                  </td>
                  <td className="touchpoint-list__td touchpoint-list__td--date">
                    {formatDate(touchpoint.updatedAt)}
                  </td>
                  <td className="touchpoint-list__td touchpoint-list__td--actions">
                    <div className="touchpoint-list__actions">
                      <button 
                        className="touchpoint-list__action-btn"
                        onClick={() => handleView(touchpoint.id)}
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        className="touchpoint-list__action-btn"
                        onClick={() => handleEdit(touchpoint.id)}
                        title="Edit HTML"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        className="touchpoint-list__action-btn"
                        onClick={() => handlePrint(touchpoint.id)}
                        title="Print View"
                      >
                        <Printer size={16} />
                      </button>
                      {canPublish(touchpoint) && (
                        <button 
                          className={`touchpoint-list__action-btn touchpoint-list__action-btn--publish ${
                            touchpoint.status === 'published' || touchpoint.ghlTemplateId 
                              ? 'touchpoint-list__action-btn--published' 
                              : ''
                          }`}
                          onClick={() => handlePublish(touchpoint)}
                          disabled={publishingIds.has(touchpoint.id)}
                          title={
                            touchpoint.status === 'published' || touchpoint.ghlTemplateId
                              ? 'Republish to GHL'
                              : 'Publish to GHL'
                          }
                        >
                          {publishingIds.has(touchpoint.id) ? (
                            <Loader2 size={16} className="spin" />
                          ) : (
                            <UploadCloud size={16} />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`touchpoint-list__notification touchpoint-list__notification--${notification.type}`}>
          <div className="touchpoint-list__notification-content">
            {notification.type === 'success' ? (
              <CheckCircle size={20} className="touchpoint-list__notification-icon" />
            ) : (
              <XCircle size={20} className="touchpoint-list__notification-icon" />
            )}
            <span className="touchpoint-list__notification-message">{notification.message}</span>
          </div>
          <button 
            className="touchpoint-list__notification-close"
            onClick={dismissNotification}
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default TouchpointList;