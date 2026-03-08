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
  Layout,
  Mail,
  MessageSquare,
  Phone,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  CheckCircle,
  XCircle,
  Loader2,
  BookOpen,
  GitBranch
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
 * @param {string} selectedClientId - The currently selected client ID
 * @param {string} selectedJourneyId - The ID of the selected journey for the client
 * @param {Array} journeys - All available journeys for the client
 * @param {Function} onJourneyChange - Callback when user selects a different journey
 */
export function TouchpointList({ selectedClientId, selectedJourneyId, journeys = [], onJourneyChange }) {
  const navigate = useNavigate();
  const [touchpoints, setTouchpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Fetch touchpoints
  const fetchTouchpoints = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await apiClient.getTouchpoints(selectedJourneyId || undefined);
      setTouchpoints(data);
    } catch (err) {
      console.error('Failed to fetch touchpoints:', err);
      setError('Failed to load touchpoints. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedJourneyId]);

  useEffect(() => {
    fetchTouchpoints();
  }, [fetchTouchpoints]);

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

    // Type filter
    if (typeFilter && typeFilter !== 'all') {
      result = result.filter(tp => tp.type === typeFilter);
    }

    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      result = result.filter(tp => tp.status === statusFilter);
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
  }, [touchpoints, searchQuery, typeFilter, statusFilter, sortField, sortDirection]);

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

  const handlePublish = async (touchpoint) => {
    const publishableTypes = ['email', 'sms'];
    if (!publishableTypes.includes(touchpoint.type?.toLowerCase())) {
      showNotification('error', `Cannot publish ${touchpoint.type} touchpoints to GHL`);
      return;
    }

    setPublishingIds(prev => new Set(prev).add(touchpoint.id));
    
    try {
      const result = await apiClient.publishTouchpoint(touchpoint.id);
      
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
    setTimeout(() => setNotification(null), 5000);
  };

  const dismissNotification = () => {
    setNotification(null);
  };

  // Copy client review link to clipboard
  const handleShareReviewLink = () => {
    if (!selectedJourneyId) return;
    const url = `${window.location.origin}/journeys/${selectedJourneyId}/client-review`;
    navigator.clipboard.writeText(url).then(() => {
      showNotification('success', `Review link copied: ${url}`);
    }).catch(() => {
      prompt('Copy this review link:', url);
    });
  };

  // Check if touchpoint can be published
  const canPublish = (touchpoint) => {
    const publishableTypes = ['email', 'sms'];
    return publishableTypes.includes(touchpoint.type?.toLowerCase());
  };

  // Selected journey object for display
  const selectedJourney = journeys.find(j => j.id === selectedJourneyId);

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
          {selectedJourneyId && (
            <button
              className="touchpoint-list__share-btn"
              onClick={handleShareReviewLink}
              title="Copy shareable client review link"
            >
              Share Review Link
            </button>
          )}
        </div>
      </header>

      {/* Journey Selector */}
      <div className="touchpoint-list__journey-selector-bar">
        <div className="touchpoint-list__journey-selector-inner">
          <GitBranch size={18} className="touchpoint-list__journey-selector-icon" />
          <label className="touchpoint-list__journey-selector-label" htmlFor="journey-select">
            Journey:
          </label>
          {journeys.length === 0 ? (
            <span className="touchpoint-list__journey-selector-empty">No journeys available</span>
          ) : (
            <select
              id="journey-select"
              className="touchpoint-list__journey-select"
              value={selectedJourneyId || ''}
              onChange={(e) => onJourneyChange && onJourneyChange(e.target.value)}
            >
              {journeys.map(j => (
                <option key={j.id} value={j.id}>
                  {j.name}
                  {j.touchpoints?.length != null ? ` (${j.touchpoints.length} touchpoints)` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
        {selectedJourneyId && (
          <button
            className="touchpoint-list__review-btn"
            onClick={() => navigate(`/journeys/${selectedJourneyId}/review`)}
            title="Review and edit all touchpoints sequentially"
          >
            <BookOpen size={16} />
            Review All
          </button>
        )}
      </div>

      {/* Guide Banner — only shown when no journeys exist */}
      {!loading && journeys.length === 0 && (
        <div className="touchpoint-list__guide-banner touchpoint-list__guide-banner--warn">
          <Mail size={16} />
          <span>No journeys found for this client. Create journeys first from the Journeys tab.</span>
        </div>
      )}

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
              {filteredTouchpoints.map((touchpoint) => {
                const isEmail = touchpoint.type === 'email';
                return (
                <tr
                  key={touchpoint.id}
                  className={`touchpoint-list__row${isEmail ? ' touchpoint-list__row--email' : ''}`}
                  onClick={isEmail ? () => navigate(`/touchpoints/${touchpoint.id}/visual-edit`) : undefined}
                  style={isEmail ? { cursor: 'pointer' } : undefined}
                >
                  <td className="touchpoint-list__td touchpoint-list__td--name">
                    <div className="touchpoint-list__name-cell">
                      <span className="touchpoint-list__name">{touchpoint.name}</span>
                      {isEmail && touchpoint.content?.subject && (
                        <span className="touchpoint-list__subject-preview">
                          {touchpoint.content.subject}
                        </span>
                      )}
                      {!isEmail && touchpoint.content?.subject && (
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
                    <div className="touchpoint-list__actions" onClick={(e) => e.stopPropagation()}>
                      {isEmail ? (
                        <>
                          <button
                            className="touchpoint-list__edit-email-btn"
                            onClick={(e) => { e.stopPropagation(); navigate(`/touchpoints/${touchpoint.id}/visual-edit`); }}
                            title="Open Visual Email Editor"
                          >
                            <Layout size={15} />
                            Edit Email
                          </button>
                          <button
                            className="touchpoint-list__action-btn touchpoint-list__action-btn--labeled"
                            onClick={() => handlePrint(touchpoint.id)}
                            title="Print View"
                          >
                            <Printer size={15} />
                            Print
                          </button>
                          <button 
                            className={`touchpoint-list__action-btn touchpoint-list__action-btn--labeled touchpoint-list__action-btn--publish ${
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
                              <Loader2 size={15} className="spin" />
                            ) : (
                              <UploadCloud size={15} />
                            )}
                            Publish
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="touchpoint-list__action-btn touchpoint-list__action-btn--labeled"
                            onClick={() => handleEdit(touchpoint.id)}
                            title="Edit"
                          >
                            <Edit3 size={15} />
                            Edit
                          </button>
                          <button
                            className="touchpoint-list__action-btn touchpoint-list__action-btn--labeled"
                            onClick={() => handlePrint(touchpoint.id)}
                            title="Print View"
                          >
                            <Printer size={15} />
                            Print
                          </button>
                          {canPublish(touchpoint) && (
                            <button 
                              className={`touchpoint-list__action-btn touchpoint-list__action-btn--labeled touchpoint-list__action-btn--publish ${
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
                                <Loader2 size={15} className="spin" />
                              ) : (
                                <UploadCloud size={15} />
                              )}
                              Publish
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
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
